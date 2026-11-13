// Reading a caught value: `catch` gives `unknown`, and Node's file errors carry a `code` such as ENOENT.

export const codeOf = (err: unknown): string | undefined => (err as NodeJS.ErrnoException).code;

export const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));
