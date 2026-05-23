/**
 * Tests for SearchResultsMessage — the collapsible web search results card.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { Message } from '../../src/types';

// React 19 requires act() to flush concurrent renders synchronously
function rendered(element: React.ReactElement) {
  let r: ReturnType<typeof ReactTestRenderer.create> | undefined;
  ReactTestRenderer.act(() => {
    r = ReactTestRenderer.create(element);
  });
  return JSON.stringify(r!.toJSON());
}

// Lazy import after act() wrapper is defined so jest.mock hoisting works
const { SearchResultsMessage } = require('../../src/components/SearchResultsMessage');

function msg(overrides: Partial<Message> = {}): Message {
  return {
    id: 'search-1',
    role: 'search_results',
    content: '',
    timestamp: 1000,
    searchQuery: 'stoicism philosophy',
    searchResults: [
      { title: 'Stoicism Guide', url: 'https://stoic.com', description: 'A guide to stoic living' },
      { title: 'Marcus Aurelius', url: 'https://marcus.com', description: 'Meditations overview' },
    ],
    ...overrides,
  };
}

describe('SearchResultsMessage — rendering', () => {
  test('renders the search query in the header', () => {
    expect(rendered(<SearchResultsMessage message={msg()} />)).toContain(
      'stoicism philosophy',
    );
  });

  test('renders result titles when expanded (default state)', () => {
    const json = rendered(<SearchResultsMessage message={msg()} />);
    expect(json).toContain('Stoicism Guide');
    expect(json).toContain('Marcus Aurelius');
  });

  test('renders result URLs when expanded', () => {
    const json = rendered(<SearchResultsMessage message={msg()} />);
    expect(json).toContain('https://stoic.com');
  });

  test('renders result descriptions when expanded', () => {
    const json = rendered(<SearchResultsMessage message={msg()} />);
    expect(json).toContain('A guide to stoic living');
  });

  test('renders "No results found" when searchResults is empty', () => {
    const json = rendered(<SearchResultsMessage message={msg({ searchResults: [] })} />);
    expect(json).toContain('No results found');
  });

  test('shows "+ Add to knowledge base" button when onSavePassage is provided', () => {
    const json = rendered(
      <SearchResultsMessage message={msg()} onSavePassage={() => {}} />,
    );
    expect(json).toContain('Add to knowledge base');
  });

  test('does NOT show save button when onSavePassage is not provided', () => {
    const json = rendered(<SearchResultsMessage message={msg()} />);
    expect(json).not.toContain('Add to knowledge base');
  });

  test('renders without crashing when searchResults is undefined', () => {
    const msgNoResults: Message = { ...msg(), searchResults: undefined };
    expect(() =>
      ReactTestRenderer.act(() => {
        ReactTestRenderer.create(<SearchResultsMessage message={msgNoResults} />);
      }),
    ).not.toThrow();
  });
});
