import type { Segment, SegmentKind } from '@chatbox-converter/core';

export interface OptionGroup {
  readonly title: string;
  readonly kinds: readonly SegmentKind[];
}

/** MagicChatbox's Options page groups, with our neutral kinds slotted in. */
export const SEGMENT_GROUPS: readonly OptionGroup[] = [
  { title: 'Music', kinds: ['media', 'lyrics'] },
  { title: 'Streaming and chat', kinds: ['twitch', 'tiktok', 'discord', 'vrchat'] },
  { title: 'On screen', kinds: ['time', 'weather'] },
  { title: 'Your PC and body', kinds: ['heartrate', 'hardware', 'network', 'window'] },
  { title: 'VR', kinds: ['vr_performance', 'vr_battery'] },
  { title: 'Voice and more', kinds: ['soundpad', 'voicemod', 'speech', 'custom'] },
];

export const STATUS_SECTION = 'status';
export const LINE_SECTION = 'line';
export const OSC_SECTION = 'osc';

export function segmentSectionKey(segmentId: string): string {
  return `segment:${segmentId}`;
}

export interface OptionsHashTarget {
  readonly section: string;
  readonly segment: string | null;
}

/** Parse `#/options?section=media&segment=<id>`; `null` when no section is named. */
export function parseOptionsHash(hash: string): OptionsHashTarget | null {
  const query = hash.indexOf('?');
  if (query === -1) {
    return null;
  }
  const params = new URLSearchParams(hash.slice(query + 1));
  const section = params.get('section');
  if (section === null || section === '') {
    return null;
  }
  return { section, segment: params.get('segment') };
}

/** Map a hash target onto the key of the section that should open. */
export function sectionKeyForTarget(
  target: OptionsHashTarget,
  segments: readonly Segment[],
): string | null {
  if (target.section === STATUS_SECTION || target.section === LINE_SECTION) {
    return target.section;
  }
  if (target.section === OSC_SECTION) {
    return OSC_SECTION;
  }
  const byId = target.segment === null ? undefined : segments.find((s) => s.id === target.segment);
  const match = byId ?? segments.find((segment) => segment.kind === target.section);
  return match === undefined ? null : segmentSectionKey(match.id);
}

/** Group segments the way the page lists them; kinds outside every group go last. */
export function groupSegments(
  segments: readonly Segment[],
): readonly { readonly title: string; readonly segments: readonly Segment[] }[] {
  const groups = SEGMENT_GROUPS.map((group) => ({
    title: group.title,
    segments: segments.filter((segment) => group.kinds.includes(segment.kind)),
  }));
  const known = new Set(SEGMENT_GROUPS.flatMap((group) => group.kinds));
  const rest = segments.filter((segment) => segment.kind !== 'status' && !known.has(segment.kind));
  if (rest.length > 0) {
    groups.push({ title: 'Other', segments: rest });
  }
  return groups.filter((group) => group.segments.length > 0);
}
