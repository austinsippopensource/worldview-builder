/**
 * React Context providing on-device LLM inference to all screens.
 *
 * This wraps llama.rn (a React Native binding to llama.cpp) so that any
 * component in the tree can call `useLlama()` to:
 *   - Load a GGUF model file into memory
 *   - Stream token-by-token completions
 *   - Check whether a model is currently loaded or generating
 *
 * The context is provided at the app root (App.tsx → LlamaProvider), so the
 * model stays loaded for the lifetime of the app — not re-loaded per screen.
 */

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { initLlama, type LlamaContext as LlamaCtx } from 'llama.rn';

interface LlamaState {
  context: LlamaCtx | null;   // the raw llama.rn context handle (null = no model loaded)
  isLoading: boolean;          // true while the model file is being read into memory
  isGenerating: boolean;       // true while the LLM is producing tokens
  modelLoaded: boolean;        // shorthand for context !== null
  loadModel: (modelPath: string) => Promise<void>;
  complete: (
    systemPrompt: string,
    messages: { role: string; content: string }[],
    onToken: (token: string) => void,
  ) => Promise<string>;
  stopGeneration: () => void;
}

const LlamaContext = createContext<LlamaState | null>(null);

export function LlamaProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<LlamaCtx | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Loads a GGUF model from the given file path into memory.
   *
   * Configuration parameters:
   *   model     — absolute path to the .gguf file on the device
   *   use_mlock — lock model weights in RAM so the OS can't page them to disk
   *               mid-inference (avoids random slowdowns on memory pressure)
   *   n_ctx     — context window size in tokens; 4096 is the practical maximum
   *               for a 4-bit phone model before RAM becomes a bottleneck
   *   n_threads — number of CPU threads to use; 4 is a good default for
   *               modern phones (more threads don't always mean faster inference
   *               due to memory bandwidth limits)
   */
  const loadModel = useCallback(async (modelPath: string) => {
    setIsLoading(true);
    try {
      const ctx = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 4096,
        n_threads: 4,
      });
      setContext(ctx);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Cancels any in-progress completion.
   * Called by chat screens when the user presses a stop button (not yet in UI
   * but the hook is ready for it), or when the component unmounts mid-stream.
   */
  const stopGeneration = useCallback(() => {
    context?.stopCompletion();
  }, [context]);

  /**
   * Runs a chat completion and streams individual tokens back via onToken.
   *
   * The full response string is also returned so callers can parse it for
   * structured tags (<search>, <theme>) after streaming finishes.
   *
   * temperature 0.7 and top_p 0.9 give a good balance between coherent
   * reasoning (which needs lower temperature) and varied phrasing.
   * max_new_tokens 1024 caps output length to avoid runaway responses.
   */
  const complete = useCallback(
    async (
      systemPrompt: string,
      messages: { role: string; content: string }[],
      onToken: (token: string) => void,
    ): Promise<string> => {
      if (!context) throw new Error('Model not loaded');
      setIsGenerating(true);
      let full = '';
      try {
        await context.completion(
          {
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            temperature: 0.7,
            top_p: 0.9,
            max_new_tokens: 1024,
          },
          data => {
            if (data.token) {
              full += data.token;
              onToken(data.token);
            }
          },
        );
      } finally {
        setIsGenerating(false);
      }
      return full;
    },
    [context],
  );

  return (
    <LlamaContext.Provider
      value={{
        context,
        isLoading,
        isGenerating,
        modelLoaded: context !== null,
        loadModel,
        complete,
        stopGeneration,
      }}
    >
      {children}
    </LlamaContext.Provider>
  );
}

/**
 * Hook to access the LLM from any screen or component.
 * Must be used inside a LlamaProvider — throws if called outside one.
 */
export function useLlama() {
  const ctx = useContext(LlamaContext);
  if (!ctx) throw new Error('useLlama must be used within LlamaProvider');
  return ctx;
}
