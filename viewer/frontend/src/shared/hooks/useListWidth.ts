import { useCallback } from 'react';
import type { CSSProperties } from 'react';
import usePanelSizes from './usePanelSizes.ts';

type Tab = 'editor' | 'proposed' | 'lexicon';

export const LIST_WIDTH = { default: 260, min: 180, max: 600 };
// One object per tab, so each tab's sizes keep a stable `defaults` and are stored under their own key.
const DEFAULTS: Record<Tab, Record<string, number>> = {
  editor: { editor: LIST_WIDTH.default },
  proposed: { proposed: LIST_WIDTH.default },
  lexicon: { lexicon: LIST_WIDTH.default },
};

// The width of a tab's list panel: `style` goes on the tab's `.editor` element, `handleProps` on its ResizeHandle.
export default function useListWidth(tab: Tab) {
  const { widths, setWidth, commit, reset } = usePanelSizes('planner.listWidth', DEFAULTS[tab], LIST_WIDTH);
  const width = widths[tab];
  return {
    style: { '--list-width': `${width}px` } as CSSProperties, // React's style type has no custom properties
    handleProps: {
      label: 'Resize the list', value: width, min: LIST_WIDTH.min, max: LIST_WIDTH.max,
      onChange: useCallback((w: number) => setWidth(tab, w), [setWidth, tab]),
      onCommit: useCallback(() => commit(tab), [commit, tab]),
      onReset: useCallback(() => reset(tab), [reset, tab]),
    },
  };
}
