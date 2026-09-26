import type { PlaceholderName } from '../../model/placeholders';
import { activeStatus, type ChatboxProfile } from '../../model/profile';
import { defaultSegmentOptions, type Segment } from '../../model/segments';
import { placeholdersIn } from '../../model/template';
import { DiagnosticCollector, type ConfigFile, type SerializeResult } from '../codec';
import { findModule, officialModuleId, type VrcoscModule } from './catalog';
import { compile, type CompilePart, type MediaState } from './compile';
import {
  DEFAULT_TIMELINE_LENGTH,
  MAX_TIMELINE_LENGTH,
  documentToJson,
  type VrcClip,
  type VrcDocument,
  type VrcState,
} from './document';
import { mergeSerialize } from './merge';
import { finalizeVariable } from './variables';
import { stringifyVJson, type VObject } from './vjson';

/**
 * Profile → VRCOSC. One clip (or one per cycled status) on layer 0 whose main
 * compound state is the whole line; extra compound states cover paused/stopped
 * media, disconnected heart rate, AFK and stopwatch variants.
 */
const AFK_MODULE = officialModuleId('afkdetectionmodule');

/** Non-main states that get their own compound state, keyed by the module's main state. */
const VARIANT_STATES: Readonly<Record<string, readonly string[]>> = {
  playing: ['paused', 'stopped'],
  connected: ['disconnected'],
  notafk: ['afk'],
  started: ['paused', 'stopped'],
};

function variantStates(module: VrcoscModule): readonly string[] {
  return module.mainState === undefined ? [] : (VARIANT_STATES[module.mainState] ?? []);
}

interface ClipPlan {
  readonly linkedModules: readonly string[];
  readonly states: readonly VrcState[];
  readonly unsupported: readonly PlaceholderName[];
  readonly stateless: readonly PlaceholderName[];
}

interface Combination {
  readonly states: Readonly<Record<string, string>>;
}

function combinations(modules: readonly string[]): Combination[] {
  let result: Record<string, string>[] = [{}];
  for (const moduleId of modules) {
    const module = findModule(moduleId);
    if (module?.mainState === undefined) {
      continue;
    }
    const options = [module.mainState, ...variantStates(module)];
    result = result.flatMap((partial) =>
      options.map((stateId) => ({ ...partial, [moduleId]: stateId })),
    );
  }
  return result.map((states) => ({ states }));
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
    if (segment.options.kind === 'media' && module.mainState === 'playing') {
      template =
        stateId === 'paused' ? segment.options.pausedTemplate : segment.options.stoppedTemplate;
    } else if (segment.options.kind === 'heartrate' && stateId === 'disconnected') {
      template = segment.options.disconnectedTemplate;
    } else if (module.mainState === 'started' && stateId === 'stopped') {
      template = '';
    }
  }
  if (combination.states[AFK_MODULE] === 'afk' && segment.kind === 'status') {
    template = profile.afk.template;
  }
  return template === '' ? undefined : { template, options: segment.options };
}

function planClip(
  profile: ChatboxProfile,
  segments: readonly Segment[],
  statusText: string,
): ClipPlan {
  const separator = profile.output.separateWithNewlines ? '\n' : profile.output.separator;
  const base = {
    separator,
    prefix: profile.output.prefix,
    suffix: profile.output.suffix,
    statusText,
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

  const states: VrcState[] = [];
  for (const combination of combinations(linkedModules)) {
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
  return { linkedModules, states, unsupported, stateless };
}

function statusTexts(profile: ChatboxProfile, collector: DiagnosticCollector): string[] {
  const active = activeStatus(profile)?.text ?? '';
  if (!profile.statusCycle.enabled) {
    return [active];
  }
  const cycled = profile.statuses.filter((item) => item.useInCycle);
  const pool = (cycled.length > 0 ? cycled : profile.statuses).map((item) => item.text);
  if (pool.length < 2) {
    return [active];
  }
  if (profile.statusCycle.random) {
    collector.info(
      'cycle-order',
      'VRCOSC plays clips in timeline order; random status cycling is not available.',
    );
  }
  return pool;
}

function moduleFile(moduleId: string, profile: ChatboxProfile): ConfigFile {
  const settings: VObject = {};
  const module = findModule(moduleId);
  if (module?.fullId.endsWith('.datetimemodule') === true) {
    const zone = profile.segments.find(
      (segment): segment is Segment & { options: { kind: 'time'; timezone: string } } =>
        segment.options.kind === 'time' && segment.options.timezone !== '',
    );
    if (zone !== undefined) {
      settings['timezone'] = zone.options.timezone;
    }
  }
  if (module?.fullId.endsWith('.weathermodule') === true) {
    const weather = profile.segments.find((segment) => segment.options.kind === 'weather');
    if (
      weather?.options.kind === 'weather' &&
      weather.options.locationMode === 'city' &&
      weather.options.city !== ''
    ) {
      settings['location'] = weather.options.city;
    }
  }
  return {
    path: `modules/${moduleId}.json`,
    content: stringifyVJson({ version: 1, enabled: true, settings, parameters: {} }),
  };
}

function reportPlan(plan: ClipPlan, profile: ChatboxProfile, collector: DiagnosticCollector): void {
  for (const name of plan.unsupported) {
    collector.unsupported(`Placeholder {${name}}`);
  }
  const templates = profile.segments.filter((s) => s.enabled).map((s) => s.template);
  if (templates.some((template) => placeholdersIn(template).includes('translation'))) {
    collector.info(
      'translation-app-side',
      'VRCOSC translates speech in the app itself (Settings → Speech → Translate); {translation} was mapped to the speech-to-text result, which then already holds the translated text.',
    );
  }
  if (templates.some((template) => placeholdersIn(template).includes('timezone'))) {
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
  const texts = statusTexts(profile, collector);
  let interval = Math.max(1, Math.round(profile.statusCycle.intervalSeconds));
  let clipCount = texts.length;
  if (clipCount > 1 && clipCount * interval > MAX_TIMELINE_LENGTH) {
    const maxClips = Math.floor(MAX_TIMELINE_LENGTH / interval);
    if (maxClips < 2) {
      interval = Math.floor(MAX_TIMELINE_LENGTH / 2);
    }
    clipCount = Math.max(2, Math.min(clipCount, Math.floor(MAX_TIMELINE_LENGTH / interval)));
    collector.warn(
      'statuses-dropped',
      `VRCOSC timelines are at most ${MAX_TIMELINE_LENGTH} s; only the first ${clipCount} cycled statuses fit at ${interval} s each.`,
    );
  }
  const clips: VrcClip[] = [];
  let firstPlan: ClipPlan | undefined;
  for (let index = 0; index < clipCount; index += 1) {
    const plan = planClip(profile, segments, texts[index] ?? '');
    firstPlan ??= plan;
    const single = clipCount === 1;
    clips.push({
      layer: 0,
      enabled: true,
      name: single ? profile.meta.name : `Status ${index + 1}`,
      start: single ? 0 : index * interval,
      end: single ? DEFAULT_TIMELINE_LENGTH : (index + 1) * interval,
      linked_modules: plan.linkedModules,
      states: plan.states,
      events: [],
    });
  }
  const plan = firstPlan ?? { linkedModules: [], states: [], unsupported: [], stateless: [] };
  const document: VrcDocument = {
    version: 1,
    timeline: { length: clipCount === 1 ? DEFAULT_TIMELINE_LENGTH : clipCount * interval, clips },
  };
  reportPlan(plan, profile, collector);
  const files: ConfigFile[] = [
    { path: 'chatbox.json', content: stringifyVJson(documentToJson(document)) },
    ...plan.linkedModules.map((moduleId) => moduleFile(moduleId, profile)),
  ];
  return { files, diagnostics: collector.all() };
}
