/**
 * The core chat hook used by all three conversation screens.
 *
 * "Agentic" means the AI isn't limited to one response — it can trigger
 * web searches mid-reply by emitting <search>...</search> tags. When that
 * happens the hook:
 *   1. Calls the Brave Search API with the model's query
 *   2. Injects the results as a 'search_results' message
 *   3. Calls the LLM again with the results in context
 *   4. Repeats up to MAX_ITERATIONS times
 *
 * The distiller mode also writes back to the worldview document via
 * <theme> JSON blocks. The hook parses these and fires the onThemeDetected
 * callback, which the calling screen uses to persist the theme.
 *
 * Streaming: as the LLM produces tokens, they accumulate in streamBuffer.
 * The buffer is appended to displayMessages as a synthetic streaming message
 * so the user sees text appear word-by-word. When generation finishes, the
 * buffer is cleared and the final message replaces it.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLlama } from './LlamaContext';
import { braveSearch, formatResultsForPrompt } from '../search/brave';
import { Settings } from '../storage/settings';
import type { Message, WorldviewTheme, SearchResult, AIMode } from '../types';

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type SystemPromptFn = (themes: WorldviewTheme[], hasSearch: boolean) => string;

interface UseAgenticChatOptions {
  mode: AIMode;
  themes: WorldviewTheme[];
  systemPromptFn: SystemPromptFn;
  onThemeDetected?: (theme: string, content: string) => void;
  onPositionDetected?: (topic: string, statement: string) => void;
  onSaveToKnowledge?: (content: string) => void;
  autoStart?: boolean; // fires one AI-initiated opening message on mount
}

export function useAgenticChat({
  themes,
  systemPromptFn,
  onThemeDetected,
  onPositionDetected,
  autoStart,
}: UseAgenticChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { complete, isGenerating, modelLoaded } = useLlama();
  const abortRef = useRef(false);
  const hasAutoStarted = useRef(false);

  // Parses <theme> and <position> tags from a completed response and fires callbacks.
  const handleStructuredTags = useCallback((response: string) => {
    const themeMatch = response.match(/<theme>([\s\S]*?)<\/theme>/);
    if (themeMatch && onThemeDetected) {
      try {
        const parsed = JSON.parse(themeMatch[1].trim());
        if (parsed.action === 'upsert' && parsed.theme && parsed.content) {
          onThemeDetected(parsed.theme, parsed.content);
        }
      } catch {}
    }
    const positionMatch = response.match(/<position>([\s\S]*?)<\/position>/);
    if (positionMatch && onPositionDetected) {
      try {
        const parsed = JSON.parse(positionMatch[1].trim());
        if (parsed.topic && parsed.statement) {
          onPositionDetected(parsed.topic, parsed.statement);
        }
      } catch {}
    }
  }, [onThemeDetected, onPositionDetected]);

  // Fires an AI-initiated opening message on mount, without any user input.
  // Used by the Positions tab so the AI can propose a starting position.
  useEffect(() => {
    if (!autoStart || hasAutoStarted.current || !modelLoaded) return;
    hasAutoStarted.current = true;
    (async () => {
      const braveKey = await Settings.getBraveApiKey();
      const systemPrompt = systemPromptFn(themes, !!braveKey);
      let accumulated = '';
      setStreamBuffer('');
      let response = '';
      try {
        response = await complete(systemPrompt, [], token => {
          accumulated += token;
          setStreamBuffer(
            accumulated
              .replace(/<search>[\s\S]*?<\/search>/g, '')
              .replace(/<search>[\s\S]*$/, ''),
          );
        });
      } catch { return; }
      setStreamBuffer('');
      const clean = response
        .replace(/<search>[\s\S]*?<\/search>/g, '')
        .replace(/<theme>[\s\S]*?<\/theme>/g, '')
        .replace(/<position>[\s\S]*?<\/position>/g, '')
        .trim();
      if (clean) {
        setMessages([{ id: uuid(), role: 'assistant', content: clean, timestamp: Date.now() }]);
      }
      handleStructuredTags(response);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, modelLoaded]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isGenerating) return;
      abortRef.current = false;

      const userMsg: Message = {
        id: uuid(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);

      // Check for a Brave API key — its presence enables the search tool in the prompt
      const braveKey = await Settings.getBraveApiKey();
      const hasSearch = !!braveKey;

      const systemPrompt = systemPromptFn(themes, hasSearch);

      // Convert our Message[] into the role/content format the LLM expects.
      // search_results messages are surfaced as 'user' role with a formatted prefix
      // so the model treats them as context it was given (not as something it said).
      const chatHistory = nextMessages.map(m => ({
        role: m.role === 'search_results' ? 'user' : m.role as string,
        content: m.role === 'search_results'
          ? `[Search results for "${m.searchQuery}"]\n${m.content}`
          : m.content,
      }));

      let currentHistory = chatHistory;
      let finalResponse = '';
      let iterations = 0;
      const MAX_ITERATIONS = 3;  // prevents infinite search loops

      // ── Agentic loop ──────────────────────────────────────────────────────
      while (iterations < MAX_ITERATIONS && !abortRef.current) {
        iterations++;
        let accumulated = '';
        setStreamBuffer('');

        try {
          finalResponse = await complete(systemPrompt, currentHistory, token => {
            accumulated += token;
            // While streaming, hide any in-progress <search> tag from the display
            // (it would look jarring to show the raw tag appearing character by character)
            const displayText = accumulated
              .replace(/<search>[\s\S]*?<\/search>/g, '')
              .replace(/<position>[\s\S]*?<\/position>/g, '')
              .replace(/<search>[\s\S]*$/, '')
              .replace(/<position>[\s\S]*$/, '');
            setStreamBuffer(displayText);
          });
        } catch {
          break;
        }

        setStreamBuffer('');  // clear the live streaming preview

        // ── Check for a search request ─────────────────────────────────────
        const searchMatch = finalResponse.match(/<search>([\s\S]*?)<\/search>/);
        if (searchMatch && braveKey && !abortRef.current) {
          const query = searchMatch[1].trim();

          // Any text the model wrote BEFORE the search tag should be shown to
          // the user immediately — it's legitimate content, just not the final answer yet
          const textBeforeSearch = finalResponse
            .substring(0, finalResponse.indexOf('<search>'))
            .trim();

          setIsSearching(true);
          let results: SearchResult[] = [];
          try {
            results = await braveSearch(query, braveKey);
          } catch {
            results = [];  // search failure is non-fatal — LLM continues without results
          } finally {
            setIsSearching(false);
          }

          if (abortRef.current) break;

          // Build the search_results message that will appear in the chat UI
          const searchMsg: Message = {
            id: uuid(),
            role: 'search_results',
            content: formatResultsForPrompt(results, query),
            timestamp: Date.now(),
            searchResults: results,
            searchQuery: query,
          };

          if (textBeforeSearch) {
            // Show the pre-search text as a partial assistant message, then the results
            const partialMsg: Message = {
              id: uuid(),
              role: 'assistant',
              content: textBeforeSearch,
              timestamp: Date.now(),
            };
            setMessages(prev => [...prev, partialMsg, searchMsg]);
            currentHistory = [
              ...currentHistory,
              { role: 'assistant', content: textBeforeSearch },
              { role: 'user', content: `[Search results for "${query}"]\n${formatResultsForPrompt(results, query)}` },
            ];
          } else {
            // The model went straight to searching — just show the results card
            setMessages(prev => [...prev, searchMsg]);
            currentHistory = [
              ...currentHistory,
              { role: 'user', content: `[Search results for "${query}"]\n${formatResultsForPrompt(results, query)}` },
            ];
          }
          continue;  // loop back and call the LLM again with the search results in context
        }

        // No search tag — this is the final answer, exit the loop
        break;
      }

      // ── Commit the final response to state ────────────────────────────────
      if (!abortRef.current && finalResponse) {
        const cleanResponse = finalResponse
          .replace(/<search>[\s\S]*?<\/search>/g, '')
          .replace(/<theme>[\s\S]*?<\/theme>/g, '')
          .replace(/<position>[\s\S]*?<\/position>/g, '')
          .trim();

        if (cleanResponse) {
          const assistantMsg: Message = {
            id: uuid(),
            role: 'assistant',
            content: cleanResponse,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, assistantMsg]);
        }

        handleStructuredTags(finalResponse);
      }
    },
    [messages, themes, systemPromptFn, complete, isGenerating, onThemeDetected],
  );

  /** Aborts any in-progress generation and clears the message list. */
  function reset() {
    abortRef.current = true;
    setMessages([]);
    setStreamBuffer('');
  }

  // isActive merges the two async operations into a single "busy" flag for the UI
  const isActive = isGenerating || isSearching;

  // displayMessages appends a synthetic streaming message while the LLM is
  // generating so the user sees tokens appear in real time. Once the real
  // message is committed to `messages`, the stream bubble disappears.
  const displayMessages: Message[] = streamBuffer
    ? [
        ...messages,
        {
          id: '__stream__',
          role: 'assistant' as const,
          content: streamBuffer,
          timestamp: Date.now(),
        },
      ]
    : messages;

  return {
    messages,
    displayMessages,  // use this for rendering; messages for persistence
    streamBuffer,
    isGenerating: isActive,
    isSearching,
    modelLoaded,
    sendMessage,
    setMessages,
    reset,
  };
}
