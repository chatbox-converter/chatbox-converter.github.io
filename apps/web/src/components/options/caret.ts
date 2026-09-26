export interface CaretInsertion {
  readonly value: string;
  /** Caret position after the inserted text. */
  readonly caret: number;
}

/**
 * Insert `insert` into `value`, replacing the selection [start, end).
 * Out-of-range or reversed positions are clamped so a stale caret never throws.
 */
export function insertAtCaret(
  value: string,
  insert: string,
  start: number | null,
  end: number | null = start,
): CaretInsertion {
  const from = clamp(start ?? value.length, value.length);
  const to = Math.max(from, clamp(end ?? from, value.length));
  const next = value.slice(0, from) + insert + value.slice(to);
  return { value: next, caret: from + insert.length };
}

function clamp(position: number, max: number): number {
  return Math.min(Math.max(0, Math.trunc(position)), max);
}
