/**
 * Canonical placeholder vocabulary shared by every format.
 *
 * Each format maps its own variables onto these names (VRCOSC `{0}` positional
 * variables, DreamChatbox `{artist}`-style names, MagicChatbox per-integration
 * templates). Anything a format cannot provide is reported as a conversion loss.
 */
export const PLACEHOLDER_CATEGORIES = [
  'status',
  'afk',
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
] as const;

export type PlaceholderCategory = (typeof PLACEHOLDER_CATEGORIES)[number];

export type PlaceholderValueType =
  'string' | 'int' | 'float' | 'percent' | 'duration' | 'datetime' | 'progress' | 'bool';

export interface PlaceholderDefinition {
  readonly label: string;
  readonly category: PlaceholderCategory;
  readonly type: PlaceholderValueType;
  /** Value used by the live preview. */
  readonly sample: string;
  readonly description?: string;
}

function def(
  label: string,
  category: PlaceholderCategory,
  type: PlaceholderValueType,
  sample: string,
  description?: string,
): PlaceholderDefinition {
  return description === undefined
    ? { label, category, type, sample }
    : { label, category, type, sample, description };
}

export const PLACEHOLDERS = {
  // status / afk
  status: def(
    'Status text',
    'status',
    'string',
    'Enjoy 💖',
    'The currently active personal status.',
  ),
  afk_duration: def('AFK duration', 'afk', 'duration', '12m', 'How long you have been away.'),
  // media
  artist: def('Artist', 'media', 'string', 'Ado'),
  title: def('Title', 'media', 'string', 'Show'),
  album: def('Album', 'media', 'string', 'Kyougen'),
  player: def('Player', 'media', 'string', 'Spotify'),
  position: def('Position', 'media', 'duration', '1:18'),
  duration: def('Duration', 'media', 'duration', '3:47'),
  remaining: def('Remaining', 'media', 'duration', '2:29'),
  progress_bar: def('Progress bar', 'media', 'progress', '┣━━━●━━━━━━┫'),
  progress_percent: def('Progress %', 'media', 'percent', '35%'),
  play_icon: def('Play/pause icon', 'media', 'string', '▶'),
  volume: def('Volume', 'media', 'percent', '60%'),
  // lyrics
  lyrics: def('Lyric line', 'lyrics', 'string', '世界中の誰よりきっと'),
  // hardware
  cpu_name: def('CPU name', 'hardware', 'string', 'Ryzen 7 7800X3D'),
  cpu_usage: def('CPU usage', 'hardware', 'percent', '34%'),
  cpu_temp: def('CPU temperature', 'hardware', 'int', '58°C'),
  cpu_power: def('CPU power', 'hardware', 'int', '65W'),
  gpu_name: def('GPU name', 'hardware', 'string', 'RTX 4080'),
  gpu_usage: def('GPU usage', 'hardware', 'percent', '62%'),
  gpu_temp: def('GPU temperature', 'hardware', 'int', '62°C'),
  gpu_power: def('GPU power', 'hardware', 'int', '213W'),
  ram_used: def('RAM used', 'hardware', 'float', '14GB'),
  ram_total: def('RAM total', 'hardware', 'float', '32GB'),
  ram_usage: def('RAM usage', 'hardware', 'percent', '44%'),
  vram_used: def('VRAM used', 'hardware', 'float', '9GB'),
  vram_total: def('VRAM total', 'hardware', 'float', '16GB'),
  vram_usage: def('VRAM usage', 'hardware', 'percent', '56%'),
  fps: def('FPS', 'hardware', 'int', '90'),
  // time
  time: def('Time', 'time', 'datetime', '21:41'),
  date: def('Date', 'time', 'datetime', '2026-09-26'),
  timezone: def('Time zone', 'time', 'string', 'CEST'),
  // weather
  weather_temp: def('Temperature', 'weather', 'int', '14°C'),
  weather_feels_like: def('Feels like', 'weather', 'int', '12°C'),
  weather_condition: def('Condition', 'weather', 'string', 'Rain'),
  weather_emoji: def('Condition emoji', 'weather', 'string', '🌧'),
  weather_humidity: def('Humidity', 'weather', 'percent', '81%'),
  weather_wind: def('Wind', 'weather', 'string', '18 km/h'),
  // heart rate
  heartrate: def('Heart rate', 'heartrate', 'int', '82'),
  heartrate_avg: def('Average heart rate', 'heartrate', 'int', '78'),
  heartrate_min: def('Minimum heart rate', 'heartrate', 'int', '61'),
  heartrate_max: def('Maximum heart rate', 'heartrate', 'int', '112'),
  heartrate_trend: def('Heart rate trend', 'heartrate', 'string', '↑'),
  // window
  window_title: def('Focused window title', 'window', 'string', 'Blender'),
  window_app: def('Focused app name', 'window', 'string', 'blender'),
  device_mode: def('VR or desktop', 'window', 'string', 'On desktop'),
  // vrchat
  vrc_world: def('World name', 'vrchat', 'string', 'The Great Pug'),
  vrc_player_count: def('Players in instance', 'vrchat', 'int', '24'),
  vrc_instance_capacity: def('Instance capacity', 'vrchat', 'int', '40'),
  vrc_instance_type: def('Instance type', 'vrchat', 'string', 'friends+'),
  vrc_region: def('Instance region', 'vrchat', 'string', 'US-West'),
  vrc_master: def('Instance master marker', 'vrchat', 'string', '👑'),
  // vr battery
  hmd_battery: def('Headset battery', 'vr_battery', 'percent', '62%'),
  left_controller_battery: def('Left controller battery', 'vr_battery', 'percent', '41%'),
  right_controller_battery: def('Right controller battery', 'vr_battery', 'percent', '88%'),
  tracker_average_battery: def('Average tracker battery', 'vr_battery', 'percent', '73%'),
  tracker_lowest_battery: def('Lowest tracker battery', 'vr_battery', 'percent', '19%'),
  tracker_lowest_name: def('Lowest tracker name', 'vr_battery', 'string', 'Left foot'),
  // vr performance
  vr_fps: def('VR FPS', 'vr_performance', 'int', '90'),
  vr_target_hz: def('Headset refresh rate', 'vr_performance', 'int', '90'),
  vr_reprojection: def('Reprojection ratio', 'vr_performance', 'percent', '3%'),
  vr_dropped_frames: def('Dropped frames', 'vr_performance', 'int', '0'),
  // network
  net_down: def('Download speed', 'network', 'string', '842 Mbps'),
  net_up: def('Upload speed', 'network', 'string', '96 Mbps'),
  net_max_down: def('Peak download', 'network', 'string', '940 Mbps'),
  net_max_up: def('Peak upload', 'network', 'string', '110 Mbps'),
  net_total_down: def('Total downloaded', 'network', 'string', '12.4 GB'),
  net_total_up: def('Total uploaded', 'network', 'string', '1.1 GB'),
  net_utilization: def('Network utilisation', 'network', 'percent', '84%'),
  // twitch
  twitch_live: def('Live indicator', 'twitch', 'string', 'LIVE'),
  twitch_channel: def('Channel', 'twitch', 'string', 'boihanny'),
  twitch_game: def('Category', 'twitch', 'string', 'VRChat'),
  twitch_title: def('Stream title', 'twitch', 'string', 'chill hangout'),
  twitch_viewers: def('Viewers', 'twitch', 'int', '123'),
  twitch_followers: def('Followers', 'twitch', 'int', '4.2k'),
  // tiktok
  tiktok_host: def('Host', 'tiktok', 'string', 'host'),
  tiktok_viewers: def('Viewers', 'tiktok', 'int', '312'),
  tiktok_likes: def('Likes', 'tiktok', 'int', '1.8k'),
  tiktok_followers: def('Followers', 'tiktok', 'int', '9.1k'),
  // discord
  discord_channel: def('Voice channel', 'discord', 'string', 'General'),
  discord_count: def('People in channel', 'discord', 'int', '4'),
  discord_speaking: def('Who is speaking', 'discord', 'string', 'Ada, Kim'),
  discord_mute_state: def('Mute/deafen state', 'discord', 'string', 'ᵐᵘᵗᵉᵈ'),
  // soundpad / voicemod
  soundpad_sound: def('Soundpad sound', 'soundpad', 'string', 'airhorn.mp3'),
  voicemod_voice: def('Voicemod voice', 'voicemod', 'string', 'Robot'),
  voicemod_sound: def('Voicemod sound', 'voicemod', 'string', 'drumroll'),
  // speech
  speech_text: def('Speech to text', 'speech', 'string', 'hello there'),
  translation: def('Translation', 'speech', 'string', 'hallo'),
  // custom
  timer: def('Countdown timer', 'custom', 'duration', '00:14:59'),
  file_text: def('File contents', 'custom', 'string', 'text from a file'),
} as const satisfies Record<string, PlaceholderDefinition>;

export type PlaceholderName = keyof typeof PLACEHOLDERS;

export const PLACEHOLDER_NAMES = Object.keys(PLACEHOLDERS) as readonly PlaceholderName[];

export function isPlaceholderName(name: string): name is PlaceholderName {
  return Object.hasOwn(PLACEHOLDERS, name);
}

export function placeholdersInCategory(category: PlaceholderCategory): PlaceholderName[] {
  return PLACEHOLDER_NAMES.filter((name) => PLACEHOLDERS[name].category === category);
}
