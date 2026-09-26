import {
  PLACEHOLDER_CATEGORIES,
  type PlaceholderCategory,
  type PlaceholderCoverage,
  type ProviderRef,
} from '@chatbox-converter/core';

/** Apps with a provider column, in column order. */
export const CATALOG_APPS = ['magicchatbox', 'vrcosc', 'dreamchatbox'] as const;
export type CatalogApp = (typeof CATALOG_APPS)[number];

export const APP_TITLES: Readonly<Record<CatalogApp, string>> = {
  magicchatbox: 'MagicChatbox',
  vrcosc: 'VRCOSC',
  dreamchatbox: 'DreamChatbox',
};

export const CATEGORY_TITLES: Readonly<Record<PlaceholderCategory, string>> = {
  status: 'Status',
  afk: 'AFK',
  media: 'Media',
  lyrics: 'Lyrics',
  hardware: 'Hardware',
  time: 'Time',
  weather: 'Weather',
  heartrate: 'Heart rate',
  window: 'Window activity',
  vrchat: 'VRChat',
  vr_battery: 'VR battery',
  vr_performance: 'VR performance',
  network: 'Network',
  twitch: 'Twitch',
  tiktok: 'TikTok',
  discord: 'Discord',
  soundpad: 'Soundpad',
  voicemod: 'Voicemod',
  speech: 'Speech',
  custom: 'Custom',
};

export interface CatalogFilter {
  readonly query: string;
  /** null = all categories. */
  readonly category: PlaceholderCategory | null;
  readonly apps: readonly CatalogApp[];
}

export const DEFAULT_FILTER: CatalogFilter = { query: '', category: null, apps: CATALOG_APPS };

export function providersFor(entry: PlaceholderCoverage, app: CatalogApp): readonly ProviderRef[] {
  return entry.providers.filter((provider) => provider.app === app);
}

/** Placeholder name, label, or a provider name/detail contains the query (case-insensitive). */
export function matchesQuery(entry: PlaceholderCoverage, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') {
    return true;
  }
  const haystack = [
    `{${entry.name}}`,
    entry.label,
    ...entry.providers.flatMap((provider) => [provider.name, provider.detail]),
  ];
  return haystack.some((text) => text.toLowerCase().includes(needle));
}

export function filterCoverage(
  entries: readonly PlaceholderCoverage[],
  filter: CatalogFilter,
): PlaceholderCoverage[] {
  return entries.filter(
    (entry) =>
      (filter.category === null || entry.category === filter.category) &&
      matchesQuery(entry, filter.query),
  );
}

export interface CategoryGroup {
  readonly category: PlaceholderCategory;
  readonly title: string;
  readonly rows: readonly PlaceholderCoverage[];
}

/** Non-empty categories in vocabulary order. */
export function groupByCategory(entries: readonly PlaceholderCoverage[]): CategoryGroup[] {
  return PLACEHOLDER_CATEGORIES.map((category) => ({
    category,
    title: CATEGORY_TITLES[category],
    rows: entries.filter((entry) => entry.category === category),
  })).filter((group) => group.rows.length > 0);
}

/** True when one of the visible apps has no provider for the placeholder. */
export function missingIn(entry: PlaceholderCoverage, apps: readonly CatalogApp[]): boolean {
  return apps.some((app) => providersFor(entry, app).length === 0);
}

export interface CoverageSummary {
  readonly shown: number;
  readonly total: number;
  readonly allThree: number;
  readonly only: Readonly<Record<CatalogApp, number>>;
  readonly none: number;
}

export function summarize(shown: readonly PlaceholderCoverage[], total: number): CoverageSummary {
  const only = { magicchatbox: 0, vrcosc: 0, dreamchatbox: 0 } satisfies Record<CatalogApp, number>;
  let allThree = 0;
  let none = 0;
  for (const entry of shown) {
    const covered = CATALOG_APPS.filter((app) => providersFor(entry, app).length > 0);
    if (covered.length === CATALOG_APPS.length) {
      allThree += 1;
    } else if (covered.length === 0) {
      none += 1;
    } else if (covered.length === 1 && covered[0] !== undefined) {
      only[covered[0]] += 1;
    }
  }
  return { shown: shown.length, total, allThree, only, none };
}

export function summaryText(summary: CoverageSummary): string {
  const parts = [
    `${summary.shown} of ${summary.total} placeholders`,
    `covered by all three: ${summary.allThree}`,
    ...CATALOG_APPS.filter((app) => summary.only[app] > 0).map(
      (app) => `${APP_TITLES[app]} only: ${summary.only[app]}`,
    ),
  ];
  if (summary.none > 0) {
    parts.push(`no provider: ${summary.none}`);
  }
  return parts.join(' · ');
}

export function toggleApp(apps: readonly CatalogApp[], app: CatalogApp): CatalogApp[] {
  const next = apps.includes(app) ? apps.filter((other) => other !== app) : [...apps, app];
  return CATALOG_APPS.filter((candidate) => next.includes(candidate));
}
