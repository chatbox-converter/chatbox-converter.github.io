import type { PlaceholderName } from '../../model/placeholders';
import type { SegmentOptions } from '../../model/segments';
import {
  parseTemplate,
  placeholdersIn,
  renderTemplate,
  type TemplateValues,
} from '../../model/template';
import { ALIASED_SOURCES, PLAY_ICONS, STATUS_BUILTIN_VARIABLE, type MediaState } from './aliases';
import { MODULES, findModule, findVariable, sourcesFor, type VariableSource } from './catalog';
import type { VrcVariable } from './document';
import { bluscreamModuleId } from './modules-bluscream';
import { DEFAULT_TIMESPAN_FORMAT, datetimeFormatFor, isoToTicks, progressOptions } from './options';
import { STATUS_MODULE_ID } from './status-module';
import { vEqual, type VObject } from './vjson';

/**
 * Turns canonical templates into a VRCOSC format string plus its positional
 * `variables` array: `{artist} - {title}` → `{0} - {1}` with two Media
 * variables. Placeholders VRCOSC cannot provide are removed (with separator
 * tidy) and reported.
 *
 * Sources are chosen per segment ("segment-level module preference"): the
 * module covering the most of the segment's placeholders wins, official
 * modules win ties, and the remaining placeholders are covered the same way,
 * so a heart-rate line using `{heartrate_min}` links only Heartrate Stats and
 * a media line using `{lyrics}` only Linux Media.
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
  /** `{status}` comes from the Bluscream Status module instead of the built-in text variable. */
  readonly statusModule?: boolean;
  /** Skip community modules (only official + built-in sources). */
  readonly officialOnly?: boolean;
  /** Media state of the compound state being compiled; drives the `{play_icon}` literal. */
  readonly mediaState?: MediaState;
}

export type { MediaState } from './aliases';

const LINUX_MEDIA_MODULE = bluscreamModuleId('linuxmediamodule');

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

function hasStates(moduleId: string): boolean {
  return findModule(moduleId)?.mainState !== undefined;
}

/** Sources able to feed a placeholder in this segment, in catalog order. */
function candidateSources(
  name: PlaceholderName,
  options: SegmentOptions,
  officialOnly: boolean,
): VariableSource[] {
  const alias = ALIASED_SOURCES[name];
  const sources =
    alias === undefined ? sourcesFor(name) : [...sourcesFor(name), ...sourcesFor(alias)];
  return sources.filter((source) => {
    if (officialOnly && !source.official) {
      return false;
    }
    if (name === 'timer') {
      // The built-in timer is a countdown (custom segments); anything else is a stopwatch.
      return options.kind === 'custom' ? source.moduleId === null : source.moduleId !== null;
    }
    return true;
  });
}

function moduleRank(moduleId: string | null): number {
  return moduleId === null ? -1 : MODULES.findIndex((module) => module.fullId === moduleId);
}

interface Coverage {
  readonly moduleId: string | null;
  readonly official: boolean;
  readonly count: number;
}

/** Modules (null = built-in) providing a placeholder here, stateless ones excluded. */
function providersOf(
  name: PlaceholderName,
  part: CompilePart,
  officialOnly: boolean,
): VariableSource[] {
  const seen = new Set<string | null>();
  return candidateSources(name, part.options, officialOnly).filter((source) => {
    if (source.moduleId !== null && !hasStates(source.moduleId)) {
      return false;
    }
    if (seen.has(source.moduleId)) {
      return false;
    }
    seen.add(source.moduleId);
    return true;
  });
}

function tallyCoverage(
  uncovered: ReadonlySet<PlaceholderName>,
  part: CompilePart,
  officialOnly: boolean,
): Coverage[] {
  const coverage = new Map<string | null, Coverage>();
  for (const name of uncovered) {
    for (const source of providersOf(name, part, officialOnly)) {
      const current = coverage.get(source.moduleId);
      coverage.set(source.moduleId, {
        moduleId: source.moduleId,
        official: source.official,
        count: (current?.count ?? 0) + 1,
      });
    }
  }
  return [...coverage.values()];
}

/**
 * Greedy set cover over the segment's placeholders: modules ordered by how
 * many still-uncovered placeholders they provide, the segment's preferred
 * heart-rate provider and official modules first among equals.
 */
function planModules(part: CompilePart, officialOnly: boolean): (string | null)[] {
  const preferred = heartrateModule(part.options);
  const prefers = (moduleId: string | null): number =>
    Number(preferred !== undefined && moduleId?.endsWith(`.${preferred}`) === true);
  const uncovered = new Set(
    placeholdersIn(part.template).filter((name) => name !== 'status' && name !== 'play_icon'),
  );
  const chosen: (string | null)[] = [];
  while (uncovered.size > 0) {
    const best = tallyCoverage(uncovered, part, officialOnly).sort(
      (a, b) =>
        b.count - a.count ||
        prefers(b.moduleId) - prefers(a.moduleId) ||
        Number(b.official) - Number(a.official) ||
        moduleRank(a.moduleId) - moduleRank(b.moduleId),
    )[0];
    if (best === undefined) {
      break;
    }
    chosen.push(best.moduleId);
    for (const name of [...uncovered]) {
      if (providersOf(name, part, officialOnly).some((s) => s.moduleId === best.moduleId)) {
        uncovered.delete(name);
      }
    }
  }
  return chosen;
}

/** Among one module's variables for a placeholder, follow the segment's temperature unit. */
function byUnit(
  pool: readonly VariableSource[],
  options: SegmentOptions,
): VariableSource | undefined {
  const suffix = options.kind === 'weather' && options.temperatureUnit === 'F' ? 'f' : 'c';
  return pool.find((source) => source.variableId.endsWith(suffix)) ?? pool[0];
}

function pickSource(
  name: PlaceholderName,
  part: CompilePart,
  chosen: readonly (string | null)[],
  officialOnly: boolean,
): VariableSource | undefined {
  const candidates = candidateSources(name, part.options, officialOnly);
  const alias = ALIASED_SOURCES[name];
  for (const moduleId of chosen) {
    const own = candidates.filter((source) => source.moduleId === moduleId);
    if (own.length === 0) {
      continue;
    }
    // A direct variable (Linux Media `progresspercent`) beats the aliased one of the same module.
    const direct = alias === undefined ? own : own.filter((source) => isDirect(source, name));
    const pool = direct.length > 0 ? direct : own;
    return byUnit(pool, part.options);
  }
  // Nothing chosen covers it (stateless modules only): keep the first for the diagnostic.
  return candidates[0];
}

function isDirect(source: VariableSource, name: PlaceholderName): boolean {
  return findVariable(source.moduleId, source.variableId)?.canonical === name;
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

function statusSource(input: CompileInput): ResolvedVariable {
  if (input.statusModule === true) {
    return {
      source: { moduleId: STATUS_MODULE_ID, variableId: 'text', official: false },
      options: {},
    };
  }
  return {
    source: { moduleId: null, variableId: STATUS_BUILTIN_VARIABLE, official: true },
    options: { text: input.statusText },
  };
}

function resolve(
  name: PlaceholderName,
  part: CompilePart,
  chosen: readonly (string | null)[],
  input: CompileInput,
): ResolvedVariable | undefined {
  if (name === 'status') {
    return statusSource(input);
  }
  const source = pickSource(name, part, chosen, input.officialOnly === true);
  if (source === undefined) {
    return undefined;
  }
  return { source, options: variableOptions(name, source, part.options, input.statusText) };
}

// Private-use characters that cannot occur in a real template.
const SENTINEL = (index: number): string => `${index}`;
const SENTINEL_PATTERN = /(\d+)/g;

class VariableTable {
  readonly variables: CompiledVariable[] = [];
  readonly modules: string[] = [];

  indexOf(name: PlaceholderName, resolved: ResolvedVariable): number {
    const existing = this.variables.findIndex(
      (candidate) =>
        candidate.module_id === resolved.source.moduleId &&
        candidate.variable_id === resolved.source.variableId &&
        vEqual(candidate.options, resolved.options),
    );
    if (existing >= 0) {
      return existing;
    }
    this.variables.push({
      module_id: resolved.source.moduleId,
      variable_id: resolved.source.variableId,
      options: resolved.options,
      placeholder: name,
    });
    const moduleId = resolved.source.moduleId;
    if (moduleId !== null && !this.modules.includes(moduleId)) {
      this.modules.push(moduleId);
    }
    return this.variables.length - 1;
  }
}

function compilePart(
  part: CompilePart,
  input: CompileInput,
  table: VariableTable,
  report: { unsupported: PlaceholderName[]; stateless: PlaceholderName[] },
): string | undefined {
  const chosen = planModules(part, input.officialOnly === true);
  const values: TemplateValues = {};
  let placeholders = 0;
  let kept = 0;
  for (const token of parseTemplate(part.template)) {
    if (token.kind !== 'placeholder' || values[token.name] !== undefined) {
      continue;
    }
    placeholders += 1;
    if (token.name === 'play_icon' && !chosen.includes(LINUX_MEDIA_MODULE)) {
      values[token.name] = PLAY_ICONS[input.mediaState ?? 'playing'];
      kept += 1;
      continue;
    }
    const resolved = resolve(token.name, part, chosen, input);
    const moduleId = resolved?.source.moduleId ?? null;
    if (resolved === undefined) {
      values[token.name] = '';
      pushUnique(report.unsupported, token.name);
    } else if (moduleId !== null && !hasStates(moduleId)) {
      values[token.name] = '';
      pushUnique(report.stateless, token.name);
    } else {
      values[token.name] = SENTINEL(table.indexOf(token.name, resolved));
      kept += 1;
    }
  }
  // A segment that lost every placeholder is only decoration: drop it entirely.
  if (placeholders > 0 && kept === 0) {
    return undefined;
  }
  const text = renderTemplate(part.template, values, { tidyEmpty: true });
  return text === '' ? undefined : text;
}

export function compile(input: CompileInput): CompileResult {
  const table = new VariableTable();
  const report = { unsupported: [] as PlaceholderName[], stateless: [] as PlaceholderName[] };
  const rendered: string[] = [];
  for (const part of input.parts) {
    const text = compilePart(part, input, table, report);
    if (text !== undefined) {
      rendered.push(text);
    }
  }
  const body = rendered.join(input.separator);
  const format = (body === '' ? '' : input.prefix + body + input.suffix).replace(
    SENTINEL_PATTERN,
    (_match, index: string) => `{${index}}`,
  );
  return {
    format,
    variables: table.variables,
    unsupported: report.unsupported,
    stateless: report.stateless,
    modules: table.modules,
  };
}

function pushUnique<T>(list: T[], item: T): void {
  if (!list.includes(item)) {
    list.push(item);
  }
}
