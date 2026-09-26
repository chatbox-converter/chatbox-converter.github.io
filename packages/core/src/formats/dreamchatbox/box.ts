import type { JsonObject } from '../../util/json';
import { BOX_CUSTOM_TEMPLATE, BOX_PRESETS, type BoxFrame } from './catalog';
import { num, obj } from './defaults';

/** Frame characters for `box_template` (12 = `box_custom_style`, `core/boxstyle.py:85-88`). */
export function frameFor(cfg: JsonObject): BoxFrame {
  const index = num(cfg, 'box_template');
  const preset = BOX_PRESETS[index];
  if (index !== BOX_CUSTOM_TEMPLATE && preset !== undefined) {
    return preset;
  }
  const custom = obj(cfg, 'box_custom_style');
  const part = (key: keyof BoxFrame, fallback: string): string => {
    const value = custom[key];
    return typeof value === 'string' ? value.slice(0, 4) : fallback;
  };
  return {
    tl: part('tl', '‹'),
    tf: part('tf', '·') || '·',
    tr: part('tr', '›'),
    bl: part('bl', '‹'),
    bf: part('bf', '·') || '·',
    br: part('br', '›'),
  };
}

export type BoxSide = 'top' | 'bottom';

/**
 * One frame line (`core/boxstyle.py:206-230`). Without a middle the fill
 * repeats `width` times, with one it is split `width // 2` per side.
 */
export function renderBoxLine(
  frame: BoxFrame,
  side: BoxSide,
  width: number,
  middle: string,
): string {
  const left = side === 'top' ? frame.tl : frame.bl;
  const fill = (side === 'top' ? frame.tf : frame.bf) || ' ';
  const right = side === 'top' ? frame.tr : frame.br;
  const safeWidth = Math.max(0, Math.trunc(width));
  const text = middle.trim();
  if (text === '') {
    return left + fill.repeat(safeWidth) + right;
  }
  const half = Math.trunc(safeWidth / 2);
  return `${left}${fill.repeat(half)} ${text} ${fill.repeat(half)}${right}`;
}

export interface BoxLineMatch {
  /** Preset index, or `BOX_CUSTOM_TEMPLATE` when only a custom frame matched. */
  readonly template: number;
  readonly frame: BoxFrame;
  readonly width: number;
  readonly middle: string;
}

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function matchWith(frame: BoxFrame, side: BoxSide, line: string): BoxLineMatch | undefined {
  const left = side === 'top' ? frame.tl : frame.bl;
  const fill = (side === 'top' ? frame.tf : frame.bf) || ' ';
  const right = side === 'top' ? frame.tr : frame.br;
  if (left === '' && right === '' && !line.includes(fill)) {
    return undefined;
  }
  const pattern = new RegExp(
    `^${escape(left)}((?:${escape(fill)})*)(?: (.*?) ((?:${escape(fill)})*))?${escape(right)}$`,
    'su',
  );
  const match = pattern.exec(line);
  if (match === null) {
    return undefined;
  }
  const leftFill = (match[1] ?? '').length / fill.length;
  const middle = match[2] ?? '';
  const rightFill = (match[3] ?? '').length / fill.length;
  const width = middle === '' ? leftFill : leftFill + rightFill;
  return { template: 0, frame, width, middle };
}

/** Recognise a line drawn by `renderBoxLine` with one of the presets or the given custom frame. */
export function matchBoxLine(
  line: string,
  side: BoxSide,
  custom: BoxFrame,
): BoxLineMatch | undefined {
  for (const [index, preset] of BOX_PRESETS.entries()) {
    const match = matchWith(preset, side, line);
    if (match !== undefined) {
      return { ...match, template: index };
    }
  }
  const match = matchWith(custom, side, line);
  return match === undefined ? undefined : { ...match, template: BOX_CUSTOM_TEMPLATE };
}
