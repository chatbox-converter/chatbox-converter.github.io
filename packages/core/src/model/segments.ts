import type { PlaceholderCategory } from './placeholders';

/**
 * A segment is one block of the chatbox line: an "integration" in MagicChatbox
 * terms, an "app"/template in DreamChatbox, a set of module variables in VRCOSC.
 */
export const SEGMENT_KINDS = [
  'status',
  'media',
  'lyrics',
  'hardware',
  'time',
  'weather',
  'heartrate',
  'window',
  'vrchat',
  'vr_battery',
  'vr_performance',
  'network',
  'twitch',
  'tiktok',
  'discord',
  'soundpad',
  'voicemod',
  'speech',
  'custom',
] as const satisfies readonly PlaceholderCategory[];

export type SegmentKind = (typeof SEGMENT_KINDS)[number];

export function isSegmentKind(value: string): value is SegmentKind {
  return (SEGMENT_KINDS as readonly string[]).includes(value);
}

export interface SegmentVisibility {
  readonly desktop: boolean;
  readonly vr: boolean;
}

export const TEMPERATURE_UNITS = ['C', 'F'] as const;
export type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number];

export interface ProgressBarStyle {
  /** Number of cells in the bar (excluding start/end caps). */
  readonly length: number;
  readonly filled: string;
  readonly empty: string;
  /** Marker drawn at the current position; empty string = none. */
  readonly position: string;
  readonly start: string;
  readonly end: string;
}

export interface MediaOptions {
  readonly kind: 'media';
  /** Template used while paused; empty = hide the segment while paused. */
  readonly pausedTemplate: string;
  /** Template used when nothing is playing; empty = hide. */
  readonly stoppedTemplate: string;
  readonly titleMaxLength: number;
  readonly progressBar: ProgressBarStyle;
  /** Show only for a while after the track changes. */
  readonly transient: boolean;
  readonly transientSeconds: number;
}

export interface HardwareOptions {
  readonly kind: 'hardware';
  readonly temperatureUnit: TemperatureUnit;
  /** Separator between the CPU / GPU / RAM / VRAM groups when using the generated layout. */
  readonly separator: string;
}

export interface TimeOptions {
  readonly kind: 'time';
  readonly use24Hour: boolean;
  readonly showSeconds: boolean;
  /** IANA zone id, empty = system local. */
  readonly timezone: string;
  readonly showTimezone: boolean;
}

export const WEATHER_LOCATION_MODES = ['city', 'coordinates', 'ip'] as const;
export type WeatherLocationMode = (typeof WEATHER_LOCATION_MODES)[number];

export interface WeatherOptions {
  readonly kind: 'weather';
  readonly temperatureUnit: TemperatureUnit;
  readonly locationMode: WeatherLocationMode;
  readonly city: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly updateIntervalMinutes: number;
}

export const HEARTRATE_PROVIDERS = ['pulsoid', 'hyperate', 'bluetooth', 'unknown'] as const;
export type HeartrateProvider = (typeof HEARTRATE_PROVIDERS)[number];

export interface HeartrateOptions {
  readonly kind: 'heartrate';
  readonly provider: HeartrateProvider;
  readonly smoothing: boolean;
  /** Template shown while the provider is disconnected; empty = hide. */
  readonly disconnectedTemplate: string;
}

export interface WindowOptions {
  readonly kind: 'window';
  readonly maxTitleLength: number;
  readonly privateAppLabel: string;
}

export interface VrBatteryOptions {
  readonly kind: 'vr_battery';
  readonly lowThresholdPercent: number;
  readonly showTrackers: boolean;
  readonly showControllers: boolean;
  readonly showHeadset: boolean;
}

export interface CustomOptions {
  readonly kind: 'custom';
  /** Countdown target as ISO-8601, when `{timer}` is used. */
  readonly timerTarget: string;
  /** File path for `{file_text}`. */
  readonly filePath: string;
}

export interface NoOptions {
  readonly kind:
    | 'status'
    | 'lyrics'
    | 'vrchat'
    | 'vr_performance'
    | 'network'
    | 'twitch'
    | 'tiktok'
    | 'discord'
    | 'soundpad'
    | 'voicemod'
    | 'speech';
}

export type SegmentOptions =
  | MediaOptions
  | HardwareOptions
  | TimeOptions
  | WeatherOptions
  | HeartrateOptions
  | WindowOptions
  | VrBatteryOptions
  | CustomOptions
  | NoOptions;

export interface Segment {
  readonly id: string;
  readonly kind: SegmentKind;
  readonly enabled: boolean;
  readonly visibility: SegmentVisibility;
  /** Canonical template, see `model/template.ts`. */
  readonly template: string;
  readonly options: SegmentOptions;
}

export const DEFAULT_PROGRESS_BAR: ProgressBarStyle = {
  length: 10,
  filled: '━',
  empty: '━',
  position: '●',
  start: '┣',
  end: '┫',
};

/** Default template and options for each kind; used by generators and codecs. */
export function defaultSegmentOptions(kind: SegmentKind): SegmentOptions {
  switch (kind) {
    case 'media':
      return {
        kind,
        pausedTemplate: '⏸ {artist} - {title}',
        stoppedTemplate: '',
        titleMaxLength: 0,
        progressBar: DEFAULT_PROGRESS_BAR,
        transient: false,
        transientSeconds: 25,
      };
    case 'hardware':
      return { kind, temperatureUnit: 'C', separator: ' ¦ ' };
    case 'time':
      return { kind, use24Hour: true, showSeconds: false, timezone: '', showTimezone: false };
    case 'weather':
      return {
        kind,
        temperatureUnit: 'C',
        locationMode: 'city',
        city: '',
        latitude: 0,
        longitude: 0,
        updateIntervalMinutes: 10,
      };
    case 'heartrate':
      return { kind, provider: 'pulsoid', smoothing: true, disconnectedTemplate: '' };
    case 'window':
      return { kind, maxTitleLength: 35, privateAppLabel: '🔒 App' };
    case 'vr_battery':
      return {
        kind,
        lowThresholdPercent: 20,
        showTrackers: true,
        showControllers: true,
        showHeadset: true,
      };
    case 'custom':
      return { kind, timerTarget: '', filePath: '' };
    case 'status':
    case 'lyrics':
    case 'vrchat':
    case 'vr_performance':
    case 'network':
    case 'twitch':
    case 'tiktok':
    case 'discord':
    case 'soundpad':
    case 'voicemod':
    case 'speech':
      return { kind };
  }
}

export const DEFAULT_SEGMENT_TEMPLATES: Readonly<Record<SegmentKind, string>> = {
  status: '{status}',
  media: '▶ {artist} - {title}',
  lyrics: '♪ {lyrics}',
  hardware: 'CPU {cpu_usage} ¦ GPU {gpu_temp} ¦ RAM {ram_usage}',
  time: '{time}',
  weather: '{weather_emoji} {weather_temp}',
  heartrate: '♥ {heartrate} bpm',
  window: '{device_mode} ⁱⁿ {window_title}',
  vrchat: '{vrc_master}🌎 {vrc_world} | 👥 {vrc_player_count}/{vrc_instance_capacity}',
  vr_battery: '🔋 HMD {hmd_battery} · L {left_controller_battery} · R {right_controller_battery}',
  vr_performance: '{vr_fps} fps ¦ {vr_reprojection} reproj',
  network: '↓ {net_down}',
  twitch: '{twitch_live} | playing {twitch_game} | {twitch_viewers} viewers',
  tiktok: 'LIVE @{tiktok_host} | {tiktok_viewers} viewers | {tiktok_likes} likes',
  discord: '🔊 {discord_channel} ({discord_count}) | 🎙️ {discord_speaking}',
  soundpad: "🎶 '{soundpad_sound}'",
  voicemod: "🎙️ '{voicemod_voice}'",
  speech: '{speech_text}',
  custom: '',
};

export function createSegment(kind: SegmentKind, overrides: Partial<Segment> = {}): Segment {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    kind,
    enabled: overrides.enabled ?? true,
    visibility: overrides.visibility ?? { desktop: true, vr: true },
    template: overrides.template ?? DEFAULT_SEGMENT_TEMPLATES[kind],
    options: overrides.options ?? defaultSegmentOptions(kind),
  };
}
