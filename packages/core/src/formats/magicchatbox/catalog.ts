import type { SegmentKind } from '../../model/segments';

/** Version stamped into every provider-managed file. */
export const APP_VERSION = '0.9.226.0';

export const FILES = {
  app: 'AppSettings.json',
  osc: 'OscSettings.json',
  integration: 'IntegrationSettings.json',
  statusList: 'StatusList.json',
  afk: 'AfkModuleSettings.json',
  time: 'TimeSettings.json',
  mediaLink: 'MediaLinkSettings.json',
  spotify: 'SpotifySettings.json',
  componentStats: 'ComponentStatsSettings.json',
  componentItems: 'ComponentStatsV1.json',
  pulsoid: 'PulsoidModuleSettings.json',
  weather: 'WeatherSettings.json',
  network: 'NetworkStatsSettings.json',
  window: 'WindowActivitySettings.json',
  vrcLog: 'VrcLogSettings.json',
  trackerBattery: 'TrackerBatterySettings.json',
  vrPerformance: 'VrPerformanceSettings.json',
  twitch: 'TwitchSettings.json',
  tiktok: 'TikTokLiveSettings.json',
  discord: 'DiscordSettings.json',
  lyrics: 'LyricsSettings.json',
} as const;

export type McbFileName = (typeof FILES)[keyof typeof FILES];

/** Every file MagicChatbox may keep; any of these basenames identifies the format. */
export const KNOWN_FILE_NAMES: readonly string[] = [
  ...Object.values(FILES),
  'ChatSettings.json',
  'TtsSettings.json',
  'OpenAISettings.json',
  'VoicemodSettings.json',
  'PrivacySettings.json',
  'IntelliChatSettings.json',
  'IntelliChatModuleSettings.json',
  'WhisperModuleSettings.json',
  'LastMessages.json',
  'AppHistory.json',
  'LastMediaLinkSessions.json',
  'MediaLinkStyles.json',
  'HotkeyConfiguration.json',
  'vrcosc_session.json',
];

/** Files the app writes without indentation. */
export const COMPACT_FILES: readonly string[] = [
  FILES.componentItems,
  'AppHistory.json',
  'LastMediaLinkSessions.json',
  'MediaLinkStyles.json',
];

/** `_schemaVersion` per provider file (1 when absent). */
export const SCHEMA_VERSIONS: Readonly<Record<string, number>> = {
  [FILES.componentStats]: 2,
  [FILES.tiktok]: 3,
};

/** Legacy read-only keys the app never writes back. */
export const LEGACY_KEYS: Readonly<Record<string, readonly string[]>> = {
  [FILES.app]: ['JoinedAlphaChannel', 'OpenTrayWithAltQ'],
  [FILES.discord]: ['VoiceClientId'],
  [FILES.afk]: ['Styles'],
};

export const SORT_KEYS = [
  'Status',
  'Window',
  'Twitch',
  'TikTokLive',
  'Discord',
  'Spotify',
  'VrcRadar',
  'HeartRate',
  'Component',
  'VrPerformance',
  'TrackerBattery',
  'Network',
  'Weather',
  'Time',
  'Soundpad',
  'Voicemod',
  'MediaLink',
  'Lyrics',
] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export function isSortKey(value: string): value is SortKey {
  return (SORT_KEYS as readonly string[]).includes(value);
}

export interface Integration {
  readonly sortKey: SortKey;
  readonly kind: SegmentKind;
  /** Master toggle key in IntegrationSettings.json (Weather: in WeatherSettings.json). */
  readonly toggle: string;
  readonly toggleDefault: boolean;
  /** Base name of the `_VR` / `_DESKTOP` pair; undefined = VR only. */
  readonly gate?: string;
  readonly vrDefault: boolean;
  readonly desktopDefault: boolean;
}

function intg(
  sortKey: SortKey,
  kind: SegmentKind,
  toggle: string,
  toggleDefault: boolean,
  gates: { gate?: string; vr: boolean; desktop: boolean },
): Integration {
  const base = {
    sortKey,
    kind,
    toggle,
    toggleDefault,
    vrDefault: gates.vr,
    desktopDefault: gates.desktop,
  };
  return gates.gate === undefined ? base : { ...base, gate: gates.gate };
}

export const INTEGRATIONS: readonly Integration[] = [
  intg('Status', 'status', 'IntgrStatus', true, { gate: 'IntgrStatus', vr: true, desktop: true }),
  intg('Window', 'window', 'IntgrScanWindowActivity', false, {
    gate: 'IntgrWindowActivity',
    vr: false,
    desktop: true,
  }),
  intg('Twitch', 'twitch', 'IntgrTwitch', false, { gate: 'IntgrTwitch', vr: true, desktop: true }),
  intg('TikTokLive', 'tiktok', 'IntgrTikTokLive', false, {
    gate: 'IntgrTikTokLive',
    vr: true,
    desktop: true,
  }),
  intg('Discord', 'discord', 'IntgrDiscord', false, {
    gate: 'IntgrDiscord',
    vr: true,
    desktop: true,
  }),
  intg('Spotify', 'media', 'IntgrSpotify', false, {
    gate: 'IntgrSpotify',
    vr: true,
    desktop: true,
  }),
  intg('VrcRadar', 'vrchat', 'IntgrVrcRadar', false, {
    gate: 'IntgrVrcRadar',
    vr: true,
    desktop: true,
  }),
  intg('HeartRate', 'heartrate', 'IntgrHeartRate', false, {
    gate: 'IntgrHeartRate',
    vr: true,
    desktop: false,
  }),
  intg('Component', 'hardware', 'IntgrComponentStats', false, {
    gate: 'IntgrComponentStats',
    vr: true,
    desktop: false,
  }),
  intg('VrPerformance', 'vr_performance', 'IntgrVrPerformance', false, {
    vr: true,
    desktop: false,
  }),
  intg('TrackerBattery', 'vr_battery', 'IntgrTrackerBattery', false, { vr: true, desktop: false }),
  intg('Network', 'network', 'IntgrNetworkStatistics', false, {
    gate: 'IntgrNetworkStatistics',
    vr: false,
    desktop: true,
  }),
  intg('Weather', 'weather', 'ShowWeatherInTime', true, {
    gate: 'IntgrWeather',
    vr: true,
    desktop: false,
  }),
  intg('Time', 'time', 'IntgrScanWindowTime', true, {
    gate: 'IntgrCurrentTime',
    vr: true,
    desktop: false,
  }),
  intg('Soundpad', 'soundpad', 'IntgrSoundpad', false, {
    gate: 'IntgrSoundpad',
    vr: false,
    desktop: true,
  }),
  intg('Voicemod', 'voicemod', 'IntgrVoicemod', false, {
    gate: 'IntgrVoicemod',
    vr: true,
    desktop: true,
  }),
  intg('MediaLink', 'media', 'IntgrScanMediaLink', true, {
    gate: 'IntgrMediaLink',
    vr: true,
    desktop: true,
  }),
  intg('Lyrics', 'lyrics', 'IntgrLyrics', false, { gate: 'IntgrLyrics', vr: true, desktop: true }),
];

export function integrationFor(sortKey: SortKey): Integration {
  const found = INTEGRATIONS.find((entry) => entry.sortKey === sortKey);
  if (found === undefined) {
    throw new Error(`Unknown MagicChatbox integration "${sortKey}".`);
  }
  return found;
}

/** `Timezone` enum (0..18) → IANA zone id. */
export const TIMEZONES: readonly string[] = [
  'UTC',
  'Europe/London',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/Berlin',
  'Europe/Bucharest',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Europe/Moscow',
  'Australia/Sydney',
  'Pacific/Auckland',
  'America/Sao_Paulo',
  'Africa/Johannesburg',
];

/** Extra IANA ids that fall into one of the enum zones. */
const TIMEZONE_ALIASES: Readonly<Record<string, number>> = {
  'Etc/UTC': 0,
  'Etc/GMT': 0,
  GMT: 0,
  'Europe/Dublin': 1,
  'Europe/Lisbon': 1,
  'America/Toronto': 2,
  'America/Detroit': 2,
  'America/Winnipeg': 3,
  'America/Mexico_City': 3,
  'America/Edmonton': 4,
  'America/Phoenix': 4,
  'America/Vancouver': 5,
  'America/Tijuana': 5,
  'Europe/Paris': 8,
  'Europe/Amsterdam': 8,
  'Europe/Brussels': 8,
  'Europe/Madrid': 8,
  'Europe/Rome': 8,
  'Europe/Vienna': 8,
  'Europe/Zurich': 8,
  'Europe/Stockholm': 8,
  'Europe/Oslo': 8,
  'Europe/Copenhagen': 8,
  'Europe/Prague': 8,
  'Europe/Warsaw': 8,
  'Europe/Budapest': 8,
  'Europe/Athens': 9,
  'Europe/Helsinki': 9,
  'Europe/Kiev': 9,
  'Europe/Kyiv': 9,
  'Asia/Calcutta': 10,
  'Asia/Hong_Kong': 11,
  'Asia/Taipei': 11,
  'Asia/Singapore': 11,
  'Australia/Melbourne': 15,
  'Australia/Brisbane': 15,
  'America/Argentina/Buenos_Aires': 17,
};

export function timezoneEnumFor(iana: string): number | undefined {
  const index = TIMEZONES.indexOf(iana);
  if (index >= 0) {
    return index;
  }
  return TIMEZONE_ALIASES[iana];
}

/** MagicChatbox template token → canonical placeholder, per integration. */
export const SPOTIFY_TOKENS: Readonly<Record<string, string>> = {
  play_icon: 'play_icon',
  artist: 'artist',
  title: 'title',
  album: 'album',
  device: 'player',
  volume: 'volume',
  seekbar: 'progress_bar',
  percent: 'progress_percent',
  remaining: 'remaining',
  elapsed: 'position',
  duration: 'duration',
  // `{progress}` is a second spelling of `{percent}`; `{percent}` wins when writing back.
  progress: 'progress_percent',
};
export const SPOTIFY_DROPPED = [
  'queue',
  'liked_icon',
  'explicit_icon',
  'shuffle_icon',
  'repeat_icon',
];

export const WEATHER_TOKENS: Readonly<Record<string, string>> = {
  temp: 'weather_temp',
  condition: 'weather_condition',
  emoji: 'weather_emoji',
  feels: 'weather_feels_like',
  humidity: 'weather_humidity',
  wind: 'weather_wind',
  time: 'time',
};
export const WEATHER_DROPPED = ['unit', 'weather', 'lat', 'lon'];

export const VRC_TOKENS: Readonly<Record<string, string>> = {
  master: 'vrc_master',
  world: 'vrc_world',
  count: 'vrc_player_count',
  type: 'vrc_instance_type',
  region: 'vrc_region',
};
export const VRC_DROPPED = [
  'peak',
  'owner',
  'session_time',
  'app_session',
  'worlds',
  'players',
  'peak_session',
];

export const TWITCH_TOKENS: Readonly<Record<string, string>> = {
  live: 'twitch_live',
  channel: 'twitch_channel',
  game: 'twitch_game',
  title: 'twitch_title',
  viewers: 'twitch_viewers',
  followers: 'twitch_followers',
};
export const TWITCH_DROPPED = ['user', 'url', 'status'];

export const TIKTOK_TOKENS: Readonly<Record<string, string>> = {
  host: 'tiktok_host',
  viewers: 'tiktok_viewers',
  likes: 'tiktok_likes',
  followers: 'tiktok_followers',
};

export const DISCORD_TOKENS: Readonly<Record<string, string>> = {
  channel: 'discord_channel',
  count: 'discord_count',
  speaking: 'discord_speaking',
  mute_state: 'discord_mute_state',
};
export const DISCORD_DROPPED = ['speaking_count', 'mute_emoji', 'voice_state'];

/** Canonical → format token; built by inverting the tables above (first wins). */
export function invert(mapping: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [from, to] of Object.entries(mapping)) {
    out[to] ??= from;
  }
  return out;
}

const SUPERSCRIPT: Readonly<Record<string, string>> = {
  a: 'ᵃ',
  b: 'ᵇ',
  c: 'ᶜ',
  d: 'ᵈ',
  e: 'ᵉ',
  f: 'ᶠ',
  g: 'ᵍ',
  h: 'ʰ',
  i: 'ⁱ',
  j: 'ʲ',
  k: 'ᵏ',
  l: 'ˡ',
  m: 'ᵐ',
  n: 'ⁿ',
  o: 'ᵒ',
  p: 'ᵖ',
  r: 'ʳ',
  s: 'ˢ',
  t: 'ᵗ',
  u: 'ᵘ',
  v: 'ᵛ',
  w: 'ʷ',
  x: 'ˣ',
  y: 'ʸ',
  z: 'ᶻ',
  A: 'ᴬ',
  B: 'ᴮ',
  D: 'ᴰ',
  E: 'ᴱ',
  G: 'ᴳ',
  H: 'ᴴ',
  I: 'ᴵ',
  J: 'ᴶ',
  K: 'ᴷ',
  L: 'ᴸ',
  M: 'ᴹ',
  N: 'ᴺ',
  O: 'ᴼ',
  P: 'ᴾ',
  R: 'ᴿ',
  T: 'ᵀ',
  U: 'ᵁ',
  V: 'ⱽ',
  W: 'ᵂ',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

/** MagicChatbox's `TextUtilities.TransformToSuperscript` for labels and units. */
export function superscript(text: string): string {
  return text.replace(/./gsu, (char) => SUPERSCRIPT[char] ?? char);
}

export const MY_TIME_LABEL = superscript('My time');
export const BPM_SUFFIX = superscript('bpm');
