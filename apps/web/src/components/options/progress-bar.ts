import type { ProgressBarStyle } from '@chatbox-converter/core';

/** Draw a bar the way the generators do, with the marker at `fraction` of the way. */
export function renderProgressBar(style: ProgressBarStyle, fraction: number): string {
  const length = Math.max(0, Math.min(60, Math.trunc(style.length)));
  const clamped = Math.max(0, Math.min(1, fraction));
  const hasMarker = style.position !== '';
  const cells = hasMarker ? Math.max(0, length - 1) : length;
  const filledCount = Math.round(cells * clamped);
  const body =
    style.filled.repeat(filledCount) +
    (hasMarker && length > 0 ? style.position : '') +
    style.empty.repeat(Math.max(0, cells - filledCount));
  return style.start + body + style.end;
}
