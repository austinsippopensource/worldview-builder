/**
 * Brave Search API client.
 *
 * The AI decides when to search (by emitting a <search> tag) and this module
 * executes the actual HTTP request directly from the device — no server
 * middleman. The user provides their own Brave API key in Settings.
 *
 * Brave's API is used instead of Google/Bing because it offers a free tier
 * with a reasonable number of daily queries and doesn't require OAuth.
 */

import type { SearchResult } from '../types';

const BRAVE_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';

/**
 * Queries the Brave Search API and returns the top results.
 *
 * @param query   The search query string (already extracted from the model's response).
 * @param apiKey  The user's Brave Search API key from Settings.
 * @param count   Number of results to request (default 5 — enough context without bloating the prompt).
 */
export async function braveSearch(query: string, apiKey: string, count = 5): Promise<SearchResult[]> {
  const url = `${BRAVE_ENDPOINT}?q=${encodeURIComponent(query)}&count=${count}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,  // Brave's auth header
    },
  });
  if (!res.ok) throw new Error(`Brave Search error: ${res.status}`);
  const json = await res.json();
  const webResults = json?.web?.results ?? [];
  return webResults.map((r: any) => ({
    title: r.title ?? '',
    url: r.url ?? '',
    description: r.description ?? '',
  }));
}

/**
 * Formats search results into a plain-text block suitable for injection into
 * the LLM's context window. The numbered citation format ([1], [2], ...) is
 * a common convention that models understand — they'll reference [1], [2]
 * in their response text when they cite a specific result.
 */
export function formatResultsForPrompt(results: SearchResult[], query: string): string {
  if (results.length === 0) return `No results found for "${query}".`;
  return [
    `Search results for "${query}":`,
    ...results.map(
      (r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.description}`,
    ),
  ].join('\n\n');
}
