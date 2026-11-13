import { useRef } from 'react';

const KEY_STEP = 16;

// A vertical drag handle for a width. `onChange(width)` is called while it is dragged, `onCommit()` when the drag ends,
// `onReset()` on a double click. Left/Right arrows change the width by a step when the handle has focus.
export default function ResizeHandle({ label, value, min, max, onChange, onCommit, onReset, className = '' }) {
  const start = useRef(null);

  const down = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, width: value };
  };
  const move = (e) => {
    if (start.current) onChange(start.current.width + e.clientX - start.current.x);
  };
  const up = () => {
    if (!start.current) return;
    start.current = null;
    onCommit();
  };
  const key = (e) => {
    const step = { ArrowLeft: -KEY_STEP, ArrowRight: KEY_STEP }[e.key];
    if (!step) return;
    e.preventDefault();
    onChange(value + step);
    onCommit();
  };

  return (
    <div
      className={`resize-handle ${className}`.trim()} role="separator" aria-orientation="vertical" aria-label={label}
      aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} tabIndex={0} title="Drag to resize, double-click to reset"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onClick={(e) => e.stopPropagation()} onDoubleClick={onReset} onKeyDown={key}
    />
  );
}
