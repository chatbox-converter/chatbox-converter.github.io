import {
  createStatusItem,
  type AfkSettings,
  type ChatboxProfile,
  type StatusCycle,
  type StatusItem,
} from '../../model/profile';
import type { Segment } from '../../model/segments';
import { ConfigParseError, DiagnosticCollector, type ConfigFile, type ParseResult } from '../codec';
import { findModule } from './catalog';
import {
  isChatboxDocument,
  readDocument,
  type VrcClip,
  type VrcDocument,
  type VrcState,
} from './document';
import { placeholdersIn } from '../../model/template';
import {
  convertState,
  kindOfTemplate,
  makeSegment,
  type ModuleSettings,
  type StateHints,
} from './parse-state';
import { isVObject, parseVJson, vBoolean, vNumber, vObject, vString, type VObject } from './vjson';

/** What the parser keeps in `profile.extras.vrcosc` so a VRCOSC→VRCOSC round trip is lossless. */
export interface StateMapping {
  readonly clip: number;
  readonly state: number;
  readonly segmentIds: readonly string[];
  /** `JSON.stringify({template, options})` per segment at parse time, to detect edits. */
  readonly signatures: readonly string[];
}

export interface VrcoscExtras {
  readonly chatbox: string;
  readonly chatboxPath: string;
  readonly modules: Readonly<Record<string, string>>;
  readonly states: readonly StateMapping[];
  readonly afk?: { readonly clip: number; readonly state: number };
}

const MODULE_FILE = /(?:^|[\\/])modules[\\/]([^\\/]+)\.json$/i;

export function findChatboxFile(files: readonly ConfigFile[]): ConfigFile | undefined {
  const byName = files.find((file) => /(?:^|[\\/])chatbox\.json$/i.test(file.path));
  if (byName !== undefined) {
    return byName;
  }
  return files.find((file) => {
    if (!file.path.toLowerCase().endsWith('.json')) {
      return false;
    }
    try {
      return isChatboxDocument(parseVJson(file.content, file.path));
    } catch {
      return false;
    }
  });
}

export function findModuleFiles(files: readonly ConfigFile[]): Map<string, ConfigFile> {
  const result = new Map<string, ConfigFile>();
  for (const file of files) {
    const match = MODULE_FILE.exec(file.path);
    if (match?.[1] !== undefined) {
      result.set(match[1], file);
    }
  }
  return result;
}

interface ParsedModule {
  readonly enabled: boolean;
  readonly settings: VObject;
}

function readModuleFile(
  file: ConfigFile,
  collector: DiagnosticCollector,
): ParsedModule | undefined {
  try {
    const json = parseVJson(file.content, file.path);
    if (!isVObject(json)) {
      return undefined;
    }
    return { enabled: vBoolean(json['enabled'], true), settings: vObject(json['settings']) };
  } catch (error) {
    collector.warn(
      'unreadable-file',
      error instanceof Error ? error.message : String(error),
      file.path,
    );
    return undefined;
  }
}

interface GlobalSettings {
  readonly sendIntervalSeconds: number;
  readonly host: string;
  readonly port: number;
}

function readGlobalSettings(
  files: readonly ConfigFile[],
  collector: DiagnosticCollector,
): GlobalSettings {
  const defaults: GlobalSettings = { sendIntervalSeconds: 1.5, host: '127.0.0.1', port: 9000 };
  const file = files.find((candidate) => /configuration[\\/]settings\.json$/i.test(candidate.path));
  if (file === undefined) {
    return defaults;
  }
  try {
    const settings = vObject(vObject(parseVJson(file.content, file.path))['settings']);
    const endpoint = vString(settings['OutgoingEndpoint'], `${defaults.host}:${defaults.port}`);
    const colon = endpoint.lastIndexOf(':');
    const host = colon > 0 ? endpoint.slice(0, colon) : defaults.host;
    const port = colon > 0 ? Number(endpoint.slice(colon + 1)) : defaults.port;
    return {
      sendIntervalSeconds: vNumber(settings['ChatBoxSendInterval'], 1500) / 1000,
      host,
      port: Number.isInteger(port) && port > 0 && port < 65536 ? port : defaults.port,
    };
  } catch (error) {
    collector.warn(
      'unreadable-file',
      error instanceof Error ? error.message : String(error),
      file.path,
    );
    return defaults;
  }
}

interface StateRole {
  readonly moduleId: string;
  readonly stateId: string;
}

/** Modules whose state in this dictionary is not their main state. */
function variantsOf(state: VrcState): StateRole[] {
  const variants: StateRole[] = [];
  for (const [moduleId, stateId] of Object.entries(state.states ?? {})) {
    const main = findModule(moduleId)?.mainState;
    if (main !== undefined && stateId !== main) {
      variants.push({ moduleId, stateId });
    }
  }
  return variants;
}

interface DeferredState {
  readonly state: VrcState;
  readonly index: number;
  readonly variants: readonly StateRole[];
}

interface PrimaryState {
  readonly index: number;
  readonly keys: string;
  readonly lines: readonly string[];
  readonly segments: Segment[];
}

interface StatusClip {
  readonly layer: number;
  readonly start: number;
  readonly end: number;
}

class ProfileBuilder {
  readonly segments: Segment[] = [];
  readonly statuses: StatusItem[] = [];
  readonly statusClips: StatusClip[] = [];
  readonly mappings: StateMapping[] = [];
  readonly notes: string[] = [];
  afk: AfkSettings = {
    enabled: false,
    timeoutSeconds: 120,
    template: '💤 AFK for {afk_duration}',
    replaceEverything: false,
  };
  afkMapping: { clip: number; state: number } | undefined;
  minimalBackground = false;
  hasStatusSegment = false;

  constructor(
    readonly collector: DiagnosticCollector,
    readonly settings: ModuleSettings,
    readonly path: string,
  ) {}

  city(): string {
    for (const [moduleId, settings] of this.settings) {
      if (moduleId.endsWith('.weathermodule')) {
        return vString(settings['location'], '');
      }
    }
    return '';
  }

  addClip(clip: VrcClip, clipIndex: number): void {
    this.notes.push(`Clip '${clip.name}' ${clip.start}–${clip.end} s on layer ${clip.layer}`);
    if (clip.events.some((event) => event.enabled)) {
      this.collector.info(
        'events-not-modelled',
        `Clip '${clip.name}' has enabled events (${clip.events
          .filter((event) => event.enabled)
          .map((event) => event.event_id)
          .join(', ')}); events are not modelled and only survive a VRCOSC→VRCOSC round trip.`,
        `${this.path}.clips[${clipIndex}].events`,
      );
    }
    const primaries: PrimaryState[] = [];
    const deferred: DeferredState[] = [];
    clip.states.forEach((state, stateIndex) => {
      if (!state.enabled) {
        return;
      }
      this.minimalBackground ||= state.use_minimal_background;
      const variants = variantsOf(state);
      if (variants.length === 0) {
        const primary = this.addPrimary(clip, clipIndex, state, stateIndex);
        if (primary !== undefined) {
          primaries.push(primary);
        }
      } else {
        deferred.push({ state, index: stateIndex, variants });
      }
    });
    for (const entry of deferred) {
      this.addVariant(clip, clipIndex, entry, primaries);
    }
  }

  private statePath(clipIndex: number, stateIndex: number): string {
    return `${this.path}.clips[${clipIndex}].states[${stateIndex}]`;
  }

  private addPrimary(
    clip: VrcClip,
    clipIndex: number,
    state: VrcState,
    stateIndex: number,
  ): PrimaryState | undefined {
    const path = this.statePath(clipIndex, stateIndex);
    const { template, hints } = convertState(state, {
      collector: this.collector,
      path,
      settings: this.settings,
    });
    const keys = Object.keys(state.states ?? {}).join('|');
    if (hints.pureText) {
      const statusSegment = this.addStatus(
        clip,
        template,
        `vrcosc-c${clipIndex}-s${stateIndex}-l0`,
      );
      if (statusSegment !== undefined) {
        this.segments.push(statusSegment);
      }
      const segmentIds = statusSegment === undefined ? [] : [statusSegment.id];
      this.mappings.push({
        clip: clipIndex,
        state: stateIndex,
        segmentIds,
        signatures: statusSegment === undefined ? [] : [signatureOf(statusSegment)],
      });
      return undefined;
    }
    const lines = template.split('\n');
    const segments: Segment[] = [];
    let run: string[] = [];
    const flush = (): void => {
      for (const group of groupLines(run)) {
        const id = `vrcosc-c${clipIndex}-s${stateIndex}-l${segments.length}`;
        segments.push(makeSegment(id, group.join('\n'), hints, this.city(), true));
      }
      run = [];
    };
    for (const line of lines) {
      if (hints.textValues.includes(line) && line.trim() !== '') {
        flush();
        const statusSegment = this.addStatus(
          clip,
          line,
          `vrcosc-c${clipIndex}-s${stateIndex}-l${segments.length}`,
        );
        if (statusSegment !== undefined) {
          segments.push(statusSegment);
        }
      } else {
        run.push(line);
      }
    }
    flush();
    this.segments.push(...segments);
    this.mappings.push({
      clip: clipIndex,
      state: stateIndex,
      segmentIds: segments.map((segment) => segment.id),
      signatures: segments.map(signatureOf),
    });
    return { index: stateIndex, keys, lines, segments };
  }

  /** Register a status text; returns the `{status}` segment when it is created here. */
  private addStatus(clip: VrcClip, text: string, segmentId: string): Segment | undefined {
    if (!this.statuses.some((item) => item.text === text)) {
      this.statuses.push(
        createStatusItem(text, {
          id: `vrcosc-status-${this.statuses.length}`,
          active: this.statuses.length === 0,
          useInCycle: true,
        }),
      );
      this.statusClips.push({ layer: clip.layer, start: clip.start, end: clip.end });
    }
    if (this.hasStatusSegment) {
      return undefined;
    }
    this.hasStatusSegment = true;
    const segment: Segment = {
      id: segmentId,
      kind: 'status',
      enabled: true,
      visibility: { desktop: true, vr: true },
      template: '{status}',
      options: { kind: 'status' },
    };
    return segment;
  }

  private addVariant(
    clip: VrcClip,
    clipIndex: number,
    entry: DeferredState,
    primaries: readonly PrimaryState[],
  ): void {
    const { state, index: stateIndex, variants } = entry;
    const path = this.statePath(clipIndex, stateIndex);
    const keys = Object.keys(state.states ?? {}).join('|');
    const primary = primaries.find((candidate) => candidate.keys === keys);
    const [variant] = variants;
    if (variant === undefined || variants.length > 1) {
      this.collector.info(
        'state-not-modelled',
        `Clip '${clip.name}' state {${variants.map((v) => `${v.moduleId}: ${v.stateId}`).join(', ')}} combines several non-default module states; it is preserved only for a VRCOSC→VRCOSC round trip.`,
        path,
      );
      return;
    }
    const converted = convertState(state, {
      collector: this.collector,
      path,
      settings: this.settings,
    });
    const shortId = variant.moduleId.slice(variant.moduleId.lastIndexOf('.') + 1);
    const lines = converted.template.split('\n');
    const own =
      primary === undefined ? lines : lines.filter((line) => !primary.lines.includes(line));
    const template = own.join('\n');
    if (shortId === 'afkdetectionmodule' && variant.stateId === 'afk') {
      this.afk = {
        ...this.afk,
        enabled: true,
        template,
        replaceEverything: primary === undefined || own.length === lines.length,
      };
      this.afkMapping ??= { clip: clipIndex, state: stateIndex };
      return;
    }
    if (primary !== undefined && this.applyVariantTemplate(primary, variant.stateId, template)) {
      return;
    }
    if (primary === undefined) {
      this.addPrimary(clip, clipIndex, state, stateIndex);
      this.collector.info(
        'state-without-main',
        `Clip '${clip.name}' only enables the "${variant.stateId}" state of ${shortId}; it was imported as a normal segment.`,
        path,
      );
      return;
    }
    this.collector.info(
      'state-not-modelled',
      `Clip '${clip.name}' state "${variant.stateId}" of ${shortId} is not modelled; it is preserved only for a VRCOSC→VRCOSC round trip.`,
      path,
    );
  }

  /** Store a paused/stopped/disconnected template on the primary's matching segments. */
  private applyVariantTemplate(primary: PrimaryState, stateId: string, template: string): boolean {
    let applied = false;
    for (const [index, segment] of primary.segments.entries()) {
      let replacement: Segment | undefined;
      if (segment.options.kind === 'media' && (stateId === 'paused' || stateId === 'stopped')) {
        const key = stateId === 'paused' ? 'pausedTemplate' : 'stoppedTemplate';
        replacement = { ...segment, options: { ...segment.options, [key]: template } };
      } else if (segment.options.kind === 'heartrate' && stateId === 'disconnected') {
        replacement = {
          ...segment,
          options: { ...segment.options, disconnectedTemplate: template },
        };
      }
      if (replacement !== undefined) {
        applied = true;
        primary.segments[index] = replacement;
        const position = this.segments.findIndex((candidate) => candidate.id === segment.id);
        if (position >= 0) {
          this.segments[position] = replacement;
        }
      }
    }
    if (applied) {
      this.refreshSignatures(primary);
    }
    return applied;
  }

  private refreshSignatures(primary: PrimaryState): void {
    const position = this.mappings.findIndex(
      (mapping) =>
        mapping.state === primary.index &&
        mapping.segmentIds.length === primary.segments.length &&
        mapping.segmentIds[0] === primary.segments[0]?.id,
    );
    const mapping = this.mappings[position];
    if (mapping !== undefined) {
      this.mappings[position] = { ...mapping, signatures: primary.segments.map(signatureOf) };
    }
  }

  statusCycle(): StatusCycle {
    const disabled: StatusCycle = { enabled: false, intervalSeconds: 10, random: false };
    if (this.statusClips.length < 2) {
      return disabled;
    }
    const [first] = this.statusClips;
    if (first === undefined || !this.statusClips.every((clip) => clip.layer === first.layer)) {
      return disabled;
    }
    const interval = Math.min(
      ...this.statusClips.map((clip) => Math.max(1, clip.end - clip.start)),
    );
    return { enabled: true, intervalSeconds: interval, random: false };
  }
}

/**
 * Consecutive lines of one category form one segment ("🎵 {artist}\n{position}/{duration}"
 * stays together); lines without placeholders attach to their neighbour.
 */
export function groupLines(lines: readonly string[]): string[][] {
  const groups: { kind: string | null; lines: string[] }[] = [];
  let pending: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }
    const kind = placeholdersIn(line).length === 0 ? null : kindOfTemplate(line);
    const last = groups.at(-1);
    if (kind === null) {
      if (last === undefined) {
        pending.push(line);
      } else {
        last.lines.push(line);
      }
      continue;
    }
    if (last?.kind === kind) {
      last.lines.push(line);
    } else {
      groups.push({ kind, lines: [...pending, line] });
      pending = [];
    }
  }
  if (pending.length > 0) {
    groups.push({ kind: null, lines: pending });
  }
  return groups.map((group) => group.lines);
}

export function signatureOf(segment: Segment): string {
  return JSON.stringify({ template: segment.template, options: segment.options });
}

/** Hints are only needed to build segments; exported for the merge path. */
export type { StateHints };

export function parseVrcosc(files: readonly ConfigFile[]): ParseResult {
  const collector = new DiagnosticCollector();
  const chatboxFile = findChatboxFile(files);
  if (chatboxFile === undefined) {
    throw new ConfigParseError('No VRCOSC chatbox.json was found among the uploaded files.');
  }
  const document = readDocument(
    parseVJson(chatboxFile.content, chatboxFile.path),
    chatboxFile.path,
  );
  const moduleFiles = findModuleFiles(files);
  const settings = new Map<string, VObject>();
  const disabledModules = new Set<string>();
  for (const [fullId, file] of moduleFiles) {
    const parsed = readModuleFile(file, collector);
    if (parsed !== undefined) {
      settings.set(fullId, parsed.settings);
      if (!parsed.enabled) {
        disabledModules.add(fullId);
      }
    }
  }
  const globals = readGlobalSettings(files, collector);
  const builder = new ProfileBuilder(collector, settings, `${chatboxFile.path}#timeline`);
  const ordered = document.timeline.clips
    .map((clip, index) => ({ clip, index }))
    .sort((a, b) => a.clip.layer - b.clip.layer || a.clip.start - b.clip.start);
  for (const { clip, index } of ordered) {
    if (!clip.enabled) {
      collector.info(
        'clip-disabled',
        `Clip '${clip.name}' is disabled and was skipped.`,
        `${chatboxFile.path}#timeline.clips[${index}]`,
      );
      continue;
    }
    for (const moduleId of clip.linked_modules) {
      if (disabledModules.has(moduleId)) {
        collector.warn(
          'module-disabled',
          `Clip '${clip.name}' links ${moduleId}, which is disabled in VRCOSC.`,
          moduleFiles.get(moduleId)?.path,
        );
      }
    }
    builder.addClip(clip, index);
  }
  return {
    profile: assembleProfile(builder, document, globals, chatboxFile, moduleFiles),
    diagnostics: collector.all(),
  };
}

function assembleProfile(
  builder: ProfileBuilder,
  document: VrcDocument,
  globals: GlobalSettings,
  chatboxFile: ConfigFile,
  moduleFiles: ReadonlyMap<string, ConfigFile>,
): ChatboxProfile {
  const modules: Record<string, string> = {};
  for (const [fullId, file] of moduleFiles) {
    modules[fullId] = file.content;
  }
  const extras: VrcoscExtras = {
    chatbox: chatboxFile.content,
    chatboxPath: chatboxFile.path,
    modules,
    states: builder.mappings,
    ...(builder.afkMapping === undefined ? {} : { afk: builder.afkMapping }),
  };
  const notes = [
    `Imported from VRCOSC (timeline ${document.timeline.length} s, ${document.timeline.clips.length} clips).`,
    ...builder.notes,
  ];
  return {
    version: 1,
    meta: { name: 'VRCOSC ChatBox', source: 'vrcosc', notes },
    statuses: builder.statuses,
    statusCycle: builder.statusCycle(),
    afk: builder.afk,
    output: {
      separator: ' ┆ ',
      separateWithNewlines: true,
      prefix: '',
      suffix: '',
      minimalBackground: builder.minimalBackground,
      sendIntervalSeconds: globals.sendIntervalSeconds,
    },
    osc: { host: globals.host, port: globals.port },
    segments: builder.segments,
    extras: { vrcosc: extras },
  };
}
