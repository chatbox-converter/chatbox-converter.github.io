import type { ChatboxProfile } from '../../model/profile';
import type { Segment } from '../../model/segments';
import { placeholdersIn } from '../../model/template';
import { formatDotnetDateTime } from '../../util/dotnet';
import { clamp, isJsonObject, type JsonObject, type JsonValue } from '../../util/json';
import { DiagnosticCollector, type ConfigFile, type SerializeResult } from '../codec';
import { FILES, INTEGRATIONS, SORT_KEYS, type Integration, type SortKey } from './catalog';
import { COMPONENTS } from './defaults';
import { FILE_DEFAULTS, VERSIONED_FILES } from './defaults-providers';
import { escapeNewlines, finalizeFile, mergeDefaults, setKey, stringifyFile } from './files';
import { EXTRAS_KEY } from './parse';
import {
  prepareComponentItems,
  SEGMENT_WRITERS,
  type SerializeContext,
} from './serialize-segments';
import { serializeStatusList } from './statuses';

function extrasFiles(profile: ChatboxProfile): Record<string, unknown> {
  const extras: unknown = profile.extras[EXTRAS_KEY];
  if (typeof extras !== 'object' || extras === null || !('files' in extras)) {
    return {};
  }
  const files: unknown = extras.files;
  return isJsonObject(files) ? files : {};
}

function extraFile(extras: Record<string, unknown>, name: string): unknown {
  const lower = name.toLowerCase();
  const key = Object.keys(extras).find((candidate) => candidate.toLowerCase() === lower);
  return key === undefined ? undefined : extras[key];
}

function asJson(value: unknown): JsonValue | undefined {
  return value === undefined ? undefined : (value as JsonValue);
}

function pickMediaKey(segment: Segment, used: Set<SortKey>): SortKey | undefined {
  const spotifyOnly = placeholdersIn(segment.template).some((name) =>
    ['album', 'volume', 'progress_percent', 'player', 'remaining'].includes(name),
  );
  const preferred: SortKey[] = spotifyOnly ? ['Spotify', 'MediaLink'] : ['MediaLink', 'Spotify'];
  return preferred.find((key) => !used.has(key));
}

/** Segment → integration slot; kinds MagicChatbox lacks and duplicate kinds are reported. */
export function assignSegments(
  segments: readonly Segment[],
  collector: DiagnosticCollector,
): Map<SortKey, Segment> {
  const assigned = new Map<SortKey, Segment>();
  const used = new Set<SortKey>();
  for (const segment of segments) {
    const key =
      segment.kind === 'media'
        ? pickMediaKey(segment, used)
        : INTEGRATIONS.find((entry) => entry.kind === segment.kind && !used.has(entry.sortKey))
            ?.sortKey;
    if (key === undefined) {
      const reason = INTEGRATIONS.some((entry) => entry.kind === segment.kind)
        ? `A second ${segment.kind} segment`
        : `The ${segment.kind} segment`;
      collector.unsupported(reason, FILES.integration);
      continue;
    }
    used.add(key);
    assigned.set(key, segment);
  }
  return assigned;
}

function writeIntegrations(
  assigned: Map<SortKey, Segment>,
  intgr: JsonObject,
  weather: JsonObject,
): void {
  for (const integration of INTEGRATIONS) {
    const segment = assigned.get(integration.sortKey);
    const target = integration.sortKey === 'Weather' ? weather : intgr;
    setKey(target, integration.toggle, segment?.enabled ?? false);
    if (segment !== undefined && integration.gate !== undefined) {
      setKey(intgr, `${integration.gate}_VR`, segment.visibility.vr);
      setKey(intgr, `${integration.gate}_DESKTOP`, segment.visibility.desktop);
    }
  }
  const order: SortKey[] = [...assigned.keys()];
  for (const key of SORT_KEYS) {
    if (!order.includes(key)) {
      order.push(key);
    }
  }
  setKey(intgr, 'SavedSortOrder', order);
}

function writeApp(profile: ChatboxProfile, app: JsonObject): void {
  const { output, statusCycle } = profile;
  setKey(app, 'ScanningInterval', Math.round(clamp(output.sendIntervalSeconds, 0.7, 10) * 10) / 10);
  setKey(app, 'OscMessagePrefix', escapeNewlines(output.prefix));
  setKey(app, 'OscMessageSeparator', output.separator.trim() === '' ? ' ┆ ' : output.separator);
  setKey(app, 'OscMessageSuffix', escapeNewlines(output.suffix));
  setKey(app, 'SeperateWithENTERS', output.separateWithNewlines);
  setKey(app, 'BlankEgg', output.minimalBackground);
  setKey(app, 'CycleStatus', statusCycle.enabled);
  setKey(app, 'SwitchStatusInterval', Math.max(1, Math.round(statusCycle.intervalSeconds)));
  setKey(app, 'IsRandomCycling', statusCycle.random);
}

function writeAfk(profile: ChatboxProfile, afk: JsonObject, collector: DiagnosticCollector): void {
  const settings = profile.afk;
  const [head = '', tail = ''] = settings.template.split(/\{afk_duration\}/iu);
  const withTime = /\{afk_duration\}/iu.test(settings.template);
  const prefixMatch = /^(\S+)\s+([\s\S]*)$/u.exec(head);
  const hasPrefix = prefixMatch !== null && !/[\p{L}\p{N}]/u.test(prefixMatch[1] ?? '');
  const message = hasPrefix ? (prefixMatch[2] ?? '') : head;
  setKey(afk, 'EnableAfkDetection', settings.enabled);
  setKey(afk, 'AfkTimeout', Math.max(1, Math.round(settings.timeoutSeconds)));
  setKey(afk, 'ShowPrefixIcon', hasPrefix);
  if (hasPrefix) {
    setKey(afk, 'AfkPrefix', prefixMatch[1] ?? '💤');
  }
  setKey(afk, 'ShowAFKTime', withTime);
  if (withTime) {
    setKey(afk, 'AfkMessageForTimeStamp', message);
  } else {
    setKey(afk, 'AfkMessageWithoutTimeStamp', message.trim());
  }
  setKey(afk, 'ActiveStyleId', '');
  if (tail.trim() !== '') {
    collector.unsupported('Text after {afk_duration} in the AFK template', FILES.afk);
  }
  if (settings.replaceEverything) {
    collector.info(
      'approximated',
      'MagicChatbox replaces only the status segment while AFK, not the whole line.',
      FILES.afk,
    );
  }
}

function prepareFiles(extras: Record<string, unknown>, now: string): Map<string, JsonObject> {
  const files = new Map<string, JsonObject>();
  for (const [name, defaults] of Object.entries(FILE_DEFAULTS)) {
    files.set(name, mergeDefaults(defaults, asJson(extraFile(extras, name))));
  }
  files.set(
    FILES.componentItems,
    prepareComponentItems(extraFile(extras, FILES.componentItems), now),
  );
  return files;
}

function passthroughFiles(
  extras: Record<string, unknown>,
  known: ReadonlySet<string>,
): ConfigFile[] {
  const out: ConfigFile[] = [];
  for (const [name, value] of Object.entries(extras)) {
    if (known.has(name.toLowerCase()) || !name.toLowerCase().endsWith('.json')) {
      continue;
    }
    const json = asJson(value);
    if (json === undefined) {
      continue;
    }
    const body = isJsonObject(json) ? finalizeFile(name, json, false) : json;
    out.push({ path: name, content: stringifyFile(name, body) });
  }
  return out;
}

export function serializeMagicchatbox(profile: ChatboxProfile): SerializeResult {
  const collector = new DiagnosticCollector();
  const now = new Date();
  const stamp = formatDotnetDateTime(now);
  const extras = extrasFiles(profile);
  const files = prepareFiles(extras, stamp);
  const ctx: SerializeContext = { files, collector, now };
  const get = (name: string): JsonObject => files.get(name) ?? {};

  writeApp(profile, get(FILES.app));
  setKey(get(FILES.osc), 'OscIP', profile.osc.host);
  setKey(get(FILES.osc), 'OscPortOut', Math.round(profile.osc.port));
  writeAfk(profile, get(FILES.afk), collector);

  const assigned = assignSegments(profile.segments, collector);
  writeIntegrations(assigned, get(FILES.integration), get(FILES.weather));
  for (const [key, segment] of assigned) {
    SEGMENT_WRITERS[key](segment, ctx);
  }

  const output: ConfigFile[] = [];
  for (const [name, object] of files) {
    if (name === FILES.componentItems) {
      const items = COMPONENTS.map((spec) => object[spec.name] ?? null);
      output.push({ path: name, content: stringifyFile(name, items) });
      continue;
    }
    const body = finalizeFile(name, object, VERSIONED_FILES.includes(name));
    output.push({ path: name, content: stringifyFile(name, body) });
  }
  const statusList = serializeStatusList(
    profile.statuses,
    asJson(extraFile(extras, FILES.statusList)),
    now,
  );
  output.push({ path: FILES.statusList, content: stringifyFile(FILES.statusList, statusList) });

  const known = new Set([...files.keys(), FILES.statusList].map((name) => name.toLowerCase()));
  output.push(...passthroughFiles(extras, known));

  collector.info(
    'install-instructions',
    'Close MagicChatbox, copy these files into %APPDATA%\\Vrcosc-MagicChatbox\\ (replacing the existing ones) and start the app again.',
  );
  return { files: output, diagnostics: collector.all() };
}

export type { Integration };
