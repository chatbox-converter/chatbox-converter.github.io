import { isJsonObject, type JsonObject, type JsonValue } from '../../util/json';

/**
 * OSC-DreamChatbox defaults (`ui/config_mixin.py:157-508`, v1.5.8) and the
 * key-presence migrations `load_config` applies on every load.
 */
export const STATUS_SLOTS = 20;
export const STATUS_TEMPLATES = 10;
export const AIO_MAX = 10;
export const AFK_PRESETS = 3;
export const MIN_STATUS_CYCLE_SEC = 10;
export const MAX_STATUS_CYCLE_SEC = 3600;
export const TEXT_LIMIT = 142;
export const DEFAULT_AFK_TIMER_TEXT = 'for {afk_time}';
export const DEFAULT_HW_TEMPLATE =
  '🎮 {gpu_name} {gpu_usage} | {gpu_temp} {temp_icon} \\n ⚙️ {cpu_name} {cpu_usage} | {cpu_temp} {temp_icon} \\n VRAM {vram_usage} RAM {ram_usage} {ram_type}';
export const DEFAULT_MEDIA_TEMPLATE = '{artist} : {title} | {time}\\n{bar}';
export const DEFAULT_AFK_TEXTS: readonly string[] = [
  '💤 AFK / Away 💤',
  '💤 AFK \\n BRB – briefly away',
  '💤   AFK   💤',
];
export const APP_ORDER_KEYS = ['status', 'media', 'hardware'] as const;
export type AppOrderKey = (typeof APP_ORDER_KEYS)[number];
export const TEXT_STYLES = ['normal', 'super', 'sub'] as const;
export const BOX_MODES = ['none', 'clock', 'custom'] as const;
export const CLOCK_FORMATS = ['hm24', 'hms24', 'hm12', 'hm12ap'] as const;

/** Keys that belong to the machine, not to a profile (`core/profiles.py:63-73`, 19 since v1.5.7). */
export const APP_WIDE_KEYS: readonly string[] = [
  'profile_active',
  'profile_plugins_asked',
  'profile_save_on_exit',
  'osc_ip',
  'osc_port',
  'oscquery_enabled',
  'send_to_vrchat',
  'osc_input_enabled',
  'osc_input_port',
  'hotkey_input_enabled',
  'osc_ext_ip',
  'osc_ext_port',
  'osc_instant_send',
  'interval_sec',
  'theme',
  'theme_colors',
  'theme_background',
  'theme_opacity',
  'debug',
];

const fill = <T extends JsonValue>(size: number, value: T): T[] =>
  Array.from({ length: size }, () => structuredClone(value));

export function emptyStatusTemplate(index: number): JsonObject {
  return {
    name: `Template ${index + 1}`,
    texts: fill(STATUS_SLOTS, ''),
    styles: fill(STATUS_SLOTS, 'normal'),
    count: 1,
  };
}

export function emptyGraph(): JsonObject {
  return { nodes: [], edges: [] };
}

export function emptyAioSet(index: number): JsonObject {
  return {
    name: `Template ${index + 1}`,
    templates: fill(AIO_MAX, ''),
    count: 1,
    custom_time: fill(AIO_MAX, false),
    custom_sec: fill(AIO_MAX, 10),
    graphs: Array.from({ length: AIO_MAX }, emptyGraph),
  };
}

function defaultsPart1(): JsonObject {
  return {
    status_text: '',
    status_texts: fill(STATUS_SLOTS, ''),
    status_styles: fill(STATUS_SLOTS, 'normal'),
    status_count: 1,
    status_cycle_sec: 10,
    status_random: true,
    status_templates: Array.from({ length: STATUS_TEMPLATES }, (_, i) => emptyStatusTemplate(i)),
    status_template_active: 0,
    status_active: true,
    afk_detect: false,
    afk_manual: false,
    afk_param: 'AFK',
    afk_preset: 0,
    afk_texts: [...DEFAULT_AFK_TEXTS],
    afk_timer: false,
    afk_timer_text: DEFAULT_AFK_TIMER_TEXT,
    afk_style: 'normal',
    afk_solo: true,
    media_active: false,
    media_show_artist: true,
    media_show_title: true,
    media_title_max: 24,
    media_show_time: true,
    media_time_style: 'normal',
    media_time_seconds: true,
    media_show_lyrics: false,
    media_lyrics_local: false,
    media_lyrics_sources: ['lrclib', 'lyricsplus', 'betterlyrics'],
    media_lyrics_dir: '',
    media_lyrics_prefix_on: true,
    media_lyrics_prefix: '♪',
    // v1.5.7: Options › Profiles, save the active profile on exit (app-wide)
    profile_save_on_exit: true,
    media_lyrics_max: 144,
    media_show_bar: true,
    oscquery_enabled: true,
    media_bar_style: 2,
    media_bar_size: 100,
    media_time_pos: 'line',
    media_bar_custom: { prefix: '[', filled: '█', empty: '░', knob: '', suffix: ']' },
    media_poll_sec: 1,
    media_source: '',
    media_source_label: '',
    media_source_fallback: true,
    hw_active: false,
    app_order: [...APP_ORDER_KEYS],
    textbox_presets: [
      'Hey! How are you doing? 😊',
      'What are you up to? 👀',
      "What's up? status: chilling ✨",
      'BRB / AFK for a moment! ☕',
      'Cuddles please? 🥺',
      'PEANUTBUTTER',
      ...fill(14, ''),
    ],
    textbox_preset_count: 6,
    textbox_pause_sec: 10,
    textbox_order: ['chat', 'stt', 'presets'],
    stt_language: 'de-DE',
    stt_block: false,
    stt_output: '',
    stt_method: 'lingva',
  };
}

function defaultsPart2(): JsonObject {
  return {
    stt_mic: '',
    stt_deepl_key: '',
    stt_google_key: '',
    stt_libre_url: '',
    stt_libre_online_url: '',
    stt_libre_online_key: '',
    stt_libre_online_custom: false,
    stt_custom_snippet: '',
    stt_custom_file: '',
    stt_twoway_source: '',
    stt_twoway_language: 'en-US',
    stt_twoway_target: '',
    stt_twoway_energy_auto: true,
    stt_twoway_energy_threshold: 400,
    stt_twoway_pause_sec: 0.7,
    stt_twoway_min_phrase_sec: 0.3,
    stt_twoway_phrase_limit: 8,
    stt_twoway_send: false,
    stt_twoway_send_mode: 'vars',
    stt_twoway_filter_mode: 'off',
    stt_twoway_filter_only: 'VRChat',
    stt_twoway_filter_except: 'Spotify, YouTube Music',
    stt_block_saved: [],
    stt_block_plugins: true,
    stt_block_box: true,
    stt_block_except: [],
    stt_mic_strict: true,
    stt_mic_show_raw: false,
    stt_energy_auto: true,
    stt_energy_threshold: 300,
    stt_pause_sec: 0.8,
    stt_min_phrase_sec: 0.3,
    stt_phrase_limit: 12,
    stt_send_mode: 'direct',
    chat_anchor: 'aio',
    chat_hold_sec: 0,
    stt_mode: 'stt',
    stt_show_both: false,
    aio_active: false,
    aio_mode: 'normal',
    osc_input_enabled: false,
    hotkey_input_enabled: false,
    stt_translate_notice: true,
    stt_translate_notice_text: 'Translate …',
    osc_input_port: 9001,
    osc_ext_ip: '127.0.0.1',
    osc_ext_port: 9002,
    aio_graphs: Array.from({ length: AIO_MAX }, emptyGraph),
    theme: 'default',
    theme_colors: {},
    theme_background: '',
    theme_opacity: 0.82,
    aio_count: 1,
    aio_sets: Array.from({ length: AIO_MAX }, (_, i) => emptyAioSet(i)),
    aio_set_active: 0,
    aio_rotate: false,
    aio_rotate_sec: 10,
    aio_templates: ['{text} \\n {artist} : {title} | {time} \\n {bar}', ...fill(AIO_MAX - 1, '')],
    aio_custom_time: fill(AIO_MAX, false),
    aio_custom_sec: fill(AIO_MAX, 10),
  };
}

function defaultsPart3(): JsonObject {
  return {
    aio_heights: fill(AIO_MAX, 0),
    box_active: false,
    box_template: 2,
    box_custom_style: { tl: '‹', tf: '·', tr: '›', bl: '‹', bf: '·', br: '›' },
    box_width_top: 7,
    box_width_bottom: 3,
    box_align: false,
    box_top_on: true,
    box_bottom_on: true,
    box_top_mode: 'custom',
    box_top_custom: '🕐{box_clock}🕐',
    box_bottom_mode: 'custom',
    box_bottom_custom: 'OSC-DreamChatbox',
    box_clock_live: true,
    box_clock_format: 'hm24',
    media_idle: true,
    media_idle_text: '⏸',
    hw_flame: false,
    hw_custom: false,
    hw_custom_template: DEFAULT_HW_TEMPLATE,
    media_icon: false,
    media_custom: false,
    media_custom_template: DEFAULT_MEDIA_TEMPLATE,
    hw_poll_sec: 2,
    hw_gpu_usage: true,
    hw_gpu_name: true,
    hw_gpu_custom: false,
    hw_gpu_custom_name: '',
    hw_gpu_name_style: 'normal',
    hw_gpu_temp: true,
    hw_gpu_power: false,
    hw_gpu_select: '',
    hw_gpu2: false,
    hw_gpu2_select: '',
    hw_gpu2_mode: 'line',
    hw_gpu2_usage: true,
    hw_gpu2_temp: true,
    hw_gpu2_power: false,
    hw_gpu2_name: true,
    hw_gpu2_custom: false,
    hw_gpu2_custom_name: '',
    hw_gpu2_name_style: 'normal',
    hw_gpu2_vram_used: false,
    hw_gpu2_vram_pct: false,
    hw_vram_used: true,
    hw_vram_pct: false,
    hw_ram_used: true,
    hw_ram_pct: false,
    hw_ram_type: '',
    hw_cpu_usage: true,
    hw_cpu_name: true,
    hw_cpu_custom: false,
    hw_cpu_custom_name: '',
    hw_cpu_name_style: 'normal',
    hw_cpu_temp: true,
    hw_cpu_power: false,
    send_to_vrchat: false,
    interval_sec: 5,
    osc_instant_send: true,
    slim_chatbox: true,
  };
}

function defaultsPart4(): JsonObject {
  return {
    osc_ip: '127.0.0.1',
    osc_port: 9000,
    debug: false,
    profile_active: '',
  };
}

/** The defaults dict in its original insertion order (§8.1 of the format notes). */
export function createDefaults(): JsonObject {
  return { ...defaultsPart1(), ...defaultsPart2(), ...defaultsPart3(), ...defaultsPart4() };
}

const DEFAULTS = createDefaults();

// ---------------------------------------------------------------- accessors

export function str(cfg: JsonObject, key: string): string {
  const value = cfg[key];
  if (typeof value === 'string') {
    return value;
  }
  const fallback = DEFAULTS[key];
  return typeof fallback === 'string' ? fallback : '';
}

export function num(cfg: JsonObject, key: string): number {
  const value = cfg[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const fallback = DEFAULTS[key];
  return typeof fallback === 'number' ? fallback : 0;
}

export function bool(cfg: JsonObject, key: string): boolean {
  const value = cfg[key];
  if (typeof value === 'boolean') {
    return value;
  }
  const fallback = DEFAULTS[key];
  return typeof fallback === 'boolean' ? fallback : false;
}

export function obj(cfg: JsonObject, key: string): JsonObject {
  const value = cfg[key];
  if (isJsonObject(value)) {
    return value;
  }
  const fallback = DEFAULTS[key];
  return isJsonObject(fallback) ? structuredClone(fallback) : {};
}

export function list(cfg: JsonObject, key: string): JsonValue[] {
  const value = cfg[key];
  return Array.isArray(value) ? value : [];
}

/** Pad/truncate to `size`, replacing entries of the wrong type with `filler`. */
export function fixedList<T extends string | number | boolean>(
  value: JsonValue | undefined,
  size: number,
  filler: T,
  accept: (item: JsonValue) => item is T,
): T[] {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: size }, (_, i) => {
    const item = source[i];
    return item !== undefined && accept(item) ? item : filler;
  });
}

export const isStr = (v: JsonValue): v is string => typeof v === 'string';
export const isNum = (v: JsonValue): v is number => typeof v === 'number' && Number.isFinite(v);
export const isBool = (v: JsonValue): v is boolean => typeof v === 'boolean';

export function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeStyle(value: JsonValue | undefined): string {
  return typeof value === 'string' && (TEXT_STYLES as readonly string[]).includes(value)
    ? value
    : 'normal';
}

export function normalizeStatusTemplate(value: JsonValue, index: number): JsonObject {
  const source = isJsonObject(value) ? value : {};
  const name = source['name'];
  const count = source['count'];
  return {
    ...source,
    name: typeof name === 'string' ? name : `Template ${index + 1}`,
    texts: fixedList(source['texts'], STATUS_SLOTS, '', isStr),
    styles: fixedList(source['styles'], STATUS_SLOTS, 'normal', isStr).map(normalizeStyle),
    count: clampInt(typeof count === 'number' ? count : 1, 1, STATUS_SLOTS),
  };
}

export function normalizeAioSet(value: JsonValue, index: number): JsonObject {
  const source = isJsonObject(value) ? value : {};
  const name = source['name'];
  const count = source['count'];
  const graphs = Array.isArray(source['graphs']) ? source['graphs'] : [];
  return {
    ...source,
    name: typeof name === 'string' ? name : `Template ${index + 1}`,
    templates: fixedList(source['templates'], AIO_MAX, '', isStr),
    count: clampInt(typeof count === 'number' ? count : 1, 1, AIO_MAX),
    custom_time: fixedList(source['custom_time'], AIO_MAX, false, isBool),
    custom_sec: fixedList(source['custom_sec'], AIO_MAX, 10, isNum).map((s) =>
      clampInt(s, 2, 3600),
    ),
    graphs: Array.from({ length: AIO_MAX }, (_, i) => {
      const graph = graphs[i];
      return isJsonObject(graph) ? graph : emptyGraph();
    }),
  };
}

export const hasText = (items: readonly string[]): boolean =>
  items.some((item) => item.trim() !== '');
