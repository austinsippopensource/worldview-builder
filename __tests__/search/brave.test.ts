/**
 * Tests for the Brave Search API client.
 *
 * `fetch` is mocked at the global level — no real HTTP calls are made.
 */

import { braveSearch, formatResultsForPrompt } from '../../src/search/brave';
import type { SearchResult } from '../../src/types';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

// ── braveSearch ───────────────────────────────────────────────────────────────

describe('braveSearch', () => {
  test('calls the Brave API endpoint with the query URL-encoded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    });
    await braveSearch('free will philosophy', 'test-api-key');
    const [calledUrl] = mockFetch.mock.calls[0];
    // encodeURIComponent encodes spaces as %20 (not +)
    expect(calledUrl).toContain('free%20will%20philosophy');
  });

  test('sends the API key in the X-Subscription-Token header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    });
    await braveSearch('stoicism', 'BSA-my-key');
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['X-Subscription-Token']).toBe('BSA-my-key');
  });

  test('maps API response to SearchResult objects', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { title: 'Article Title', url: 'https://example.com', description: 'A summary' },
          ],
        },
      }),
    });
    const results = await braveSearch('test', 'key');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      title: 'Article Title',
      url: 'https://example.com',
      description: 'A summary',
    });
  });

  test('fills missing fields with empty strings', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        web: { results: [{ title: null, url: undefined, description: null }] },
      }),
    });
    const [r] = await braveSearch('test', 'key');
    expect(r.title).toBe('');
    expect(r.url).toBe('');
    expect(r.description).toBe('');
  });

  test('returns empty array when web.results is absent', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const results = await braveSearch('test', 'key');
    expect(results).toEqual([]);
  });

  test('throws an error with the HTTP status when the response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(braveSearch('test', 'key')).rejects.toThrow('Brave Search error: 429');
  });

  test('requests the default count of 5 results', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ web: { results: [] } }) });
    await braveSearch('query', 'key');
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('count=5');
  });

  test('allows count to be overridden', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ web: { results: [] } }) });
    await braveSearch('query', 'key', 10);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('count=10');
  });
});

// ── formatResultsForPrompt ────────────────────────────────────────────────────

describe('formatResultsForPrompt', () => {
  const results: SearchResult[] = [
    { title: 'First Result', url: 'https://first.com', description: 'First description' },
    { title: 'Second Result', url: 'https://second.com', description: 'Second description' },
  ];

  test('returns a no-results message for an empty array', () => {
    const text = formatResultsForPrompt([], 'my query');
    expect(text).toContain('No results found');
    expect(text).toContain('my query');
  });

  test('numbers each result starting from [1]', () => {
    const text = formatResultsForPrompt(results, 'stoicism');
    expect(text).toContain('[1] First Result');
    expect(text).toContain('[2] Second Result');
  });

  test('includes URLs in the output', () => {
    const text = formatResultsForPrompt(results, 'test');
    expect(text).toContain('https://first.com');
    expect(text).toContain('https://second.com');
  });

  test('includes the search query as a header', () => {
    const text = formatResultsForPrompt(results, 'stoicism and virtue');
    expect(text).toContain('stoicism and virtue');
  });

  test('includes result descriptions', () => {
    const text = formatResultsForPrompt(results, 'test');
    expect(text).toContain('First description');
    expect(text).toContain('Second description');
  });
});
