import type { Story } from '#shared/types.ts';
import { storyCellText } from '#shared/backlog/model.ts';

// Red wins over yellow.
export function issueClass(errors: readonly string[], warnings: readonly string[]): 'incomplete' | 'warn' | '' {
  if (errors.length) return 'incomplete';
  return warnings.length ? 'warn' : '';
}

export const rowTooltip = (s: Story, errors: readonly string[], warnings: readonly string[]) =>
  [storyCellText(s), [...errors, ...warnings].join('\n')].filter(Boolean).join('\n\n');
