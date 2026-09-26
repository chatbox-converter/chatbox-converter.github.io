import { placeholderCoverage, type PlaceholderCoverage } from '@chatbox-converter/core';
import { describe, expect, it } from 'vitest';
import {
  CATALOG_APPS,
  filterCoverage,
  groupByCategory,
  matchesQuery,
  missingIn,
  summarize,
  summaryText,
  toggleApp,
} from './catalog-helpers';

const ALL = placeholderCoverage();
const byName = (name: string): PlaceholderCoverage => {
  const found = ALL.find((entry) => entry.name === name);
  if (found === undefined) throw new Error(name);
  return found;
};

describe('matchesQuery', () => {
  it('matches name, label, provider name and provider detail', () => {
    const artist = byName('artist');
    expect(matchesQuery(artist, '')).toBe(true);
    expect(matchesQuery(artist, 'ARTIST')).toBe(true);
    expect(matchesQuery(artist, '{artist}')).toBe(true);
    expect(matchesQuery(artist, 'spotify')).toBe(true);
    expect(matchesQuery(artist, 'IntgrScanMediaLink')).toBe(true);
    expect(matchesQuery(artist, 'heartrate')).toBe(false);
  });
});

describe('filterCoverage / groupByCategory', () => {
  it('narrows by category and query', () => {
    const media = filterCoverage(ALL, { query: '', category: 'media', apps: CATALOG_APPS });
    expect(media.every((entry) => entry.category === 'media')).toBe(true);
    expect(media.length).toBeGreaterThan(5);
    const narrowed = filterCoverage(ALL, { query: 'album', category: 'media', apps: CATALOG_APPS });
    expect(narrowed.map((entry) => entry.name)).toEqual(['album']);
    expect(filterCoverage(ALL, { query: 'album', category: 'twitch', apps: CATALOG_APPS })).toEqual(
      [],
    );
  });

  it('groups non-empty categories in vocabulary order', () => {
    const groups = groupByCategory(ALL);
    expect(groups[0]?.category).toBe('status');
    expect(groups.at(-1)?.category).toBe('custom');
    expect(groups.reduce((sum, group) => sum + group.rows.length, 0)).toBe(ALL.length);
    expect(
      groupByCategory(
        filterCoverage(ALL, { query: 'zzz-none', category: null, apps: CATALOG_APPS }),
      ),
    ).toEqual([]);
  });
});

describe('missingIn', () => {
  it('only considers the visible apps', () => {
    const soundpad = byName('soundpad_sound');
    expect(missingIn(soundpad, ['dreamchatbox'])).toBe(true);
    expect(missingIn(soundpad, ['magicchatbox'])).toBe(false);
    expect(missingIn(soundpad, [])).toBe(false);
  });
});

describe('summarize', () => {
  it('counts coverage buckets and formats the line', () => {
    const rows = [byName('artist'), byName('soundpad_sound'), byName('voicemod_sound')];
    const summary = summarize(rows, 90);
    expect(summary.shown).toBe(3);
    expect(summary.allThree).toBe(1);
    expect(summary.only.vrcosc).toBe(1);
    expect(summary.only.magicchatbox).toBe(0);
    expect(summaryText(summary)).toBe(
      '3 of 90 placeholders · covered by all three: 1 · VRCOSC only: 1',
    );
  });

  it('reports rows without any provider', () => {
    const fake: PlaceholderCoverage = { ...byName('artist'), providers: [] };
    expect(summaryText(summarize([fake], 1))).toBe(
      '1 of 1 placeholders · covered by all three: 0 · no provider: 1',
    );
  });
});

describe('toggleApp', () => {
  it('removes and re-adds an app keeping column order', () => {
    const without = toggleApp(CATALOG_APPS, 'vrcosc');
    expect(without).toEqual(['magicchatbox', 'dreamchatbox']);
    expect(toggleApp(without, 'vrcosc')).toEqual([...CATALOG_APPS]);
  });
});
