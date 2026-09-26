import {
  DEFAULT_PROGRESS_BAR,
  type ProgressBarStyle,
  type TimeOptions,
} from '../../model/segments';
import { dateToDotnetTicks, dotnetTicksToDate } from '../../util/dotnet';
import type { VrcoscVariableType } from './catalog-types';
import { vBigInt, vBoolean, vNumber, vString, type VJson, type VObject } from './vjson';

/**
 * Clip variable option dictionaries (`vrcosc-format.md` §2.3). Keys are written
 * in VRCOSC's reflection order: class-specific options first, then the base
 * `ClipVariable` options.
 */
export const BASE_OPTION_DEFAULTS: VObject = {
  case_mode: 0,
  truncate_length: -1,
  include_ellipses: false,
  scroll_direction: 0,
  scroll_speed: 0,
  join_string: '',
  only_scroll_when_truncated: false,
};

export const DEFAULT_DATETIME_FORMAT = 'yyyy/MM/dd HH:mm:ss';
export const DEFAULT_TIMESPAN_FORMAT = 'mm\\:ss';

const PROGRESS_DEFAULTS: VObject = {
  use_visual: true,
  visual_resolution: DEFAULT_PROGRESS_BAR.length,
  visual_line: DEFAULT_PROGRESS_BAR.empty,
  visual_line_complete: DEFAULT_PROGRESS_BAR.filled,
  visual_position: DEFAULT_PROGRESS_BAR.position,
  visual_start: DEFAULT_PROGRESS_BAR.start,
  visual_end: DEFAULT_PROGRESS_BAR.end,
};

/** Class-specific defaults per variable value type. */
export function classDefaults(type: VrcoscVariableType): VObject {
  switch (type) {
    case 'string':
      return {};
    case 'bool':
      return { when_true: 'True', when_false: 'False' };
    case 'int':
      return { mode: 0, min_value: 0, max_value: 100, symbol_list: [] };
    case 'float':
      return { mode: 0, float_format: 'F1', symbol_list: [] };
    case 'datetime':
      return { datetime_format: DEFAULT_DATETIME_FORMAT, timezone_id: '' };
    case 'timespan':
      return { time_format: DEFAULT_TIMESPAN_FORMAT, include_negative_sign: true };
    case 'progress':
      return PROGRESS_DEFAULTS;
  }
}

/** Defaults of the built-in variables' own classes (`text`, `timer`, `filereader`). */
export function builtInDefaults(variableId: string): VObject {
  switch (variableId) {
    case 'text':
      return { text: '' };
    case 'timer':
      // `datetime` has no meaningful default (VRCOSC uses "now"); callers always set it.
      return { time_format: DEFAULT_TIMESPAN_FORMAT, include_negative_sign: true };
    case 'filereader':
      return { file_location: '' };
    default:
      return {};
  }
}

/** All options of a class with the given overrides applied, in VRCOSC key order. */
export function fullOptions(defaults: VObject, overrides: VObject): VObject {
  return { ...defaults, ...BASE_OPTION_DEFAULTS, ...overrides };
}

/** Effective option value: the stored one, else the class default. */
export function optionValue(options: VObject, defaults: VObject, key: string): VJson | undefined {
  if (Object.hasOwn(options, key)) {
    return options[key];
  }
  return Object.hasOwn(defaults, key) ? defaults[key] : BASE_OPTION_DEFAULTS[key];
}

export function readProgressStyle(options: VObject): ProgressBarStyle {
  const line = vString(options['visual_line'], DEFAULT_PROGRESS_BAR.empty);
  const complete = vString(options['visual_line_complete'], '');
  return {
    length: vNumber(options['visual_resolution'], DEFAULT_PROGRESS_BAR.length),
    // VRCOSC rewrites an empty `visual_line_complete` to `visual_line` on load.
    filled: complete === '' ? line : complete,
    empty: line,
    position: vString(options['visual_position'], DEFAULT_PROGRESS_BAR.position),
    start: vString(options['visual_start'], DEFAULT_PROGRESS_BAR.start),
    end: vString(options['visual_end'], DEFAULT_PROGRESS_BAR.end),
  };
}

export function progressOptions(style: ProgressBarStyle): VObject {
  return {
    use_visual: true,
    visual_resolution: style.length,
    visual_line: style.empty,
    visual_line_complete: style.filled,
    visual_position: style.position,
    visual_start: style.start,
    visual_end: style.end,
  };
}

export function usesVisualBar(options: VObject): boolean {
  return vBoolean(options['use_visual'], true);
}

/** .NET custom DateTime pattern for a time segment. */
export function datetimeFormatFor(options: TimeOptions, target: 'time' | 'date'): string {
  if (target === 'date') {
    return 'yyyy-MM-dd';
  }
  const hours = options.use24Hour ? 'HH:mm' : 'hh:mm';
  const seconds = options.showSeconds ? ':ss' : '';
  const suffix = options.use24Hour ? '' : ' tt';
  return `${hours}${seconds}${suffix}`;
}

export interface DateTimePatternInfo {
  readonly use24Hour: boolean;
  readonly showSeconds: boolean;
  /** No hour/minute/second specifiers at all, e.g. `yyyy/MM/dd`. */
  readonly dateOnly: boolean;
}

/** Inspect a .NET custom DateTime pattern (quoted literals are ignored). */
export function inspectDateTimePattern(pattern: string): DateTimePatternInfo {
  const bare = pattern.replace(/'[^']*'|"[^"]*"|\\./g, '');
  const hasTime = /[Hhms]/.test(bare);
  return {
    use24Hour: bare.includes('H') || !bare.includes('h'),
    showSeconds: bare.includes('s'),
    dateOnly: !hasTime,
  };
}

export function ticksToIso(ticks: bigint): string {
  return dotnetTicksToDate(ticks).toISOString();
}

export function isoToTicks(iso: string): bigint | undefined {
  const millis = Date.parse(iso);
  return Number.isNaN(millis) ? undefined : dateToDotnetTicks(new Date(millis));
}

/** The `datetime` option of a timer variable as ISO-8601, if present and valid. */
export function timerTargetFromOptions(options: VObject): string | undefined {
  const ticks = vBigInt(options['datetime']);
  if (ticks === undefined) {
    return undefined;
  }
  const date = dotnetTicksToDate(ticks);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
