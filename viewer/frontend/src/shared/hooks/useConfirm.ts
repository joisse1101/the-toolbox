import { createContext, useContext } from 'react';

export interface ConfirmRequest {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}
export type Ask = (request: ConfirmRequest) => Promise<boolean>;

// The provider (ui/ConfirmDialog.tsx) puts `ask(request)` here. This file has no JSX, so the pure-module tests
// can still import the hooks that call useConfirm.
export const ConfirmContext = createContext<Ask | null>(null);

// `ask({ title, message, confirmLabel, danger })` resolves true when the user confirms, false on Cancel or Escape.
export function useConfirm() {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error('useConfirm needs a ConfirmProvider above it');
  return ask;
}
