// Layout helpers. Each takes `gap`, a step of the spacing scale (1 to 6, the --space-N tokens in shared/style.css), so a
// component states its spacing instead of repeating flex rules or inline styles. Other props (id, role...) pass through.
import type { HTMLAttributes } from 'react';

type BoxProps = HTMLAttributes<HTMLDivElement> & { gap?: number };

const join = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

// A column of children.
export function Stack({ gap = 2, className, children, ...rest }: BoxProps) {
  return <div className={join('layout-stack', `gap-${gap}`, className)} {...rest}>{children}</div>;
}

// A wrapping line of children; a child with class "grow" takes the spare width. Aligns to the bottom edge unless `align` says otherwise.
export function Row({ gap = 2, align, className, children, ...rest }: BoxProps & { align?: string }) {
  return <div className={join('row', `gap-${gap}`, align && `align-${align}`, className)} {...rest}>{children}</div>;
}

// Children in equal columns that wrap when narrower than 180px.
export function Grid({ gap = 3, className, children, ...rest }: BoxProps) {
  return <div className={join('grid3', `gap-${gap}`, className)} {...rest}>{children}</div>;
}
