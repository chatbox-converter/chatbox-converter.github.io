import type { PlaceholderName } from '../../model/placeholders';
import type { SegmentOptions } from '../../model/segments';
import { parseTemplate, renderTemplate, type TemplateValues } from '../../model/template';
import { findModule, findVariable, sourcesFor, type VariableSource } from './catalog';
import type { VrcVariable } from './document';
import { DEFAULT_TIMESPAN_FORMAT, datetimeFormatFor, isoToTicks, progressOptions } from './options';
import { vEqual, type VObject } from './vjson';

/**
 * Turns canonical templates into a VRCOSC format string plus its positional
 * `variables` array: `{artist} - {title}` → `{0} - {1}` with two Media
 * variables. Placeholders VRCOSC cannot provide are removed (with separator
 * tidy) and reported.
 */
export interface CompilePart {
  readonly template: string;
  readonly options: SegmentOptions;
}

export interface CompileInput {
  readonly parts: readonly CompilePart[];
  readonly separator: string;
  readonly prefix: string;
  readonly suffix: string;
  /** Text substituted for `{status}`. */
  readonly statusText: string;
  /** Skip community modules (only official + built-in sources). */
  readonly officialOnly?: boolean;
  /** Media state of the compound state being compiled; drives the `{play_icon}` literal. */
  readonly mediaState?: MediaState;
}

export type MediaState = 'playing' | 'paused' | 'stopped';

/** `{play_icon}` has no variable: it is a literal that differs per media state. */
export const PLAY_ICONS: Readonly<Record<MediaState, string>> = {
  playing: '▶',
  paused: '⏸',
  stopped: '⏹',
};

/**
 * Placeholders that reuse another placeholder's variable with different
 * options: the same DateTime with a date/offset format, the progress variable
 * without its visual bar, the speech result once VRCOSC has translated it.
 */
const ALIASED_SOURCES: Partial<Record<PlaceholderName, PlaceholderName>> = {
  date: 'time',
  timezone: 'time',
  progress_percent: 'progress_bar',
  translation: 'speech_text',
};

export interface CompiledVariable extends VrcVariable {
  readonly placeholder: PlaceholderName;
}

export interface CompileResult {
  readonly format: string;
  readonly variables: readonly CompiledVariable[];
  /** Placeholders with no VRCOSC source, in order of first appearance. */
  readonly unsupported: readonly PlaceholderName[];
  /** Placeholders whose only source is a module without states (never renders). */
  readonly stateless: readonly PlaceholderName[];
  /** Module FullIDs in order of first use. */
  readonly modules: readonly string[];
}

interface ResolvedVariable {
  readonly source: VariableSource;
  readonly options: VObject;
}

function heartrateModule(options: SegmentOptions): string | undefined {
  if (options.kind !== 'heartrate') {
    return undefined;
  }
  switch (options.provider) {
    case 'hyperate':
      return 'hyperatemodule';
    case 'bluetooth':
      return 'bluetoothheartratemodule';
    case 'pulsoid':
    case 'unknown':
      return 'pulsoidmodule';
  }
}

function pickSource(
  name: PlaceholderName,
  options: SegmentOptions,
  officialOnly: boolean,
): VariableSource | undefined {
  const candidates = sourcesFor(name).filter((source) => !officialOnly || source.official);
  const preferredModule = heartrateModule(options);
  if (preferredModule !== undefined) {
    const match = candidates.find((source) => source.moduleId?.endsWith(`.${preferredModule}`));
    if (match !== undefined) {
      return match;
    }
  }
  if (name === 'weather_temp') {
    const wanted =
      options.kind === 'weather' && options.temperatureUnit === 'F' ? 'tempf' : 'tempc';
    return candidates.find((source) => source.variableId === wanted) ?? candidates[0];
  }
  if (name === 'timer' && options.kind !== 'custom') {
    // A stopwatch, not a countdown, when the segment carries no target date.
    return candidates.find((source) => source.moduleId !== null) ?? candidates[0];
  }
  // Prefer sources whose module has states; stateless modules never render.
  return (
    candidates.find((source) => source.moduleId === null || hasStates(source.moduleId)) ??
    candidates[0]
  );
}

function hasStates(moduleId: string): boolean {
  return findModule(moduleId)?.mainState !== undefined;
}

/** Options the model can express for a resolved variable (class-specific only). */
function variableOptions(
  name: PlaceholderName,
  source: VariableSource,
  options: SegmentOptions,
  statusText: string,
): VObject {
  const type = findVariable(source.moduleId, source.variableId)?.type;
  if (source.moduleId === null && source.variableId === 'text') {
    return { text: statusText };
  }
  if (source.moduleId === null && source.variableId === 'timer') {
    const ticks = options.kind === 'custom' ? isoToTicks(options.timerTarget) : undefined;
    return ticks === undefined
      ? { time_format: 'hh\\:mm\\:ss', include_negative_sign: true }
      : { datetime: ticks, time_format: 'hh\\:mm\\:ss', include_negative_sign: true };
  }
  if (source.moduleId === null && source.variableId === 'filereader') {
    return { file_location: options.kind === 'custom' ? options.filePath : '' };
  }
  if (type === 'datetime') {
    const zone = options.kind === 'time' ? options.timezone : '';
    if (name === 'timezone') {
      // .NET has no zone-abbreviation specifier; "zzz" renders the UTC offset (+02:00).
      return { datetime_format: 'zzz', timezone_id: zone };
    }
    const target = name === 'date' ? 'date' : 'time';
    return {
      datetime_format:
        options.kind === 'time' ? datetimeFormatFor(options, target) : DEFAULT_FORMATS[target],
      timezone_id: zone,
    };
  }
  if (type === 'timespan') {
    return { time_format: DEFAULT_TIMESPAN_FORMAT, include_negative_sign: true };
  }
  if (type === 'progress') {
    const bar = progressOptions(
      options.kind === 'media'
        ? options.progressBar
        : { length: 10, filled: '━', empty: '━', position: '●', start: '┣', end: '┫' },
    );
    // Without the visual bar the Progress variable renders "NN%".
    return name === 'progress_percent' ? { ...bar, use_visual: false } : bar;
  }
  if (name === 'title' && options.kind === 'media' && options.titleMaxLength > 0) {
    return { truncate_length: options.titleMaxLength, include_ellipses: true };
  }
  return {};
}

const DEFAULT_FORMATS = { time: 'HH:mm', date: 'yyyy-MM-dd' } as const;

function resolve(
  name: PlaceholderName,
  part: CompilePart,
  input: CompileInput,
): ResolvedVariable | undefined {
  if (name === 'status') {
    return {
      source: { moduleId: null, variableId: 'text', official: true },
      options: { text: input.statusText },
    };
  }
  const source = pickSource(
    ALIASED_SOURCES[name] ?? name,
    part.options,
    input.officialOnly === true,
  );
  if (source === undefined) {
    return undefined;
  }
  return { source, options: variableOptions(name, source, part.options, input.statusText) };
}

// Private-use characters that cannot occur in a real template.
const SENTINEL = (index: number): string => `\uE000${index}\uE001`;
const SENTINEL_PATTERN = /\uE000(\d+)\uE001/g;

export function compile(input: CompileInput): CompileResult {
  const variables: CompiledVariable[] = [];
  const unsupported: PlaceholderName[] = [];
  const stateless: PlaceholderName[] = [];
  const modules: string[] = [];

  const indexOf = (name: PlaceholderName, resolved: ResolvedVariable): number => {
    const existing = variables.findIndex(
      (candidate) =>
        candidate.module_id === resolved.source.moduleId &&
        candidate.variable_id === resolved.source.variableId &&
        vEqual(candidate.options, resolved.options),
    );
    if (existing >= 0) {
      return existing;
    }
    variables.push({
      module_id: resolved.source.moduleId,
      variable_id: resolved.source.variableId,
      options: resolved.options,
      placeholder: name,
    });
    const moduleId = resolved.source.moduleId;
    if (moduleId !== null && !modules.includes(moduleId)) {
      modules.push(moduleId);
    }
    return variables.length - 1;
  };

  const rendered: string[] = [];
  for (const part of input.parts) {
    const values: TemplateValues = {};
    let placeholders = 0;
    let kept = 0;
    for (const token of parseTemplate(part.template)) {
      if (token.kind !== 'placeholder' || values[token.name] !== undefined) {
        continue;
      }
      placeholders += 1;
      if (token.name === 'play_icon') {
        values[token.name] = PLAY_ICONS[input.mediaState ?? 'playing'];
        kept += 1;
        continue;
      }
      const resolved = resolve(token.name, part, input);
      const moduleId = resolved?.source.moduleId ?? null;
      if (resolved === undefined) {
        values[token.name] = '';
        pushUnique(unsupported, token.name);
      } else if (moduleId !== null && !hasStates(moduleId)) {
        values[token.name] = '';
        pushUnique(stateless, token.name);
      } else {
        values[token.name] = SENTINEL(indexOf(token.name, resolved));
        kept += 1;
      }
    }
    // A segment that lost every placeholder is only decoration: drop it entirely.
    if (placeholders > 0 && kept === 0) {
      continue;
    }
    const text = renderTemplate(part.template, values, { tidyEmpty: true });
    if (text !== '') {
      rendered.push(text);
    }
  }
  const body = rendered.join(input.separator);
  const format = (body === '' ? '' : input.prefix + body + input.suffix).replace(
    SENTINEL_PATTERN,
    (_match, index: string) => `{${index}}`,
  );
  return { format, variables, unsupported, stateless, modules };
}

function pushUnique<T>(list: T[], item: T): void {
  if (!list.includes(item)) {
    list.push(item);
  }
}
