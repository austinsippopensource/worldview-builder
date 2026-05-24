/**
 * Shared TypeScript types used across the entire app.
 *
 * These are pure type declarations — no runtime code here. Defining them in
 * one place means any screen, DB module, or component can import exactly the
 * types it needs without creating circular dependencies.
 */

// Which of the three AI personas is active in a conversation.
// "distiller" builds the worldview, "advocate" defends it, "challenger" attacks it.
export type AIMode = 'distiller' | 'advocate' | 'challenger' | 'position';

// Who said a particular message in a chat thread.
// "search_results" is a synthetic role for messages that hold web search output —
// they are formatted differently in the UI and passed back to the LLM as user context.
export type MessageRole = 'user' | 'assistant' | 'system' | 'search_results';

// Where a piece of raw text input came from.
export type InputSource = 'user' | 'web' | 'conversation';

// Whether a knowledge-base entry supports or challenges the user's worldview.
export type KnowledgeStance = 'supporting' | 'challenging';

// One result returned by the Brave Search API.
export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

// A single message in a conversation thread.
// searchResults and searchQuery are only present when role === 'search_results'.
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  searchResults?: SearchResult[];  // populated for search_results role messages
  searchQuery?: string;            // the query string that produced these results
}

// A raw piece of text the user has submitted (a paste, a web snippet, etc.)
// before it has been distilled into themes. Stored in the raw_inputs table.
export interface RawInput {
  id: string;
  content: string;
  source: InputSource;
  sourceUrl?: string;  // present when source === 'web'
  createdAt: number;
}

// An AI-extracted worldview theme — a named belief or value with a short description.
// Stored in the worldview_themes table and used as context in all three AI modes.
export interface WorldviewTheme {
  id: string;
  theme: string;    // short label, e.g. "Individual Liberty"
  content: string;  // one-paragraph description of what the user believes
  updatedAt: number;
}

// A full conversation session with its entire message history.
// Messages are stored as a JSON blob in SQLite (not a separate table).
export interface Conversation {
  id: string;
  mode: AIMode;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// A saved stance on a concrete policy topic.
// The positions tab lets users articulate where they stand on real issues,
// which also feeds back into the broader worldview themes.
export interface Position {
  id: string;
  topic: string;    // e.g. "Taxation & Government Spending"
  category: string; // e.g. "Economic Policy"
  statement: string | null; // null until the user has articulated a position
  updatedAt: number;
}

// A saved quote, passage, or argument that relates to the worldview.
// These come from AI responses (long-press to save) or web search results.
// stance tells you whether it supports or challenges the user's worldview.
export interface KnowledgeEntry {
  id: string;
  content: string;
  author?: string;      // e.g. "John Stuart Mill"
  sourceUrl?: string;   // original web URL if from a search result
  themeIds: string[];   // which worldview themes this entry relates to
  stance: KnowledgeStance;
  createdAt: number;
}
