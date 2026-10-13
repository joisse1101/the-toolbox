import { storyCellText } from '../model.js';

// Red wins over yellow.
export function issueClass(errors, warnings) {
  if (errors.length) return 'incomplete';
  return warnings.length ? 'warn' : '';
}

export const rowTooltip = (s, errors, warnings) =>
  [storyCellText(s), [...errors, ...warnings].join('\n')].filter(Boolean).join('\n\n');
