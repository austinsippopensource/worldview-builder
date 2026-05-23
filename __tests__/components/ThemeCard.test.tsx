/**
 * Tests for ThemeCard — the expandable worldview theme card.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ThemeCard } from '../../src/components/ThemeCard';
import type { WorldviewTheme } from '../../src/types';

function rendered(element: React.ReactElement) {
  let r: ReturnType<typeof ReactTestRenderer.create> | undefined;
  ReactTestRenderer.act(() => {
    r = ReactTestRenderer.create(element);
  });
  return JSON.stringify(r!.toJSON());
}

const theme: WorldviewTheme = {
  id: 'theme-1',
  theme: 'Individual Liberty',
  content: 'Freedom of individual choice is paramount above collective mandates.',
  updatedAt: 1_000_000,
};

describe('ThemeCard — collapsed state (default)', () => {
  test('renders the theme name', () => {
    expect(rendered(
      <ThemeCard theme={theme} onUpdate={() => {}} onDelete={() => {}} />,
    )).toContain('Individual Liberty');
  });

  test('does NOT render the full content text when collapsed', () => {
    // The body (including content text) is only mounted when expanded=true
    expect(rendered(
      <ThemeCard theme={theme} onUpdate={() => {}} onDelete={() => {}} />,
    )).not.toContain('Freedom of individual choice is paramount');
  });

  test('renders Edit and Delete action buttons', () => {
    const json = rendered(
      <ThemeCard theme={theme} onUpdate={() => {}} onDelete={() => {}} />,
    );
    expect(json).toContain('Edit');
    expect(json).toContain('Delete');
  });

  test('renders the expand chevron (▼ when collapsed)', () => {
    expect(rendered(
      <ThemeCard theme={theme} onUpdate={() => {}} onDelete={() => {}} />,
    )).toContain('▼');
  });
});

describe('ThemeCard — expanded state', () => {
  test('renders theme content after pressing the header to expand', () => {
    let renderer: ReturnType<typeof ReactTestRenderer.create>;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeCard theme={theme} onUpdate={() => {}} onDelete={() => {}} />,
      );
    });

    // Find the first TouchableOpacity (the header) and press it to expand
    const touchables = renderer!.root.findAllByType(
      require('react-native').TouchableOpacity,
    );
    const header = touchables[0];

    ReactTestRenderer.act(() => {
      header.props.onPress?.();
    });

    expect(JSON.stringify(renderer!.toJSON())).toContain(
      'Freedom of individual choice is paramount',
    );
  });

  test('shows collapse chevron (▲) when expanded', () => {
    let renderer: ReturnType<typeof ReactTestRenderer.create>;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeCard theme={theme} onUpdate={() => {}} onDelete={() => {}} />,
      );
    });

    const touchables = renderer!.root.findAllByType(
      require('react-native').TouchableOpacity,
    );
    ReactTestRenderer.act(() => {
      touchables[0].props.onPress?.();
    });

    expect(JSON.stringify(renderer!.toJSON())).toContain('▲');
  });
});

describe('ThemeCard — callbacks', () => {
  test('renders without crashing', () => {
    expect(() =>
      ReactTestRenderer.act(() => {
        ReactTestRenderer.create(
          <ThemeCard theme={theme} onUpdate={() => {}} onDelete={() => {}} />,
        );
      }),
    ).not.toThrow();
  });
});
