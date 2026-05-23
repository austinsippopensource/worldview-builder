/**
 * Tests for useAgenticChat — the core chat hook.
 *
 * NOTE on jest.mock() hoisting:
 * jest.mock() calls are hoisted to the top of the compiled file before any
 * variable declarations. This means you cannot reference a variable declared
 * above jest.mock() inside its factory — the variable is still `undefined`
 * when the factory executes. Instead, we define all mock functions using
 * jest.fn() inside the factory and retrieve references via require() in
 * beforeEach, then configure return values there.
 *
 * Test strategy: render a minimal wrapper component that captures the hook's
 * return value into a module-level variable. Each re-render updates that
 * variable, so assertions after act() see the latest state.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { act } from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────
// All mock.fn() calls are inside the factory so hoisting doesn't cause
// "variable is undefined" errors.

jest.mock('../../src/llm/LlamaContext', () => ({
  useLlama: jest.fn(),
}));

jest.mock('../../src/storage/settings', () => ({
  Settings: { getBraveApiKey: jest.fn() },
}));

jest.mock('../../src/search/brave', () => ({
  braveSearch: jest.fn(),
  formatResultsForPrompt: jest.fn(),
}));

// ── Test harness ──────────────────────────────────────────────────────────────

import { useAgenticChat } from '../../src/llm/useAgenticChat';
import type { WorldviewTheme } from '../../src/types';

// Captured between renders; each render cycle updates this reference
let hookResult: ReturnType<typeof useAgenticChat>;

function TestHarness({
  onThemeDetected,
}: {
  onThemeDetected?: (theme: string, content: string) => void;
}) {
  hookResult = useAgenticChat({
    mode: 'distiller',
    themes: [] as WorldviewTheme[],
    systemPromptFn: () => 'System prompt for testing',
    onThemeDetected,
  });
  return null;
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

let mockComplete: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  // Configure useLlama mock for each test
  mockComplete = jest.fn();
  const { useLlama } = require('../../src/llm/LlamaContext');
  useLlama.mockReturnValue({
    complete: mockComplete,
    isGenerating: false,
    modelLoaded: true,
  });

  // Default: no Brave key (search disabled)
  const { Settings } = require('../../src/storage/settings');
  Settings.getBraveApiKey.mockResolvedValue(null);

  // Default format function
  const { formatResultsForPrompt } = require('../../src/search/brave');
  formatResultsForPrompt.mockReturnValue('Formatted search results text');
});

// ── Basic state ───────────────────────────────────────────────────────────────

describe('initial state', () => {
  test('starts with empty messages and modelLoaded=true', async () => {
    await act(async () => {
      ReactTestRenderer.create(<TestHarness />);
    });
    expect(hookResult.messages).toEqual([]);
    expect(hookResult.modelLoaded).toBe(true);
    expect(hookResult.isGenerating).toBe(false);
    expect(hookResult.isSearching).toBe(false);
  });
});

// ── sendMessage ───────────────────────────────────────────────────────────────

describe('sendMessage — basic flow', () => {
  test('appends user message then AI response to messages', async () => {
    mockComplete.mockResolvedValue('The AI replies.');

    await act(async () => {
      ReactTestRenderer.create(<TestHarness />);
    });
    await act(async () => {
      await hookResult.sendMessage('Hello AI');
    });

    expect(hookResult.messages).toHaveLength(2);
    expect(hookResult.messages[0].role).toBe('user');
    expect(hookResult.messages[0].content).toBe('Hello AI');
    expect(hookResult.messages[1].role).toBe('assistant');
    expect(hookResult.messages[1].content).toBe('The AI replies.');
  });

  test('trims whitespace from the user input', async () => {
    mockComplete.mockResolvedValue('Response.');

    await act(async () => { ReactTestRenderer.create(<TestHarness />); });
    await act(async () => { await hookResult.sendMessage('  Hello  '); });

    expect(hookResult.messages[0].content).toBe('Hello');
  });

  test('does nothing when the message is empty or whitespace-only', async () => {
    await act(async () => { ReactTestRenderer.create(<TestHarness />); });
    await act(async () => { await hookResult.sendMessage('   '); });

    expect(hookResult.messages).toHaveLength(0);
    expect(mockComplete).not.toHaveBeenCalled();
  });
});

// ── <theme> tag parsing ───────────────────────────────────────────────────────

describe('theme detection', () => {
  test('strips <theme> tags from the displayed assistant message', async () => {
    mockComplete.mockResolvedValue(
      'Great insight!\n<theme>{"action":"upsert","theme":"Freedom","content":"Liberty matters"}</theme>',
    );

    await act(async () => { ReactTestRenderer.create(<TestHarness />); });
    await act(async () => { await hookResult.sendMessage('What do I value?'); });

    const aiMsg = hookResult.messages.find(m => m.role === 'assistant');
    expect(aiMsg?.content).not.toContain('<theme>');
    expect(aiMsg?.content).toContain('Great insight!');
  });

  test('calls onThemeDetected with the parsed theme name and content', async () => {
    mockComplete.mockResolvedValue(
      'Sure.\n<theme>{"action":"upsert","theme":"Freedom","content":"Liberty matters"}</theme>',
    );
    const onTheme = jest.fn();

    await act(async () => { ReactTestRenderer.create(<TestHarness onThemeDetected={onTheme} />); });
    await act(async () => { await hookResult.sendMessage('What do I believe?'); });

    expect(onTheme).toHaveBeenCalledWith('Freedom', 'Liberty matters');
  });

  test('ignores malformed <theme> JSON without throwing', async () => {
    mockComplete.mockResolvedValue('Response\n<theme>NOT_VALID_JSON</theme>');
    const onTheme = jest.fn();

    await act(async () => { ReactTestRenderer.create(<TestHarness onThemeDetected={onTheme} />); });
    await act(async () => { await hookResult.sendMessage('Test'); });

    expect(onTheme).not.toHaveBeenCalled();
  });

  test('does not call onThemeDetected when action is not "upsert"', async () => {
    mockComplete.mockResolvedValue(
      'Text\n<theme>{"action":"delete","theme":"Old","content":"x"}</theme>',
    );
    const onTheme = jest.fn();

    await act(async () => { ReactTestRenderer.create(<TestHarness onThemeDetected={onTheme} />); });
    await act(async () => { await hookResult.sendMessage('Test'); });

    expect(onTheme).not.toHaveBeenCalled();
  });
});

// ── Agentic web search loop ───────────────────────────────────────────────────

describe('agentic search loop', () => {
  test('injects search results into the conversation when AI emits a <search> tag', async () => {
    const { Settings } = require('../../src/storage/settings');
    Settings.getBraveApiKey.mockResolvedValue('BSA-test-key');

    const { braveSearch } = require('../../src/search/brave');
    braveSearch.mockResolvedValue([
      { title: 'Stoicism Guide', url: 'https://stoic.com', description: 'About stoicism' },
    ]);

    mockComplete
      .mockResolvedValueOnce('<search>stoicism virtue</search>')
      .mockResolvedValueOnce('Stoicism is about virtue and reason.');

    await act(async () => { ReactTestRenderer.create(<TestHarness />); });
    await act(async () => { await hookResult.sendMessage('Tell me about stoicism'); });

    const roles = hookResult.messages.map(m => m.role);
    expect(roles).toContain('search_results');
    expect(roles).toContain('assistant');

    const searchMsg = hookResult.messages.find(m => m.role === 'search_results');
    expect(searchMsg?.searchQuery).toBe('stoicism virtue');
  });

  test('skips search when no Brave API key is configured', async () => {
    const { Settings } = require('../../src/storage/settings');
    Settings.getBraveApiKey.mockResolvedValue(null);
    mockComplete.mockResolvedValue('<search>some query</search> followed by text.');

    await act(async () => { ReactTestRenderer.create(<TestHarness />); });
    await act(async () => { await hookResult.sendMessage('Test'); });

    const { braveSearch } = require('../../src/search/brave');
    expect(braveSearch).not.toHaveBeenCalled();
  });
});

// ── reset ─────────────────────────────────────────────────────────────────────

describe('reset', () => {
  test('clears all messages', async () => {
    mockComplete.mockResolvedValue('Response');

    await act(async () => { ReactTestRenderer.create(<TestHarness />); });
    await act(async () => { await hookResult.sendMessage('Test'); });
    expect(hookResult.messages.length).toBeGreaterThan(0);

    act(() => { hookResult.reset(); });
    expect(hookResult.messages).toEqual([]);
  });
});

// ── displayMessages ───────────────────────────────────────────────────────────

describe('displayMessages', () => {
  test('equals messages when not streaming', async () => {
    mockComplete.mockResolvedValue('Done.');

    await act(async () => { ReactTestRenderer.create(<TestHarness />); });
    await act(async () => { await hookResult.sendMessage('Hi'); });

    expect(hookResult.displayMessages).toEqual(hookResult.messages);
  });
});
