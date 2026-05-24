/**
 * Tests for the system prompt builders.
 *
 * These are pure functions — no mocks needed. Each test verifies that the
 * generated prompt contains the right content for the given mode and inputs.
 */

import {
  distillerSystemPrompt,
  advocateSystemPrompt,
  challengerSystemPrompt,
} from '../../src/llm/prompts';
import type { WorldviewTheme } from '../../src/types';

const themes: WorldviewTheme[] = [
  { id: '1', theme: 'Individual Liberty', content: 'Freedom of the individual is paramount.', updatedAt: 1000 },
  { id: '2', theme: 'Free Markets', content: 'Markets allocate resources better than central planning.', updatedAt: 2000 },
];

// ── distillerSystemPrompt ─────────────────────────────────────────────────────

describe('distillerSystemPrompt', () => {
  test('shows "No worldview has been built yet" when themes array is empty', () => {
    const prompt = distillerSystemPrompt([], false);
    expect(prompt).toContain('No worldview has been built yet');
  });

  test('includes each theme name and its content', () => {
    const prompt = distillerSystemPrompt(themes, false);
    expect(prompt).toContain('Individual Liberty');
    expect(prompt).toContain('Freedom of the individual is paramount.');
    expect(prompt).toContain('Free Markets');
    expect(prompt).toContain('Markets allocate resources better than central planning.');
  });

  test('formats themes as markdown headers (## Theme Name)', () => {
    const prompt = distillerSystemPrompt(themes, false);
    expect(prompt).toContain('## Individual Liberty');
  });

  test('includes search tool instructions when hasSearch is true', () => {
    const prompt = distillerSystemPrompt(themes, true);
    // The search tool text tells the model to emit <search>...</search> tags
    expect(prompt).toContain('<search>');
  });

  test('omits search tool instructions when hasSearch is false', () => {
    const prompt = distillerSystemPrompt(themes, false);
    expect(prompt).not.toContain('<search>');
  });

  test('tells the model to emit <theme> blocks for upserts', () => {
    // The distiller is the only mode that writes back to the worldview document
    const prompt = distillerSystemPrompt(themes, false);
    expect(prompt).toContain('<theme>');
    expect(prompt).toContain('upsert');
  });

  test('instructs the model to pivot after repeated exchanges', () => {
    const prompt = distillerSystemPrompt(themes, false);
    expect(prompt.toLowerCase()).toContain('pivot');
  });
});

// ── advocateSystemPrompt ──────────────────────────────────────────────────────

describe('advocateSystemPrompt', () => {
  test('shows "No worldview has been built yet" when themes array is empty', () => {
    const prompt = advocateSystemPrompt([], false);
    expect(prompt).toContain('No worldview has been built yet');
  });

  test('includes all theme names in the prompt', () => {
    const prompt = advocateSystemPrompt(themes, false);
    expect(prompt).toContain('Individual Liberty');
    expect(prompt).toContain('Free Markets');
  });

  test('includes search tool when hasSearch is true', () => {
    expect(advocateSystemPrompt(themes, true)).toContain('<search>');
  });

  test('omits search tool when hasSearch is false', () => {
    expect(advocateSystemPrompt(themes, false)).not.toContain('<search>');
  });

  test('frames the AI as arguing FOR the worldview', () => {
    const prompt = advocateSystemPrompt(themes, false);
    // The prompt should position the AI as defending/arguing for the views
    expect(prompt.toLowerCase()).toMatch(/champion|defend|arguing|argue/);
  });

  test('does NOT include <theme> upsert instructions (only distiller writes themes)', () => {
    const prompt = advocateSystemPrompt(themes, false);
    expect(prompt).not.toContain('"action": "upsert"');
  });
});

// ── challengerSystemPrompt ────────────────────────────────────────────────────

describe('challengerSystemPrompt', () => {
  test('shows "No worldview has been built yet" when themes array is empty', () => {
    const prompt = challengerSystemPrompt([], false);
    expect(prompt).toContain('No worldview has been built yet');
  });

  test('includes all theme names in the prompt', () => {
    const prompt = challengerSystemPrompt(themes, false);
    expect(prompt).toContain('Individual Liberty');
    expect(prompt).toContain('Free Markets');
  });

  test('includes search tool when hasSearch is true', () => {
    expect(challengerSystemPrompt(themes, true)).toContain('<search>');
  });

  test('omits search tool when hasSearch is false', () => {
    expect(challengerSystemPrompt(themes, false)).not.toContain('<search>');
  });

  test('frames the AI as opposing / challenging the worldview', () => {
    const prompt = challengerSystemPrompt(themes, false);
    expect(prompt.toLowerCase()).toMatch(/challenge|opponent|counter|steelman/);
  });

  test('does NOT include <theme> upsert instructions', () => {
    const prompt = challengerSystemPrompt(themes, false);
    expect(prompt).not.toContain('"action": "upsert"');
  });
});
