import type { PlaceholderName } from '../../model/placeholders';
import {
  DISCORD_TOKENS,
  FILES,
  SPOTIFY_TOKENS,
  TIKTOK_TOKENS,
  TWITCH_TOKENS,
  VRC_TOKENS,
  WEATHER_TOKENS,
  type McbFileName,
  type SortKey,
} from './catalog';
import { COMPONENTS } from './defaults';

/**
 * Canonical placeholder → MagicChatbox provider, built from the codec's own
 * tables: the per-integration template tokens (`catalog.ts`), the layout
 * flags the serializer toggles per placeholder (`LAYOUT_FLAGS`, consumed by
 * `serialize-segments.ts`) and the fixed layouts an integration always
 * prints. Nothing here is a second copy of a mapping.
 */
export const INTEGRATION_TITLES: Readonly<Record<SortKey, string>> = {
  Status: 'Personal status',
  Window: 'Window activity',
  Twitch: 'Twitch',
  TikTokLive: 'TikTok Live',
  Discord: 'Discord',
  Spotify: 'Spotify',
  VrcRadar: 'VRC Radar',
  HeartRate: 'Pulsoid heart rate',
  Component: 'Component stats',
  VrPerformance: 'VR performance',
  TrackerBattery: 'Tracker battery',
  Network: 'Network statistics',
  Weather: 'Weather',
  Time: 'Time',
  Soundpad: 'Soundpad',
  Voicemod: 'Voicemod',
  MediaLink: 'MediaLink',
  Lyrics: 'Lyrics',
};

/** Integrations with a free template, token → canonical placeholder. */
export const TOKEN_TABLES: Readonly<Partial<Record<SortKey, Readonly<Record<string, string>>>>> = {
  Spotify: SPOTIFY_TOKENS,
  Weather: WEATHER_TOKENS,
  VrcRadar: VRC_TOKENS,
  Twitch: TWITCH_TOKENS,
  TikTokLive: TIKTOK_TOKENS,
  Discord: DISCORD_TOKENS,
};

export interface McbLayoutFlag {
  readonly sortKey: SortKey;
  readonly file: McbFileName;
  readonly key: string;
  readonly placeholder: PlaceholderName;
}

function flag(
  sortKey: SortKey,
  file: McbFileName,
  key: string,
  placeholder: PlaceholderName,
): McbLayoutFlag {
  return { sortKey, file, key, placeholder };
}

/** Boolean settings the serializer sets to "the template uses this placeholder". */
export const LAYOUT_FLAGS: readonly McbLayoutFlag[] = [
  flag('Window', FILES.window, 'ShowFocusedApp', 'window_title'),
  flag('Spotify', FILES.spotify, 'ShowAlbum', 'album'),
  flag('Spotify', FILES.spotify, 'ShowDevice', 'player'),
  flag('Spotify', FILES.spotify, 'ShowVolume', 'volume'),
  flag('HeartRate', FILES.pulsoid, 'ShowHeartRateTrendIndicator', 'heartrate_trend'),
  flag('HeartRate', FILES.pulsoid, 'ShowAverageHeartRate', 'heartrate_avg'),
  flag('HeartRate', FILES.pulsoid, 'ShowMaximumHeartRate', 'heartrate_max'),
  flag('HeartRate', FILES.pulsoid, 'ShowMinimumHeartRate', 'heartrate_min'),
  flag('VrPerformance', FILES.vrPerformance, 'ShowFps', 'vr_fps'),
  flag('VrPerformance', FILES.vrPerformance, 'ShowTargetHz', 'vr_target_hz'),
  flag('VrPerformance', FILES.vrPerformance, 'ShowReprojection', 'vr_reprojection'),
  flag('VrPerformance', FILES.vrPerformance, 'ShowDroppedFrames', 'vr_dropped_frames'),
  flag('Network', FILES.network, 'ShowCurrentDown', 'net_down'),
  flag('Network', FILES.network, 'ShowCurrentUp', 'net_up'),
  flag('Network', FILES.network, 'ShowMaxDown', 'net_max_down'),
  flag('Network', FILES.network, 'ShowMaxUp', 'net_max_up'),
  flag('Network', FILES.network, 'ShowTotalDown', 'net_total_down'),
  flag('Network', FILES.network, 'ShowTotalUp', 'net_total_up'),
  flag('Network', FILES.network, 'ShowNetworkUtilization', 'net_utilization'),
  flag('Weather', FILES.weather, 'ShowWeatherCondition', 'weather_condition'),
  flag('Weather', FILES.weather, 'ShowWeatherEmoji', 'weather_emoji'),
  flag('Weather', FILES.weather, 'ShowWeatherFeelsLike', 'weather_feels_like'),
  flag('Weather', FILES.weather, 'ShowWeatherHumidity', 'weather_humidity'),
  flag('Weather', FILES.weather, 'ShowWeatherWind', 'weather_wind'),
  flag('Time', FILES.time, 'TimeShowTimeZone', 'timezone'),
];

export function layoutFlagsFor(sortKey: SortKey): readonly McbLayoutFlag[] {
  return LAYOUT_FLAGS.filter((entry) => entry.sortKey === sortKey);
}

export interface McbFixedLayout {
  readonly name: string;
  readonly placeholder: PlaceholderName;
  /** Settings key (or key=value) that enables the placeholder. */
  readonly detail: string;
  readonly note?: string;
}

function fixed(
  name: string,
  placeholder: PlaceholderName,
  detail: string,
  note?: string,
): McbFixedLayout {
  return note === undefined ? { name, placeholder, detail } : { name, placeholder, detail, note };
}

/** ComponentStatsV1.json items: enabled / max / temperature / wattage toggles per component. */
function componentLayouts(): McbFixedLayout[] {
  const name = INTEGRATION_TITLES.Component;
  const out: McbFixedLayout[] = [];
  for (const spec of COMPONENTS) {
    const lower = spec.name.toLowerCase();
    if (spec.showMax) {
      out.push(fixed(name, `${lower}_used` as PlaceholderName, `${spec.name}.IsEnabled`));
      out.push(fixed(name, `${lower}_total` as PlaceholderName, `${spec.name}.ShowMaxValue`));
    } else {
      out.push(fixed(name, `${lower}_usage` as PlaceholderName, `${spec.name}.IsEnabled`));
    }
    if (spec.name === 'GPU') {
      out.push(fixed(name, 'gpu_temp', 'GPU.ShowTemperature'));
      out.push(fixed(name, 'gpu_power', 'GPU.ShowWattage'));
    }
  }
  return out;
}

const T = INTEGRATION_TITLES;

/** Placeholders an integration prints from its own layout (see `templates.ts`). */
export const FIXED_LAYOUTS: readonly McbFixedLayout[] = [
  fixed(T.Status, 'status', 'IntgrStatus'),
  fixed('AFK module', 'afk_duration', 'ShowAFKTime'),
  fixed(T.Window, 'device_mode', 'IntgrScanWindowActivity', 'always leads the window line'),
  fixed(T.HeartRate, 'heartrate', 'IntgrHeartRate'),
  ...componentLayouts(),
  fixed(T.TrackerBattery, 'hmd_battery', 'ShowHeadset'),
  fixed(T.TrackerBattery, 'left_controller_battery', 'ShowControllers'),
  fixed(T.TrackerBattery, 'right_controller_battery', 'ShowControllers'),
  fixed(T.TrackerBattery, 'tracker_lowest_name', 'ShowTrackers'),
  fixed(T.TrackerBattery, 'tracker_lowest_battery', 'ShowTrackers'),
  fixed(T.Weather, 'weather_temp', 'ShowWeatherInTime'),
  fixed(T.Time, 'time', 'IntgrScanWindowTime'),
  fixed(T.Soundpad, 'soundpad_sound', 'IntgrSoundpad'),
  fixed(T.Voicemod, 'voicemod_voice', 'IntgrVoicemod', "fixed layout: 🎙️ '{voicemod_voice}'"),
  fixed(T.Lyrics, 'lyrics', 'IntgrLyrics'),
  fixed(T.MediaLink, 'play_icon', 'PrefixIconMusic'),
  fixed(T.MediaLink, 'title', 'IntgrScanMediaLink', 'title always precedes the artist'),
  fixed(T.MediaLink, 'artist', 'IntgrScanMediaLink', 'title always precedes the artist'),
  fixed(T.MediaLink, 'progress_bar', 'TimeSeekStyle=1'),
  fixed(T.MediaLink, 'position', 'TimeSeekStyle=0'),
  fixed(T.MediaLink, 'duration', 'TimeSeekStyle=0'),
];

export interface McbProvider {
  /** Integration title. */
  readonly name: string;
  /** `{token}` or settings key. */
  readonly detail: string;
  readonly note?: string;
}

function buildCanonicalToMcb(): ReadonlyMap<PlaceholderName, readonly McbProvider[]> {
  const out = new Map<PlaceholderName, McbProvider[]>();
  const seen = new Set<string>();
  const add = (placeholder: PlaceholderName, provider: McbProvider): void => {
    const key = `${placeholder}\u0000${provider.name}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    const list = out.get(placeholder) ?? [];
    list.push(provider);
    out.set(placeholder, list);
  };
  for (const [sortKey, tokens] of Object.entries(TOKEN_TABLES)) {
    const name = INTEGRATION_TITLES[sortKey as SortKey];
    for (const [token, placeholder] of Object.entries(tokens)) {
      add(placeholder as PlaceholderName, { name, detail: `{${token}}` });
    }
  }
  for (const entry of LAYOUT_FLAGS) {
    add(entry.placeholder, { name: INTEGRATION_TITLES[entry.sortKey], detail: entry.key });
  }
  for (const entry of FIXED_LAYOUTS) {
    const { name, detail, note } = entry;
    add(entry.placeholder, note === undefined ? { name, detail } : { name, detail, note });
  }
  return out;
}

/**
 * Canonical → MagicChatbox providers, one per integration (a template token
 * wins over a layout flag for the same integration).
 */
export const CANONICAL_TO_MCB: ReadonlyMap<PlaceholderName, readonly McbProvider[]> =
  buildCanonicalToMcb();
