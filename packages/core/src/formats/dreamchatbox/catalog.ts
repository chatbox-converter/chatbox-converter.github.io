import type { PlaceholderName } from '../../model/placeholders';
import type { ProgressBarStyle } from '../../model/segments';

/**
 * Placeholder vocabulary of OSC-DreamChatbox (`core/textutils.py:135-194`,
 * format notes §3.3) and of the ecosystem plugins (ecosystem notes Part B).
 *
 * Dream → canonical: keys are lower-cased Dream names (spaces already folded
 * to `_`), values are canonical template snippets. A snippet may contain
 * several `{tokens}` or plain literal text.
 */
export type DreamTokenMap = Readonly<Record<string, string>>;

export const PLUGIN_IDS = [
  'world_stats',
  'vrcosc_modules',
  'stream_stats',
  'social_media',
] as const;
export type PluginId = (typeof PLUGIN_IDS)[number];

const BUILTIN_TOKENS: DreamTokenMap = {
  // status
  text: '{status}',
  // media
  artist: '{artist}',
  title: '{title}',
  song: '{title}',
  song_title: '{title}',
  songtitle: '{title}',
  player: '{player}',
  time: '{position}/{duration}',
  position: '{position}',
  time_status: '{position}',
  length: '{duration}',
  time_end: '{duration}',
  bar: '{progress_bar}',
  songbar: '{progress_bar}',
  lyrics: '{lyrics}',
  lyric: '{lyrics}',
  songtext: '{lyrics}',
  liedtext: '{lyrics}',
  icon_sound: '🎵',
  media_idle: '',
  // hardware
  gpu_name: '{gpu_name}',
  gpu_usage: '{gpu_usage}',
  gpu_temp: '{gpu_temp}',
  gpu_temperature: '{gpu_temp}',
  gpu_power: '{gpu_power}',
  gpu_watt: '{gpu_power}',
  gpu_watts: '{gpu_power}',
  gpu_w: '{gpu_power}',
  gpupower: '{gpu_power}',
  vram_usage: '{vram_used}/{vram_total}',
  vram: '{vram_used}/{vram_total}',
  vram_pct: '{vram_usage}',
  cpu_name: '{cpu_name}',
  cpu_usage: '{cpu_usage}',
  cpu_temp: '{cpu_temp}',
  cpu_temperature: '{cpu_temp}',
  cpu_power: '{cpu_power}',
  cpu_watt: '{cpu_power}',
  cpu_watts: '{cpu_power}',
  cpu_w: '{cpu_power}',
  cpupower: '{cpu_power}',
  ram_usage: '{ram_used}/{ram_total}',
  ram: '{ram_used}/{ram_total}',
  ram_pct: '{ram_usage}',
  temp_icon: '',
  tempicon: '',
  temp: '',
  icon_flame: '🔥',
  // chat / speech
  text_input: '{speech_text}',
  textinput: '{speech_text}',
  text_output: '{translation}',
  textoutput: '{translation}',
  chat_input: '{speech_text}',
  chatinput: '{speech_text}',
  chat_in: '{speech_text}',
  chat_output: '{translation}',
  chatoutput: '{translation}',
  chat_out: '{translation}',
  chat: '{translation}',
  chattext: '{translation}',
  stt_input: '{speech_text}',
  sttinput: '{speech_text}',
  stt_in: '{speech_text}',
  spoken: '{speech_text}',
  said: '{speech_text}',
  heard: '{speech_text}',
  stt_output: '{translation}',
  sttoutput: '{translation}',
  stt_out: '{translation}',
  ttt_input: '{speech_text}',
  tttinput: '{speech_text}',
  ttt_in: '{speech_text}',
  typed: '{speech_text}',
  ttt_output: '{translation}',
  tttoutput: '{translation}',
  ttt_out: '{translation}',
  // box / afk
  box_clock: '{time}',
  afk_time: '{afk_duration}',
};

/** Plugin placeholders, one table per plugin so new plugins are a single entry. */
export const PLUGIN_TOKENS: Readonly<Record<PluginId, DreamTokenMap>> = {
  world_stats: {
    player_in_world: '{vrc_player_count}',
    playerin_word: '{vrc_player_count}',
    playerinworld: '{vrc_player_count}',
    player_count: '{vrc_player_count}',
    players: '{vrc_player_count}',
    playercount: '{vrc_player_count}',
    group_world: '{vrc_world}',
    world: '{vrc_world}',
    world_name: '{vrc_world}',
    groupworld: '{vrc_world}',
    worldname: '{vrc_world}',
    instance_type: '{vrc_instance_type}',
    instancetype: '{vrc_instance_type}',
    instance: '{vrc_instance_type}',
    realtime: '{time}',
    clock: '{time}',
    time_now: '{time}',
    pctime: '{time}',
    realdate: '{date}',
    fps: '{fps}',
    fps_raw: '{fps}',
    hmd_battery: '{hmd_battery}',
    hmd_battery_raw: '{hmd_battery}',
    controller_battery: 'L {left_controller_battery} R {right_controller_battery}',
    tracker_battery: '{tracker_lowest_battery}',
  },
  vrcosc_modules: {
    hw_cpu: '{cpu_usage} {cpu_temp}',
    hw_cpu_usage: '{cpu_usage}',
    hw_cpu_temp: '{cpu_temp}',
    hw_cpu_power: '{cpu_power}',
    hw_cpu_name: '{cpu_name}',
    hw_gpu: '{gpu_usage} {gpu_temp}',
    hw_gpu_usage: '{gpu_usage}',
    hw_gpu_temp: '{gpu_temp}',
    hw_gpu_power: '{gpu_power}',
    hw_gpu_name: '{gpu_name}',
    hw_ram: '{ram_used}/{ram_total}',
    hw_ram_usage: '{ram_usage}',
    hw_ram_used: '{ram_used}',
    hw_ram_total: '{ram_total}',
    hw_vram: '{vram_used}/{vram_total}',
    hw_vram_usage: '{vram_usage}',
    hw_vram_used: '{vram_used}',
    hw_vram_total: '{vram_total}',
    hw_net: '↓ {net_down} ↑ {net_up}',
    hw_net_rx: '{net_down}',
    hw_net_tx: '{net_up}',
    hw_fps: '{fps}',
    hw_vr_mode: '{device_mode}',
    hw_window: '{window_title}',
    hw_process: '{window_app}',
    md_media: '{play_icon} {title} - {artist}',
    md_title: '{title}',
    md_artist: '{artist}',
    md_player: '{player}',
    md_status: '{play_icon}',
    md_position: '{position}',
    md_duration: '{duration}',
    md_progress: '{progress_bar}',
    md_volume: '{volume}',
    xr_vr: '{device_mode}',
    xr_mode: '{device_mode}',
  },
  stream_stats: {
    s_name: '{twitch_channel}',
    s_viewer: '{twitch_viewers}',
    s_status: '{twitch_title}',
  },
  social_media: {
    sm_discord: '{discord_channel}',
    sm_guild: '{discord_channel}',
    sm_channel: '{discord_channel}',
    sm_tiktok: '{tiktok_host}',
  },
};

/** Every Dream / plugin token, prefixed plugin spellings (`{world_stats_fps}`) included. */
export const DREAM_TO_CANONICAL: DreamTokenMap = (() => {
  const merged: Record<string, string> = { ...BUILTIN_TOKENS };
  for (const plugin of PLUGIN_IDS) {
    for (const [token, snippet] of Object.entries(PLUGIN_TOKENS[plugin])) {
      merged[token] = snippet;
      merged[`${plugin}_${token}`] = snippet;
    }
  }
  // GG Stats plugin: `{gg-fps}` (hyphen, not a canonical token shape).
  merged['gg-fps'] = '{fps}';
  return merged;
})();

export interface DreamTarget {
  readonly token: string;
  /** Plugin the user must install for the token to resolve; undefined = built-in. */
  readonly plugin?: PluginId;
}

const builtin = (token: string): DreamTarget => ({ token });
const plugin = (token: string, id: PluginId): DreamTarget => ({ token, plugin: id });

/** Canonical → Dream. A missing entry means Dream has no provider at all. */
export const CANONICAL_TO_DREAM: Partial<Record<PlaceholderName, DreamTarget>> = {
  status: builtin('text'),
  afk_duration: builtin('afk_time'),
  artist: builtin('artist'),
  title: builtin('title'),
  player: builtin('player'),
  position: builtin('position'),
  duration: builtin('length'),
  progress_bar: builtin('bar'),
  lyrics: builtin('lyrics'),
  cpu_name: builtin('cpu_name'),
  cpu_usage: builtin('cpu_usage'),
  cpu_temp: builtin('cpu_temp'),
  cpu_power: builtin('cpu_power'),
  gpu_name: builtin('gpu_name'),
  gpu_usage: builtin('gpu_usage'),
  gpu_temp: builtin('gpu_temp'),
  gpu_power: builtin('gpu_power'),
  ram_usage: builtin('ram_pct'),
  vram_usage: builtin('vram_pct'),
  speech_text: builtin('text_input'),
  translation: builtin('text_output'),
  ram_used: plugin('hw_ram_used', 'vrcosc_modules'),
  ram_total: plugin('hw_ram_total', 'vrcosc_modules'),
  vram_used: plugin('hw_vram_used', 'vrcosc_modules'),
  vram_total: plugin('hw_vram_total', 'vrcosc_modules'),
  play_icon: plugin('md_status', 'vrcosc_modules'),
  volume: plugin('md_volume', 'vrcosc_modules'),
  net_down: plugin('hw_net_rx', 'vrcosc_modules'),
  net_up: plugin('hw_net_tx', 'vrcosc_modules'),
  window_title: plugin('hw_window', 'vrcosc_modules'),
  window_app: plugin('hw_process', 'vrcosc_modules'),
  device_mode: plugin('hw_vr_mode', 'vrcosc_modules'),
  fps: plugin('fps', 'world_stats'),
  vr_fps: plugin('fps', 'world_stats'),
  time: plugin('realtime', 'world_stats'),
  date: plugin('realdate', 'world_stats'),
  vrc_world: plugin('group_world', 'world_stats'),
  vrc_player_count: plugin('player_in_world', 'world_stats'),
  vrc_instance_type: plugin('instance_type', 'world_stats'),
  hmd_battery: plugin('hmd_battery', 'world_stats'),
  left_controller_battery: plugin('controller_battery', 'world_stats'),
  right_controller_battery: plugin('controller_battery', 'world_stats'),
  tracker_average_battery: plugin('tracker_battery', 'world_stats'),
  tracker_lowest_battery: plugin('tracker_battery', 'world_stats'),
  twitch_channel: plugin('s_name', 'stream_stats'),
  twitch_viewers: plugin('s_viewer', 'stream_stats'),
  twitch_title: plugin('s_status', 'stream_stats'),
  twitch_game: plugin('s_status', 'stream_stats'),
  tiktok_host: plugin('sm_tiktok', 'social_media'),
  discord_channel: plugin('sm_channel', 'social_media'),
};

/**
 * Canonical pairs that Dream expresses as ONE token; collapsed before the
 * per-token mapping so `{ram_used}/{ram_total}` round-trips to `{ram_usage}`.
 * The replacement is written as `{dream:<token>}` so it is not mistaken for a
 * canonical placeholder; `canonicalToDream` unwraps the marker at the end.
 */
export const CANONICAL_PAIR_COLLAPSE: readonly (readonly [RegExp, string])[] = [
  [/\{ram_used\}\/\{ram_total\}/gi, '{dream:ram_usage}'],
  [/\{vram_used\}\/\{vram_total\}/gi, '{dream:vram_usage}'],
  [/\{position\}\/\{duration\}/gi, '{dream:time}'],
  [/L \{left_controller_battery\} R \{right_controller_battery\}/gi, '{dream:controller_battery}'],
];
export const DREAM_MARKER = /\{dream:([a-z_]+)\}/g;

// ---------------------------------------------------------------- songbar presets

export const BAR_BASE_LENGTH = 13;

/** `media_bar_style` 0..5 (`core/textutils.py:30-37,89-132`); 6 = custom. */
export const BAR_PRESETS: readonly Omit<ProgressBarStyle, 'length'>[] = [
  { start: '[', filled: '─', empty: '─', position: '●', end: ']' },
  { start: '', filled: '─', empty: '─', position: '■', end: '' },
  { start: '[', filled: '█', empty: '░', position: '', end: ']' },
  { start: '', filled: '▰', empty: '▱', position: '', end: '' },
  { start: '', filled: '🎵', empty: '─', position: '', end: '' },
  { start: '', filled: '▓', empty: '░', position: '', end: '' },
];
export const BAR_CUSTOM_STYLE = 6;

// ---------------------------------------------------------------- box presets

export interface BoxFrame {
  readonly tl: string;
  readonly tf: string;
  readonly tr: string;
  readonly bl: string;
  readonly bf: string;
  readonly br: string;
}

/** `box_template` 0..11 (`core/boxstyle.py:43-83`); 12 = `box_custom_style`. */
export const BOX_PRESETS: readonly BoxFrame[] = [
  { tl: '┌', tf: '─', tr: '┐', bl: '└', bf: '─', br: '┘' },
  { tl: '┏', tf: '━', tr: '┓', bl: '┗', bf: '━', br: '┛' },
  { tl: '╔', tf: '═', tr: '╗', bl: '╚', bf: '═', br: '╝' },
  { tl: '╭', tf: '─', tr: '╮', bl: '╰', bf: '─', br: '╯' },
  { tl: '┌', tf: '╌', tr: '┐', bl: '└', bf: '╌', br: '┘' },
  { tl: '▛', tf: '▀', tr: '▜', bl: '▙', bf: '▄', br: '▟' },
  { tl: '', tf: '▔', tr: '', bl: '', bf: '▁', br: '' },
  { tl: '◤', tf: '━', tr: '◥', bl: '◣', bf: '━', br: '◢' },
  { tl: '✦', tf: '─', tr: '✦', bl: '✦', bf: '─', br: '✦' },
  { tl: '♡', tf: '─', tr: '♡', bl: '♡', bf: '─', br: '♡' },
  { tl: '≪', tf: '━', tr: '≫', bl: '≪', bf: '━', br: '≫' },
  { tl: '✧', tf: '･', tr: '✧', bl: '✧', bf: '･', br: '✧' },
];
export const BOX_CUSTOM_TEMPLATE = 12;
