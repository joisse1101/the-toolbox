import { createContext, useContext } from 'react';

// The provider (components/ConfirmDialog.jsx) puts `ask(request)` here. This file has no JSX, so the pure-module tests
// can still import the hooks that call useConfirm.
export const ConfirmContext = createContext(null);

// `ask({ title, message, confirmLabel, danger })` resolves true when the user confirms, false on Cancel or Escape.
export function useConfirm() {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error('useConfirm needs a ConfirmProvider above it');
  return ask;
}
