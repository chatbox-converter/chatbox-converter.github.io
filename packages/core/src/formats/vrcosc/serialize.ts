import type { PlaceholderName } from '../../model/placeholders';
import { activeStatus, type ChatboxProfile } from '../../model/profile';
import { defaultSegmentOptions, type Segment } from '../../model/segments';
import { DiagnosticCollector, type ConfigFile, type SerializeResult } from '../codec';
import { findModule, officialModuleId, type VrcoscModule } from './catalog';
import { compile, type CompilePart, type MediaState } from './compile';
import {
  DEFAULT_TIMELINE_LENGTH,
  documentToJson,
  type VrcClip,
  type VrcDocument,
  type VrcState,
} from './document';
import { mergeSerialize } from './merge';
import { bluscreamModuleId } from './modules-bluscream';
import { STATUS_MODULE_ID, needsStatusModule, statusModuleSettings } from './status-module';
import { finalizeVariable } from './variables';
import { stringifyVJson, type VObject } from './vjson';

/**
 * Profile → VRCOSC. One clip on layer 0 whose main compound state is the whole
 * line; every other state of every linked module gets its own compound state
 * (VRCOSC hides the clip when the running modules' states match none), with
 * the segment swapped for its paused/stopped/disconnected template or hidden.
 */
const AFK_MODULE = officialModuleId('afkdetectionmodule');
const LINUX_AUDIO_FX_MODULE = bluscreamModuleId('linuxaudiofxmodule');
/** Above this many compound states only single-variant combinations are written. */
const MAX_COMPOUND_STATES = 512;

interface ClipPlan {
  readonly linkedModules: readonly string[];
  readonly states: readonly VrcState[];
  readonly unsupported: readonly PlaceholderName[];
  readonly stateless: readonly PlaceholderName[];
  /** Placeholders the clip realises through a converter-side alias. */
  readonly aliased: readonly PlaceholderName[];
  readonly truncated: boolean;
}

interface Combination {
  readonly states: Readonly<Record<string, string>>;
}

interface StatefulModule {
  readonly id: string;
  readonly main: string;
  readonly variants: readonly string[];
}

function statefulModules(modules: readonly string[]): StatefulModule[] {
  const result: StatefulModule[] = [];
  for (const id of modules) {
    const module = findModule(id);
    if (module?.mainState === undefined) {
      continue;
    }
    const main = module.mainState;
    result.push({ id, main, variants: Object.keys(module.states).filter((s) => s !== main) });
  }
  return result;
}

/** Every state of every linked module; past the cap, at most one module leaves its main state. */
function combinations(modules: readonly string[]): { list: Combination[]; truncated: boolean } {
  const stateful = statefulModules(modules);
  const product = stateful.reduce((total, module) => total * (module.variants.length + 1), 1);
  const mains: Record<string, string> = {};
  for (const module of stateful) {
    mains[module.id] = module.main;
  }
  if (product <= MAX_COMPOUND_STATES) {
    let result: Record<string, string>[] = [{}];
    for (const module of stateful) {
      result = result.flatMap((partial) =>
        [module.main, ...module.variants].map((stateId) => ({ ...partial, [module.id]: stateId })),
      );
    }
    return { list: result.map((states) => ({ states })), truncated: false };
  }
  const list: Combination[] = [{ states: mains }];
  for (const module of stateful) {
    for (const stateId of module.variants) {
      list.push({ states: { ...mains, [module.id]: stateId } });
    }
  }
  return { list, truncated: true };
}

/** The media module's state in this combination, if one is linked. */
function mediaStateOf(combination: Combination): MediaState {
  for (const [moduleId, stateId] of Object.entries(combination.states)) {
    if (findModule(moduleId)?.mainState === 'playing') {
      return stateId === 'paused' || stateId === 'stopped' ? stateId : 'playing';
    }
  }
  return 'playing';
}

/**
 * Template of a segment while one of its modules is in a non-main state:
 * a specific template for the modelled variants, `undefined` when the state
 * renders like the main one, `''` (segment hidden) for everything else.
 */
function variantTemplate(
  segment: Segment,
  module: VrcoscModule,
  stateId: string,
): string | undefined {
  const { options } = segment;
  if (module.mainState === 'playing') {
    const lower = stateId.toLowerCase();
    if (lower.startsWith('playing')) {
      return undefined;
    }
    if (options.kind !== 'media') {
      return '';
    }
    return lower.startsWith('paused') ? options.pausedTemplate : options.stoppedTemplate;
  }
  if (
    module.mainState === 'connected' &&
    stateId === 'disconnected' &&
    options.kind === 'heartrate'
  ) {
    return options.disconnectedTemplate;
  }
  if (module.mainState === 'started') {
    return stateId === 'stopped' ? '' : undefined;
  }
  if (module.fullId === LINUX_AUDIO_FX_MODULE || module.fullId === AFK_MODULE) {
    return undefined;
  }
  return '';
}

function segmentPartFor(
  segment: Segment,
  segmentModules: readonly string[],
  combination: Combination,
  profile: ChatboxProfile,
): CompilePart | undefined {
  let template = segment.template;
  for (const moduleId of segmentModules) {
    const stateId = combination.states[moduleId];
    const module = findModule(moduleId);
    if (stateId === undefined || module?.mainState === undefined || stateId === module.mainState) {
      continue;
    }
    template = variantTemplate(segment, module, stateId) ?? template;
  }
  if (combination.states[AFK_MODULE] === 'afk' && segment.kind === 'status') {
    template = profile.afk.template;
  }
  return template === '' ? undefined : { template, options: segment.options };
}

function planClip(profile: ChatboxProfile, segments: readonly Segment[]): ClipPlan {
  const separator = profile.output.separateWithNewlines ? '\n' : profile.output.separator;
  const base = {
    separator,
    prefix: profile.output.prefix,
    suffix: profile.output.suffix,
    statusText: activeStatus(profile)?.text ?? '',
    statusModule: needsStatusModule(profile),
  };
  const segmentModules = segments.map(
    (segment) =>
      compile({ ...base, parts: [{ template: segment.template, options: segment.options }] })
        .modules,
  );
  const main = compile({
    ...base,
    parts: segments.map((segment) => ({ template: segment.template, options: segment.options })),
  });
  const linkedModules = [...main.modules];
  const afkPart: CompilePart = {
    template: profile.afk.template,
    options: defaultSegmentOptions('custom'),
  };
  const afkCompiled = profile.afk.enabled ? compile({ ...base, parts: [afkPart] }) : undefined;
  if (profile.afk.enabled) {
    for (const moduleId of [AFK_MODULE, ...(afkCompiled?.modules ?? [])]) {
      if (!linkedModules.includes(moduleId)) {
        linkedModules.push(moduleId);
      }
    }
  }
  const unsupported = [...main.unsupported, ...(afkCompiled?.unsupported ?? [])];
  const stateless = [...main.stateless, ...(afkCompiled?.stateless ?? [])];
  const aliased = [...main.aliased, ...(afkCompiled?.aliased ?? [])];

  const states: VrcState[] = [];
  const { list, truncated } = combinations(linkedModules);
  for (const combination of list) {
    const afkEverything = combination.states[AFK_MODULE] === 'afk' && profile.afk.replaceEverything;
    const parts = afkEverything
      ? [afkPart]
      : segments
          .map((segment, index) =>
            segmentPartFor(segment, segmentModules[index] ?? [], combination, profile),
          )
          .filter((part): part is CompilePart => part !== undefined);
    const compiled = compile({ ...base, parts, mediaState: mediaStateOf(combination) });
    if (compiled.format === '') {
      continue;
    }
    // Dictionary keys in `linked_modules` order: VRCOSC compares them with `SequenceEqual`.
    const dictionary: Record<string, string> = {};
    for (const moduleId of linkedModules) {
      const stateId = combination.states[moduleId];
      if (stateId !== undefined) {
        dictionary[moduleId] = stateId;
      }
    }
    states.push({
      enabled: true,
      format: compiled.format,
      show_typing: false,
      use_minimal_background: profile.output.minimalBackground,
      variables: compiled.variables.map(finalizeVariable),
      states: linkedModules.length === 0 ? null : dictionary,
    });
  }
  return { linkedModules, states, unsupported, stateless, aliased, truncated };
}

function moduleSettings(moduleId: string, profile: ChatboxProfile): VObject {
  const settings: VObject = {};
  if (moduleId === STATUS_MODULE_ID) {
    return statusModuleSettings(profile);
  }
  if (moduleId.endsWith('.datetimemodule')) {
    const zone = profile.segments.find(
      (segment): segment is Segment & { options: { kind: 'time'; timezone: string } } =>
        segment.options.kind === 'time' && segment.options.timezone !== '',
    );
    if (zone !== undefined) {
      settings['timezone'] = zone.options.timezone;
    }
  }
  if (moduleId.endsWith('.heartratestatsmodule')) {
    // `HeartrateProvider`: 0 Pulsoid (default), 1 HypeRate, 2 Osc.
    const heart = profile.segments.find((segment) => segment.options.kind === 'heartrate');
    if (heart?.options.kind === 'heartrate' && heart.options.provider === 'hyperate') {
      settings['provider'] = 1;
    }
  }
  if (moduleId.endsWith('.weathermodule') || moduleId.endsWith('.openmeteoweathermodule')) {
    const weather = profile.segments.find((segment) => segment.options.kind === 'weather');
    if (
      weather?.options.kind === 'weather' &&
      weather.options.locationMode === 'city' &&
      weather.options.city !== ''
    ) {
      settings['location'] = weather.options.city;
    }
  }
  return settings;
}

function moduleFile(moduleId: string, profile: ChatboxProfile): ConfigFile {
  const settings = moduleSettings(moduleId, profile);
  return {
    path: `modules/${moduleId}.json`,
    content: stringifyVJson({ version: 1, enabled: true, settings, parameters: {} }),
  };
}

function reportPlan(plan: ClipPlan, profile: ChatboxProfile, collector: DiagnosticCollector): void {
  for (const name of plan.unsupported) {
    collector.unsupported(`Placeholder {${name}}`);
  }
  if (plan.aliased.includes('translation')) {
    collector.info(
      'translation-app-side',
      'VRCOSC translates speech in the app itself (Settings → Speech → Translate); {translation} was mapped to the speech-to-text result, which then already holds the translated text.',
    );
  }
  if (plan.aliased.includes('timezone')) {
    collector.info(
      'timezone-offset',
      '{timezone} is rendered as the UTC offset (e.g. +02:00); .NET date formats have no zone abbreviation.',
    );
  }
  for (const name of plan.stateless) {
    collector.warn(
      'stateless-module',
      `Placeholder {${name}} is only provided by a module that registers no ChatBox states; VRCOSC never shows a clip linked to such a module, so the placeholder was dropped.`,
    );
  }
  if (plan.truncated) {
    collector.warn(
      'too-many-states',
      `The linked modules have more than ${MAX_COMPOUND_STATES} state combinations; only the states where at most one module leaves its main state were written, so the clip hides when several modules are idle at once.`,
    );
  }
  if (profile.segments.some((segment) => segment.visibility.desktop !== segment.visibility.vr)) {
    collector.info(
      'visibility',
      'VRCOSC cannot show different segments on desktop and in VR; the union is used.',
    );
  }
  if (profile.afk.enabled) {
    collector.info(
      'afk-timeout',
      'VRCOSC detects AFK from VRChat/SteamVR itself; the AFK timeout is not configurable.',
    );
  }
  if (plan.linkedModules.includes(STATUS_MODULE_ID)) {
    const module = findModule(STATUS_MODULE_ID);
    collector.info(
      'status-module',
      `The status list (${profile.statuses.length} statuses${profile.statusCycle.enabled ? ', cycling' : ''}) is written to modules/${STATUS_MODULE_ID}.json for the ${module?.title ?? 'Status'} module of ${module?.packageId ?? ''}; install that package (${module?.repository ?? ''}) so {status} resolves.`,
    );
  }
  reportPackages(plan, collector);
}

function reportPackages(plan: ClipPlan, collector: DiagnosticCollector): void {
  const packages = new Map<string, VrcoscModule>();
  for (const moduleId of plan.linkedModules) {
    const module = findModule(moduleId);
    if (module !== undefined && !packages.has(module.packageId)) {
      packages.set(module.packageId, module);
    }
  }
  const list = [...packages.values()].map((module) => `${module.packageId} (${module.repository})`);
  collector.info(
    'import-instructions',
    `In VRCOSC open ChatBox → Import and pick chatbox.json; copy modules/*.json into %APPDATA%\\VRCOSC\\profiles\\<profile>\\modules\\ or enable the modules by hand.${list.length > 0 ? ` Required packages: ${list.join(', ')}.` : ''}`,
  );
  for (const module of packages.values()) {
    if (!module.official) {
      collector.info(
        'community-module',
        `${module.title} comes from the community package ${module.packageId}; install it from ${module.repository} before importing.`,
      );
    }
  }
}

export function serializeVrcosc(profile: ChatboxProfile): SerializeResult {
  const collector = new DiagnosticCollector();
  const merged = mergeSerialize(profile, collector);
  if (merged !== undefined) {
    return { files: merged, diagnostics: collector.all() };
  }
  const segments = profile.segments.filter((segment) => segment.enabled);
  const plan = planClip(profile, segments);
  const clip: VrcClip = {
    layer: 0,
    enabled: true,
    name: profile.meta.name,
    start: 0,
    end: DEFAULT_TIMELINE_LENGTH,
    linked_modules: plan.linkedModules,
    states: plan.states,
    events: [],
  };
  const document: VrcDocument = {
    version: 1,
    timeline: { length: DEFAULT_TIMELINE_LENGTH, clips: [clip] },
  };
  reportPlan(plan, profile, collector);
  const files: ConfigFile[] = [
    { path: 'chatbox.json', content: stringifyVJson(documentToJson(document)) },
    ...plan.linkedModules.map((moduleId) => moduleFile(moduleId, profile)),
  ];
  return { files, diagnostics: collector.all() };
}
