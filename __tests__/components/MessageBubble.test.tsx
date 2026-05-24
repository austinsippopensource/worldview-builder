/**
 * Tests for MessageBubble.
 *
 * React 19 runs in concurrent mode and requires act() to flush renders.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { MessageBubble } from '../../src/components/MessageBubble';
import type { Message } from '../../src/types';

function rendered(element: React.ReactElement) {
  let r: ReturnType<typeof ReactTestRenderer.create> | undefined;
  ReactTestRenderer.act(() => {
    r = ReactTestRenderer.create(element);
  });
  return JSON.stringify(r!.toJSON());
}

const userMessage: Message = {
  id: 'msg-user',
  role: 'user',
  content: 'I believe in democracy.',
  timestamp: 1000,
};

const aiMessage: Message = {
  id: 'msg-ai',
  role: 'assistant',
  content: 'Democracy has been the most stable form of governance across history.',
  timestamp: 2000,
};

describe('MessageBubble — rendering', () => {
  test('renders user message content', () => {
    expect(rendered(<MessageBubble message={userMessage} />)).toContain(
      'I believe in democracy.',
    );
  });

  test('renders AI message content', () => {
    expect(rendered(<MessageBubble message={aiMessage} />)).toContain(
      'Democracy has been the most stable form',
    );
  });

  test('shows "Hold to save" hint on AI messages when onSavePassage is provided', () => {
    expect(
      rendered(<MessageBubble message={aiMessage} onSavePassage={() => {}} />),
    ).toContain('Hold to save');
  });

  test('shows "Hold to save" hint on user messages when onSavePassage is provided', () => {
    expect(
      rendered(<MessageBubble message={userMessage} onSavePassage={() => {}} />),
    ).toContain('Hold to save');
  });

  test('does NOT show hint when onSavePassage is not provided', () => {
    expect(rendered(<MessageBubble message={aiMessage} />)).not.toContain(
      'Hold to save',
    );
  });
});

describe('MessageBubble — save modal', () => {
  test('renders without crashing for user messages', () => {
    expect(() =>
      ReactTestRenderer.act(() => {
        ReactTestRenderer.create(<MessageBubble message={userMessage} />);
      }),
    ).not.toThrow();
  });

  test('renders without crashing for AI messages with onSavePassage', () => {
    const onSave = jest.fn();
    expect(() =>
      ReactTestRenderer.act(() => {
        ReactTestRenderer.create(<MessageBubble message={aiMessage} onSavePassage={onSave} />);
      }),
    ).not.toThrow();
  });
});
