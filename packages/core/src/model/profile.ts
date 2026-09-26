import { createSegment, type Segment, type SegmentKind } from './segments';

export const FORMAT_IDS = ['magicchatbox', 'vrcosc', 'dreamchatbox', 'native'] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

export function isFormatId(value: string): value is FormatId {
  return (FORMAT_IDS as readonly string[]).includes(value);
}

export interface StatusItem {
  readonly id: string;
  readonly text: string;
  /** The status currently shown. At most one item should be active. */
  readonly active: boolean;
  readonly useInCycle: boolean;
  readonly favorite: boolean;
  /** Group / template / set name; empty = default group. */
  readonly group: string;
}

export interface StatusCycle {
  readonly enabled: boolean;
  readonly intervalSeconds: number;
  readonly random: boolean;
}

export interface AfkSettings {
  readonly enabled: boolean;
  readonly timeoutSeconds: number;
  /** Template while away; `{afk_duration}` is available. */
  readonly template: string;
  /** Replace the whole line with the AFK text instead of only the status segment. */
  readonly replaceEverything: boolean;
}

export interface OutputSettings {
  /** Text between segments when not separating with newlines. */
  readonly separator: string;
  readonly separateWithNewlines: boolean;
  readonly prefix: string;
  readonly suffix: string;
  /** VRChat's own limit is 144; with the minimal background trick only 142 are usable. */
  readonly minimalBackground: boolean;
  readonly sendIntervalSeconds: number;
}

export interface OscSettings {
  readonly host: string;
  readonly port: number;
}

export interface ProfileMeta {
  readonly name: string;
  readonly source: FormatId | null;
  /** Free-form remarks kept with the profile, e.g. what an import could not map. */
  readonly notes: readonly string[];
}

/**
 * Format-specific data that has no home in the neutral model but should survive
 * a round trip (e.g. DreamChatbox theme keys, MagicChatbox TTS settings). Each
 * codec owns its own key and treats the value as opaque JSON.
 */
export type ProfileExtras = Partial<Record<FormatId, unknown>>;

export interface ChatboxProfile {
  readonly version: 1;
  readonly meta: ProfileMeta;
  readonly statuses: readonly StatusItem[];
  readonly statusCycle: StatusCycle;
  readonly afk: AfkSettings;
  readonly output: OutputSettings;
  readonly osc: OscSettings;
  /** Ordered top-to-bottom / left-to-right. */
  readonly segments: readonly Segment[];
  readonly extras: ProfileExtras;
}

export const CHATBOX_CHAR_LIMIT = 144;
export const MINIMAL_BACKGROUND_SUFFIX = '\u0003\u001f';

export function createStatusItem(text: string, overrides: Partial<StatusItem> = {}): StatusItem {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    text,
    active: overrides.active ?? false,
    useInCycle: overrides.useInCycle ?? false,
    favorite: overrides.favorite ?? false,
    group: overrides.group ?? '',
  };
}

export function createDefaultProfile(overrides: Partial<ChatboxProfile> = {}): ChatboxProfile {
  return {
    version: 1,
    meta: overrides.meta ?? { name: 'My chatbox', source: null, notes: [] },
    statuses: overrides.statuses ?? [createStatusItem('Enjoy 💖', { active: true })],
    statusCycle: overrides.statusCycle ?? { enabled: false, intervalSeconds: 10, random: false },
    afk: overrides.afk ?? {
      enabled: false,
      timeoutSeconds: 120,
      template: '💤 AFK for {afk_duration}',
      replaceEverything: false,
    },
    output: overrides.output ?? {
      separator: ' ┆ ',
      separateWithNewlines: true,
      prefix: '',
      suffix: '',
      minimalBackground: false,
      sendIntervalSeconds: 1.5,
    },
    osc: overrides.osc ?? { host: '127.0.0.1', port: 9000 },
    segments: overrides.segments ?? defaultSegments(),
    extras: overrides.extras ?? {},
  };
}

/**
 * MagicChatbox's default integration list, order, master toggles and desktop/VR
 * gates (IntegrationSettings defaults), so a fresh profile looks like a fresh
 * MagicChatbox install.
 */
const DEFAULT_SEGMENT_TABLE: readonly (readonly [SegmentKind, boolean, boolean, boolean])[] = [
  // kind, enabled, desktop, vr
  ['status', true, true, true],
  ['window', false, true, false],
  ['twitch', false, true, true],
  ['tiktok', false, true, true],
  ['discord', false, true, true],
  ['media', true, true, true],
  ['vrchat', false, true, true],
  ['heartrate', false, false, true],
  ['hardware', false, false, true],
  ['vr_performance', false, true, true],
  ['vr_battery', false, true, true],
  ['network', false, true, false],
  ['weather', true, false, true],
  ['time', true, false, true],
  ['soundpad', false, true, false],
  ['voicemod', false, true, true],
  ['lyrics', false, true, true],
];

export function defaultSegments(): Segment[] {
  return DEFAULT_SEGMENT_TABLE.map(([kind, enabled, desktop, vr]) =>
    createSegment(kind, { id: `default-${kind}`, enabled, visibility: { desktop, vr } }),
  );
}

export function effectiveCharLimit(output: OutputSettings): number {
  return output.minimalBackground
    ? CHATBOX_CHAR_LIMIT - MINIMAL_BACKGROUND_SUFFIX.length
    : CHATBOX_CHAR_LIMIT;
}

export function activeStatus(profile: ChatboxProfile): StatusItem | undefined {
  return profile.statuses.find((item) => item.active) ?? profile.statuses[0];
}
