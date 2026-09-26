import type { StatusCycle, StatusItem } from '@chatbox-converter/core';

export const STATUS_CHAR_LIMIT = 140;

export const SORT_MODES = ['created', 'recent', 'cycles'] as const;
export type SortMode = (typeof SORT_MODES)[number];

export const SORT_LABELS: Readonly<Record<SortMode, string>> = {
  created: 'Creation date',
  recent: 'Recently used',
  cycles: 'My 💛 cycles',
};

export function isSortMode(value: string): value is SortMode {
  return (SORT_MODES as readonly string[]).includes(value);
}

/** Sentinel for the "All groups" filter; real groups are prefixed so the empty (Default) group survives. */
export const ALL_GROUPS = 'all';

export function groupOptionValue(group: string): string {
  return `g:${group}`;
}

export function groupFromOptionValue(value: string): string | null {
  return value.startsWith('g:') ? value.slice(2) : null;
}

export function groupDisplayName(group: string): string {
  return group === '' ? 'Default' : group;
}

/** Every distinct group in insertion order, Default first when present. */
export function distinctGroups(
  statuses: readonly StatusItem[],
  extra: readonly string[] = [],
): readonly string[] {
  const seen = new Set<string>();
  for (const item of statuses) {
    seen.add(item.group);
  }
  for (const group of extra) {
    if (group !== '') {
      seen.add(group);
    }
  }
  const groups = [...seen];
  return groups.includes('') ? ['', ...groups.filter((group) => group !== '')] : groups;
}

/**
 * We keep no timestamps, so "creation" is insertion order, "recently used" floats
 * favourites (and the active item) to the top and "cycles" floats the 💛-marked items.
 */
export function sortStatuses(
  statuses: readonly StatusItem[],
  mode: SortMode,
  descending: boolean,
): readonly StatusItem[] {
  const rank = (item: StatusItem): number => {
    switch (mode) {
      case 'created':
        return 0;
      case 'recent':
        return item.active ? 0 : item.favorite ? 1 : 2;
      case 'cycles':
        return item.useInCycle ? 0 : 1;
    }
  };
  const indexed = statuses.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index);
  const ordered = indexed.map((entry) => entry.item);
  return descending ? ordered : ordered.reverse();
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 'es'}`;
}

/** The hint shown in the bar above the composer. */
export function messageBarText(
  composerLength: number,
  statuses: readonly StatusItem[],
  cycle: StatusCycle,
): string {
  if (composerLength > STATUS_CHAR_LIMIT) {
    return `You're soaring past the ${STATUS_CHAR_LIMIT} char limit by ${composerLength - STATUS_CHAR_LIMIT}. Reign in that message!`;
  }
  const marked = statuses.filter((item) => item.useInCycle).length;
  if (marked === 0) {
    return 'Only the activated status is shown. Mark some with 💛 and turn on Auto cycle to rotate them.';
  }
  if (!cycle.enabled) {
    return `${plural(marked, 'status')} marked with 💛. Turn on Auto cycle to rotate them every ${cycle.intervalSeconds} seconds.`;
  }
  if (marked === 1) {
    return `Only 1 status is marked with 💛, so it stays put. Mark another one to take turns every ${cycle.intervalSeconds} seconds.`;
  }
  return `${plural(marked, 'status')} take turns every ${cycle.intervalSeconds} seconds${cycle.random ? ', in random order' : ''}.`;
}

export type CounterTone = 'normal' | 'near' | 'over';

export function counterTone(length: number): CounterTone {
  if (length > STATUS_CHAR_LIMIT) {
    return 'over';
  }
  return length >= STATUS_CHAR_LIMIT - 15 ? 'near' : 'normal';
}
