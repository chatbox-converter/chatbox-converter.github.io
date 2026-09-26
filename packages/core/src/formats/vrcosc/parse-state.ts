import { PLACEHOLDERS, type PlaceholderName } from '../../model/placeholders';
import {
  DEFAULT_PROGRESS_BAR,
  defaultSegmentOptions,
  isSegmentKind,
  type ProgressBarStyle,
  type Segment,
  type SegmentKind,
  type SegmentOptions,
} from '../../model/segments';
import { placeholdersIn } from '../../model/template';
import type { DiagnosticCollector } from '../codec';
import { findModule, findVariable } from './catalog';
import type { VrcState, VrcVariable } from './document';
import {
  BASE_OPTION_DEFAULTS,
  DEFAULT_DATETIME_FORMAT,
  inspectDateTimePattern,
  readProgressStyle,
  timerTargetFromOptions,
  usesVisualBar,
} from './options';
import { describeVJson, vEqual, vNumber, vString, type VObject } from './vjson';

/**
 * Converts one clip state's `{n}` format into a canonical template and the
 * segment options that can be recovered from its variable options.
 */
export interface StateHints {
  titleMaxLength: number;
  progressBar: ProgressBarStyle;
  use24Hour: boolean;
  showSeconds: boolean;
  timezone: string;
  timerTarget: string;
  filePath: string;
  fahrenheit: boolean;
  /** Module FullIDs whose variables the state uses. */
  modules: string[];
  /** True when the state only consists of literal text (built-in `text` variables). */
  pureText: boolean;
  /** Values of the built-in `text` variables, to recognise status lines. */
  textValues: string[];
}

export interface ConvertedState {
  readonly template: string;
  readonly hints: StateHints;
}

/** Module settings the parser reads from `modules/*.json`, keyed by FullID. */
export type ModuleSettings = ReadonlyMap<string, VObject>;

function shortModuleId(fullId: string): string {
  return fullId.slice(fullId.lastIndexOf('.') + 1);
}

function noteBaseOptions(
  variable: VrcVariable,
  isTitle: boolean,
  collector: DiagnosticCollector,
  path: string,
): void {
  const notModelled: string[] = [];
  for (const key of Object.keys(BASE_OPTION_DEFAULTS)) {
    if (key === 'truncate_length' && isTitle) {
      continue;
    }
    if (key === 'include_ellipses' && isTitle) {
      continue;
    }
    const value = variable.options[key];
    if (value !== undefined && !vEqual(value, BASE_OPTION_DEFAULTS[key])) {
      notModelled.push(`${key}=${describeVJson(value)}`);
    }
  }
  if (notModelled.length > 0) {
    collector.info(
      'option-not-modelled',
      `Variable "${variable.variable_id}" uses ${notModelled.join(', ')}; text styling options are not modelled and only survive a VRCOSC→VRCOSC round trip.`,
      path,
    );
  }
}

function builtInReplacement(
  variable: VrcVariable,
  hints: StateHints,
  collector: DiagnosticCollector,
  path: string,
): string {
  switch (variable.variable_id) {
    case 'text': {
      const text = vString(variable.options['text'], '');
      hints.textValues.push(text);
      return text;
    }
    case 'timer':
      hints.timerTarget = timerTargetFromOptions(variable.options) ?? hints.timerTarget;
      return '{timer}';
    case 'filereader':
      hints.filePath = vString(variable.options['file_location'], hints.filePath);
      return '{file_text}';
    case 'focusedwindow':
      return '{window_title}';
    default:
      collector.warn(
        'unknown-variable',
        `Built-in variable "${variable.variable_id}" has no canonical placeholder; kept as literal text.`,
        path,
      );
      return `{builtin:${variable.variable_id}}`;
  }
}

function applyVariableHints(
  variable: VrcVariable,
  canonical: PlaceholderName,
  hints: StateHints,
  settings: VObject,
): PlaceholderName {
  const type = findVariable(variable.module_id, variable.variable_id)?.type;
  if (canonical === 'title') {
    const truncate = vNumber(variable.options['truncate_length'], -1);
    hints.titleMaxLength = truncate > 0 ? truncate : 0;
  }
  if (type === 'progress') {
    hints.progressBar = readProgressStyle(variable.options);
    if (!usesVisualBar(variable.options)) {
      return 'progress_percent';
    }
  }
  if (type === 'datetime') {
    const pattern = vString(variable.options['datetime_format'], DEFAULT_DATETIME_FORMAT);
    const info = inspectDateTimePattern(pattern);
    hints.use24Hour = info.use24Hour;
    hints.showSeconds = info.showSeconds;
    const zone = vString(variable.options['timezone_id'], '');
    hints.timezone = zone !== '' ? zone : vString(settings['timezone'], '');
    if (canonical === 'time' && info.dateOnly) {
      return 'date';
    }
  }
  if (variable.variable_id === 'tempf') {
    hints.fahrenheit = true;
  }
  return canonical;
}

function moduleReplacement(
  variable: VrcVariable,
  moduleId: string,
  hints: StateHints,
  context: { collector: DiagnosticCollector; path: string; settings: ModuleSettings },
): string {
  const module = findModule(moduleId);
  const definition = module?.variables[variable.variable_id];
  const literal = `{${shortModuleId(moduleId)}:${variable.variable_id}}`;
  if (module === undefined) {
    context.collector.warn(
      'unknown-module',
      `Module "${moduleId}" is not in the catalog; its variable "${variable.variable_id}" was kept as literal text ${literal}.`,
      context.path,
    );
    return literal;
  }
  if (!hints.modules.includes(moduleId)) {
    hints.modules.push(moduleId);
  }
  if (definition?.canonical === undefined) {
    context.collector.warn(
      'unmapped-variable',
      `${module.title} variable "${variable.variable_id}" has no canonical placeholder; kept as literal text ${literal}.`,
      context.path,
    );
    return literal;
  }
  const name = applyVariableHints(
    variable,
    definition.canonical,
    hints,
    context.settings.get(moduleId) ?? {},
  );
  return `{${name}}`;
}

export function convertState(
  state: VrcState,
  context: { collector: DiagnosticCollector; path: string; settings: ModuleSettings },
): ConvertedState {
  const hints: StateHints = {
    titleMaxLength: 0,
    progressBar: DEFAULT_PROGRESS_BAR,
    use24Hour: true,
    showSeconds: false,
    timezone: '',
    timerTarget: '',
    filePath: '',
    fahrenheit: false,
    modules: [],
    pureText: true,
    textValues: [],
  };
  let text = state.format;
  state.variables.forEach((variable, index) => {
    const isText = variable.module_id === null && variable.variable_id === 'text';
    if (!isText) {
      hints.pureText = false;
    }
    const replacement =
      variable.module_id === null
        ? builtInReplacement(variable, hints, context.collector, context.path)
        : moduleReplacement(variable, variable.module_id, hints, context);
    noteBaseOptions(
      variable,
      replacement === '{title}',
      context.collector,
      `${context.path}.variables[${index}]`,
    );
    // VRCOSC does a sequential ordinal `string.Replace` per variable index.
    text = text.split(`{${index}}`).join(replacement);
  });
  return { template: text, hints };
}

/** Segment kind for one template line: the single shared category, else `custom`. */
export function kindOfTemplate(template: string): SegmentKind {
  const categories = new Set(placeholdersIn(template).map((name) => PLACEHOLDERS[name].category));
  if (categories.size !== 1) {
    return 'custom';
  }
  const [category] = categories;
  return category !== undefined && isSegmentKind(category) ? category : 'custom';
}

export function optionsFor(kind: SegmentKind, hints: StateHints, city: string): SegmentOptions {
  const defaults = defaultSegmentOptions(kind);
  if (defaults.kind === 'media') {
    return {
      ...defaults,
      pausedTemplate: '',
      titleMaxLength: hints.titleMaxLength,
      progressBar: hints.progressBar,
    };
  }
  if (defaults.kind === 'time') {
    return {
      ...defaults,
      use24Hour: hints.use24Hour,
      showSeconds: hints.showSeconds,
      timezone: hints.timezone,
    };
  }
  if (defaults.kind === 'weather') {
    return { ...defaults, temperatureUnit: hints.fahrenheit ? 'F' : 'C', city };
  }
  if (defaults.kind === 'heartrate') {
    return { ...defaults, provider: heartrateProvider(hints.modules) };
  }
  if (defaults.kind === 'custom') {
    return { ...defaults, timerTarget: hints.timerTarget, filePath: hints.filePath };
  }
  return defaults;
}

function heartrateProvider(modules: readonly string[]): 'pulsoid' | 'hyperate' | 'bluetooth' {
  if (modules.some((id) => id.endsWith('.hyperatemodule'))) {
    return 'hyperate';
  }
  if (modules.some((id) => id.endsWith('.bluetoothheartratemodule'))) {
    return 'bluetooth';
  }
  return 'pulsoid';
}

export function makeSegment(
  id: string,
  template: string,
  hints: StateHints,
  city: string,
  enabled: boolean,
): Segment {
  const kind = kindOfTemplate(template);
  return {
    id,
    kind,
    enabled,
    visibility: { desktop: true, vr: true },
    template,
    options: optionsFor(kind, hints, city),
  };
}
