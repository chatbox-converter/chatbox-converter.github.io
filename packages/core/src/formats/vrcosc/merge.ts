import { activeStatus, type ChatboxProfile } from '../../model/profile';
import { defaultSegmentOptions, type Segment } from '../../model/segments';
import type { ConfigFile, DiagnosticCollector } from '../codec';
import { compile, type CompilePart } from './compile';
import { documentToJson, readDocument, type VrcDocument, type VrcState } from './document';
import { signatureOf, type StateMapping, type VrcoscExtras } from './parse';
import { STATUS_MODULE_ID, statusModuleSettings } from './status-module';
import { reconcileVariables } from './variables';
import { isVObject, parseVJson, stringifyVJson, vObject } from './vjson';

/**
 * VRCOSC → VRCOSC round trip: when the profile still carries the imported
 * document and its segments still map onto that document's states, only the
 * states whose segments were edited are rewritten; everything else (timing,
 * layers, events, unmodelled states, option keys the model does not know) is
 * emitted verbatim.
 */
function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((entry) => typeof entry === 'string')
  );
}

function isMapping(value: unknown): value is StateMapping {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['clip'] === 'number' &&
    typeof record['state'] === 'number' &&
    Array.isArray(record['segmentIds']) &&
    Array.isArray(record['signatures'])
  );
}

export function readExtras(value: unknown): VrcoscExtras | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const afk = record['afk'];
  const afkValid =
    afk === undefined ||
    (typeof afk === 'object' &&
      afk !== null &&
      typeof (afk as Record<string, unknown>)['clip'] === 'number' &&
      typeof (afk as Record<string, unknown>)['state'] === 'number');
  if (
    typeof record['chatbox'] !== 'string' ||
    typeof record['chatboxPath'] !== 'string' ||
    !isStringRecord(record['modules']) ||
    !Array.isArray(record['states']) ||
    !record['states'].every(isMapping) ||
    !afkValid
  ) {
    return undefined;
  }
  return record as unknown as VrcoscExtras;
}

interface MergeContext {
  readonly profile: ChatboxProfile;
  readonly document: VrcDocument;
  readonly extras: VrcoscExtras;
}

function stateAt(document: VrcDocument, clip: number, state: number): VrcState | undefined {
  return document.timeline.clips[clip]?.states[state];
}

/** Every profile segment must still belong to a mapped state that exists in the document. */
function canMerge(context: MergeContext): boolean {
  const mapped = new Set(context.extras.states.flatMap((mapping) => mapping.segmentIds));
  if (!context.profile.segments.every((segment) => mapped.has(segment.id))) {
    return false;
  }
  return context.extras.states.every(
    (mapping) => stateAt(context.document, mapping.clip, mapping.state) !== undefined,
  );
}

function compileState(
  parts: readonly CompilePart[],
  original: VrcState,
  statusText: string,
): VrcState {
  const statusModule = original.variables.some((v) => v.module_id === STATUS_MODULE_ID);
  const compiled = compile({
    parts,
    separator: '\n',
    prefix: '',
    suffix: '',
    statusText,
    statusModule,
  });
  const reconciled = reconcileVariables(original.variables, compiled.variables, compiled.format);
  return { ...original, enabled: true, format: reconciled.format, variables: reconciled.variables };
}

function rewriteState(context: MergeContext, mapping: StateMapping, original: VrcState): VrcState {
  const segments = mapping.segmentIds
    .map((id) => context.profile.segments.find((segment) => segment.id === id))
    .filter((segment): segment is Segment => segment !== undefined);
  if (mapping.segmentIds.length === 0) {
    return original;
  }
  const enabled = segments.filter((segment) => segment.enabled);
  if (enabled.length === 0) {
    return { ...original, enabled: false };
  }
  const untouched =
    segments.length === mapping.segmentIds.length &&
    enabled.length === segments.length &&
    segments.every((segment, index) => signatureOf(segment) === mapping.signatures[index]) &&
    !segments.some((segment) => segment.kind === 'status');
  if (untouched) {
    return { ...original, enabled: true };
  }
  const statusText = activeStatus(context.profile)?.text ?? '';
  return compileState(
    enabled.map((segment) => ({ template: segment.template, options: segment.options })),
    original,
    statusText,
  );
}

function rewriteAfk(context: MergeContext, original: VrcState): VrcState {
  if (!context.profile.afk.enabled) {
    return { ...original, enabled: false };
  }
  return compileState(
    [{ template: context.profile.afk.template, options: defaultSegmentOptions('custom') }],
    original,
    '',
  );
}

function mergeDocument(context: MergeContext): VrcDocument {
  const replacements = new Map<string, VrcState>();
  for (const mapping of context.extras.states) {
    const original = stateAt(context.document, mapping.clip, mapping.state);
    if (original !== undefined) {
      replacements.set(
        `${mapping.clip}:${mapping.state}`,
        rewriteState(context, mapping, original),
      );
    }
  }
  const afk = context.extras.afk;
  if (afk !== undefined) {
    const original = stateAt(context.document, afk.clip, afk.state);
    if (original !== undefined) {
      replacements.set(`${afk.clip}:${afk.state}`, rewriteAfk(context, original));
    }
  }
  return {
    version: 1,
    timeline: {
      length: context.document.timeline.length,
      clips: context.document.timeline.clips.map((clip, clipIndex) => ({
        ...clip,
        states: clip.states.map(
          (state, stateIndex) => replacements.get(`${clipIndex}:${stateIndex}`) ?? state,
        ),
      })),
    },
  };
}

/** Returns the merged files, or undefined when a fresh document has to be built instead. */
export function mergeSerialize(
  profile: ChatboxProfile,
  collector: DiagnosticCollector,
): ConfigFile[] | undefined {
  const extras = readExtras(profile.extras.vrcosc);
  if (extras === undefined) {
    return undefined;
  }
  let document: VrcDocument;
  try {
    document = readDocument(parseVJson(extras.chatbox, extras.chatboxPath), extras.chatboxPath);
  } catch {
    collector.warn(
      'extras-unreadable',
      'The imported VRCOSC document could not be re-read; a fresh one was generated.',
    );
    return undefined;
  }
  const context: MergeContext = { profile, document, extras };
  if (!canMerge(context)) {
    collector.info(
      'structure-changed',
      'Segments were added or re-created since the VRCOSC import; a fresh timeline was generated instead of updating the imported one.',
    );
    return undefined;
  }
  const merged = mergeDocument(context);
  collector.info(
    'merged',
    'Changes were written back into the imported VRCOSC timeline; clips, events and unmodelled states were kept as they were.',
  );
  const files: ConfigFile[] = [
    { path: 'chatbox.json', content: stringifyVJson(documentToJson(merged)) },
  ];
  for (const [fullId, content] of Object.entries(extras.modules)) {
    files.push({
      path: `modules/${fullId}.json`,
      content: fullId === STATUS_MODULE_ID ? withStatusList(content, profile) : content,
    });
  }
  return files;
}

/** The Status module file with its list/cycle settings refreshed from the profile. */
function withStatusList(content: string, profile: ChatboxProfile): string {
  let json;
  try {
    json = parseVJson(content, STATUS_MODULE_ID);
  } catch {
    return content;
  }
  if (!isVObject(json)) {
    return content;
  }
  const kept = Object.entries(vObject(json['settings'])).filter(
    ([key]) => !['cycle', 'interval', 'random'].includes(key),
  );
  return stringifyVJson({
    ...json,
    settings: { ...Object.fromEntries(kept), ...statusModuleSettings(profile) },
  });
}
