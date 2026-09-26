import { isJsonObject, type JsonObject, type JsonValue } from '../../util/json';
import {
  AFK_PRESETS,
  AIO_MAX,
  APP_ORDER_KEYS,
  BOX_MODES,
  CLOCK_FORMATS,
  DEFAULT_AFK_TEXTS,
  DEFAULT_AFK_TIMER_TEXT,
  DEFAULT_HW_TEMPLATE,
  MAX_STATUS_CYCLE_SEC,
  MIN_STATUS_CYCLE_SEC,
  STATUS_SLOTS,
  STATUS_TEMPLATES,
  TEXT_LIMIT,
  clampInt,
  createDefaults,
  emptyAioSet,
  emptyGraph,
  emptyStatusTemplate,
  fixedList,
  hasText,
  isBool,
  isNum,
  isStr,
  list,
  normalizeAioSet,
  normalizeStatusTemplate,
  normalizeStyle,
  num,
  str,
} from './defaults';

const OLD_HW_TEMPLATES: readonly string[] = [
  '{gpu_name}: {gpu_usage} {gpu_temp} {vram_usage} | {cpu_name}: {cpu_usage} {cpu_temp} {ram_usage} {ram_type}',
  '{gpu_name}: {gpu_usage} {gpu_temp} | Vram {vram_usage} | {cpu_name}: {cpu_usage} {cpu_temp} {ram_usage} {ram_type}',
  '{gpu_name}: {gpu_usage} {gpu_temp} | VRAM {vram_usage} \\n {cpu_name}: {cpu_usage} {cpu_temp} \\n RAM {ram_usage} {ram_type}',
];

const CHAT_MODES: readonly string[] = ['direct', 'line', 'vars'];

/**
 * `defaults.update(stored)` followed by the migration chain of
 * `ConfigMixin.load_config` (`ui/config_mixin.py:531-938`), reduced to the
 * steps that change the meaning of a key. Unknown keys ride along untouched.
 */
export function normalizeConfig(stored: JsonObject): JsonObject {
  const cfg: JsonObject = { ...createDefaults(), ...stored };
  coerceTypes(cfg);
  migrateStatus(cfg);
  migrateAfk(cfg);
  migrateAio(cfg);
  migrateMisc(cfg, stored);
  return cfg;
}

/** Legacy keys are consumed on load and never written back (format notes §1). */
function dropKeys(cfg: JsonObject, keys: readonly string[]): void {
  for (const key of keys) {
    Reflect.deleteProperty(cfg, key);
  }
}

/** A stored value of the wrong JSON type falls back to the default, as Python's casts do. */
function coerceTypes(cfg: JsonObject): void {
  const defaults = createDefaults();
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = cfg[key];
    if (value === undefined || value === null) {
      cfg[key] = fallback;
      continue;
    }
    if (Array.isArray(fallback) !== Array.isArray(value)) {
      cfg[key] = fallback;
    } else if (!Array.isArray(fallback) && typeof fallback !== typeof value) {
      cfg[key] = fallback;
    } else if (typeof fallback === 'number' && !Number.isFinite(value)) {
      cfg[key] = fallback;
    }
  }
}

function migrateStatus(cfg: JsonObject): void {
  const texts = fixedList(cfg['status_texts'], STATUS_SLOTS, '', isStr);
  const legacy = str(cfg, 'status_text');
  if (legacy !== '' && !hasText(texts)) {
    texts[0] = legacy;
  }
  const styles = fixedList(cfg['status_styles'], STATUS_SLOTS, 'normal', isStr).map(normalizeStyle);
  const count = clampInt(num(cfg, 'status_count'), 1, STATUS_SLOTS);
  const rawTemplates = list(cfg, 'status_templates');
  const templates =
    rawTemplates.length === STATUS_TEMPLATES
      ? rawTemplates.map(normalizeStatusTemplate)
      : Array.from({ length: STATUS_TEMPLATES }, (_, i) => emptyStatusTemplate(i));
  const active = clampInt(num(cfg, 'status_template_active'), 0, STATUS_TEMPLATES - 1);
  const template = templates[active] ?? emptyStatusTemplate(active);
  const templateTexts = fixedList(template['texts'], STATUS_SLOTS, '', isStr);
  if (hasText(texts) && !hasText(templateTexts)) {
    template['texts'] = [...texts];
    template['styles'] = [...styles];
    template['count'] = count;
    cfg['status_texts'] = texts;
    cfg['status_styles'] = styles;
    cfg['status_count'] = count;
  } else {
    cfg['status_texts'] = [...templateTexts];
    cfg['status_styles'] = fixedList(template['styles'], STATUS_SLOTS, 'normal', isStr);
    cfg['status_count'] = template['count'] ?? 1;
  }
  templates[active] = template;
  cfg['status_templates'] = templates;
  cfg['status_template_active'] = active;
  cfg['status_cycle_sec'] = clampInt(
    num(cfg, 'status_cycle_sec'),
    MIN_STATUS_CYCLE_SEC,
    MAX_STATUS_CYCLE_SEC,
  );
  for (const key of [
    'hw_gpu_name_style',
    'hw_gpu2_name_style',
    'hw_cpu_name_style',
    'media_time_style',
    'afk_style',
  ]) {
    cfg[key] = normalizeStyle(cfg[key]);
  }
}

function migrateAfk(cfg: JsonObject): void {
  if (str(cfg, 'afk_param').trim() === '') {
    cfg['afk_param'] = 'AFK';
  }
  let preset = clampInt(num(cfg, 'afk_preset'), 0, AFK_PRESETS - 1);
  const stored = Array.isArray(cfg['afk_texts']) ? cfg['afk_texts'] : [];
  const texts = Array.from({ length: AFK_PRESETS }, (_, i) => {
    const item = stored[i];
    if (item === undefined) {
      return DEFAULT_AFK_TEXTS[i] ?? '';
    }
    return typeof item === 'string' ? item.slice(0, TEXT_LIMIT) : '';
  });
  // Pre-v1.1 AFK block: one free text (+ framed presets) → third preset.
  const legacyText = cfg['afk_text'];
  const legacyBoxes = cfg['afk_boxes'];
  let carried = '';
  if (isJsonObject(legacyBoxes) && isJsonObject(legacyBoxes['custom'])) {
    const text = legacyBoxes['custom']['text'];
    carried = typeof text === 'string' ? text.trim() : '';
  }
  if (carried === '' && typeof legacyText === 'string') {
    carried = legacyText.trim();
  }
  if (carried !== '') {
    texts[AFK_PRESETS - 1] = carried;
    preset = AFK_PRESETS - 1;
  }
  dropKeys(cfg, ['afk_text', 'afk_custom', 'afk_boxes', 'afk_frame']);
  cfg['afk_texts'] = texts;
  cfg['afk_preset'] = preset;
  if (str(cfg, 'afk_timer_text').trim() === '') {
    cfg['afk_timer_text'] = DEFAULT_AFK_TIMER_TEXT;
  }
}

function migrateAio(cfg: JsonObject): void {
  const rawSets = list(cfg, 'aio_sets');
  const sets =
    rawSets.length === AIO_MAX
      ? rawSets.map(normalizeAioSet)
      : Array.from({ length: AIO_MAX }, (_, i) => emptyAioSet(i));
  const active = clampInt(num(cfg, 'aio_set_active'), 0, AIO_MAX - 1);
  const set = sets[active] ?? emptyAioSet(active);
  const mirror: JsonObject = {
    templates: fixedList(cfg['aio_templates'], AIO_MAX, '', isStr),
    count: clampInt(num(cfg, 'aio_count'), 1, AIO_MAX),
    custom_time: fixedList(cfg['aio_custom_time'], AIO_MAX, false, isBool),
    custom_sec: fixedList(cfg['aio_custom_sec'], AIO_MAX, 10, isNum).map((s) =>
      clampInt(s, 2, 3600),
    ),
    graphs: fixedGraphs(cfg['aio_graphs']),
  };
  const setTexts = fixedList(set['templates'], AIO_MAX, '', isStr);
  const mirrorTexts = fixedList(mirror['templates'], AIO_MAX, '', isStr);
  const source = hasText(mirrorTexts) && !hasText(setTexts) ? mirror : set;
  for (const key of ['templates', 'count', 'custom_time', 'custom_sec', 'graphs']) {
    const value = source[key] ?? null;
    set[key] = structuredClone(value);
    cfg[`aio_${key}`] = structuredClone(value);
  }
  sets[active] = set;
  cfg['aio_sets'] = sets;
  cfg['aio_set_active'] = active;
  cfg['aio_heights'] = fixedList(cfg['aio_heights'], AIO_MAX, 0, isNum).map((h) =>
    clampInt(h, 0, 1200),
  );
  cfg['aio_mode'] = str(cfg, 'aio_mode') === 'advanced' ? 'advanced' : 'normal';
  dropKeys(cfg, ['aio_graph']);
}

function fixedGraphs(value: JsonValue | undefined): JsonValue[] {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: AIO_MAX }, (_, i) => {
    const graph = source[i];
    return isJsonObject(graph) ? graph : emptyGraph();
  });
}

function migrateMisc(cfg: JsonObject, stored: JsonObject): void {
  if (OLD_HW_TEMPLATES.includes(str(cfg, 'hw_custom_template'))) {
    cfg['hw_custom_template'] = DEFAULT_HW_TEMPLATE;
  }
  const valid: readonly string[] = APP_ORDER_KEYS;
  const order = list(cfg, 'app_order').filter(
    (key): key is string => typeof key === 'string' && valid.includes(key),
  );
  cfg['app_order'] = [...order, ...valid.filter((key) => !order.includes(key))];
  const legacyMode = cfg['chat_send_mode'];
  if (
    typeof legacyMode === 'string' &&
    CHAT_MODES.includes(legacyMode) &&
    str(cfg, 'stt_send_mode') === 'direct'
  ) {
    cfg['stt_send_mode'] = legacyMode;
  }
  if (!CHAT_MODES.includes(str(cfg, 'stt_send_mode'))) {
    cfg['stt_send_mode'] = 'direct';
  }
  dropKeys(cfg, ['chat_send_mode', 'hw_fps', 'hw_mangohud_dir', 'hw_fps_source']);
  cfg['media_idle_text'] = str(cfg, 'media_idle_text').slice(0, 20);
  cfg['media_bar_style'] = clampInt(num(cfg, 'media_bar_style'), 0, 6);
  cfg['box_template'] = clampInt(num(cfg, 'box_template'), 0, 12);
  const legacyWidth = cfg['box_width'];
  for (const key of ['box_width_top', 'box_width_bottom']) {
    const value = !(key in stored) && typeof legacyWidth === 'number' ? legacyWidth : num(cfg, key);
    cfg[key] = clampInt(value, 0, 40);
  }
  dropKeys(cfg, ['box_width']);
  for (const key of ['box_top_mode', 'box_bottom_mode']) {
    cfg[key] = (BOX_MODES as readonly string[]).includes(str(cfg, key)) ? str(cfg, key) : 'none';
  }
  for (const key of ['box_top_custom', 'box_bottom_custom']) {
    cfg[key] = str(cfg, key).slice(0, 120);
  }
  if (!(CLOCK_FORMATS as readonly string[]).includes(str(cfg, 'box_clock_format'))) {
    cfg['box_clock_format'] = 'hm24';
  }
}
