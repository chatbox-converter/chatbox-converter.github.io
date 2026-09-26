import { activeStatus, type ChatboxProfile, type StatusItem } from '../../model/profile';
import type { ProgressBarStyle, Segment, SegmentKind } from '../../model/segments';
import { placeholdersIn } from '../../model/template';
import { isJsonObject, stringifyPretty, type JsonObject } from '../../util/json';
import type { ConfigFile, DiagnosticCollector, SerializeResult } from '../codec';
import { DiagnosticCollector as Collector } from '../codec';
import { frameFor, matchBoxLine } from './box';
import {
  BAR_BASE_LENGTH,
  BAR_CUSTOM_STYLE,
  BAR_PRESETS,
  BOX_CUSTOM_TEMPLATE,
  type PluginId,
} from './catalog';
import {
  AIO_MAX,
  APP_ORDER_KEYS,
  APP_WIDE_KEYS,
  MAX_STATUS_CYCLE_SEC,
  MIN_STATUS_CYCLE_SEC,
  STATUS_SLOTS,
  STATUS_TEMPLATES,
  TEXT_LIMIT,
  bool,
  clampInt,
  fixedList,
  isStr,
  list,
  num,
  str,
} from './defaults';
import { normalizeConfig } from './normalize';
import { PLUGIN_LABELS, canonicalToDream, reportToDream } from './tokens';

/** Kinds Dream renders as its own app in normal mode. */
const APP_KINDS: readonly SegmentKind[] = ['status', 'media', 'lyrics', 'hardware', 'time'];

interface SerializeState {
  readonly cfg: JsonObject;
  readonly profile: ChatboxProfile;
  readonly collector: DiagnosticCollector;
  readonly plugins: Set<PluginId>;
}

export function serializeDream(profile: ChatboxProfile): SerializeResult {
  const extras = profile.extras.dreamchatbox;
  const cfg = normalizeConfig(isJsonObject(extras) ? extras : {});
  const state: SerializeState = { cfg, profile, collector: new Collector(), plugins: new Set() };
  writeStatuses(state);
  writeAfk(state);
  writeApps(state);
  const aio = writeAio(state);
  writeBox(state, aio);
  writeOutput(state);
  for (const plugin of state.plugins) {
    state.collector.info(
      'plugin-required',
      `The generated template requires the ${PLUGIN_LABELS[plugin]} plugin (${plugin}).`,
      'config.json',
    );
  }
  const name = cleanProfileName(profile.meta.name);
  cfg['profile_active'] = name;
  const files: ConfigFile[] = [{ path: 'config.json', content: stringifyPretty(cfg) }];
  if (name !== '') {
    const body = Object.fromEntries(
      Object.entries(cfg).filter(([key]) => !APP_WIDE_KEYS.includes(key)),
    );
    files.push({ path: `profiles/${name}.json`, content: stringifyPretty(body) });
  }
  return { files, diagnostics: state.collector.all() };
}

/** `core/profiles.py:52-60`: file-system characters dropped, dots trimmed, 40 chars. */
export function cleanProfileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|\p{Cc}]/gu, '')
    .trim()
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40)
    .trim();
}

function toDream(state: SerializeState, template: string, path: string): string {
  const result = canonicalToDream(template);
  reportToDream(result, state.collector, path, state.plugins);
  return result.template;
}

// ---------------------------------------------------------------- statuses

function writeStatuses(state: SerializeState): void {
  const { cfg, profile, collector } = state;
  const templates = list(cfg, 'status_templates').map((raw) => (isJsonObject(raw) ? raw : {}));
  const previous = templates.map((t) => ({
    texts: fixedList(t['texts'], STATUS_SLOTS, '', isStr),
    styles: fixedList(t['styles'], STATUS_SLOTS, 'normal', isStr),
  }));
  for (const template of templates) {
    template['texts'] = Array.from({ length: STATUS_SLOTS }, () => '');
    template['styles'] = Array.from({ length: STATUS_SLOTS }, () => 'normal');
    template['count'] = 1;
  }
  const groups = new Map<string, StatusItem[]>();
  for (const item of profile.statuses) {
    groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  }
  const active = activeStatus(profile);
  const used = new Set<number>();
  let activeIndex = 0;
  for (const [group, items] of groups) {
    let index = templates.findIndex((t, i) => !used.has(i) && str(t, 'name') === group);
    if (index < 0) {
      index = templates.findIndex((_, i) => !used.has(i));
    }
    const template = templates[index];
    if (index < 0 || template === undefined) {
      collector.warn(
        'limit-exceeded',
        `DreamChatbox has only ${STATUS_TEMPLATES} status templates; group "${group}" was dropped.`,
        'config.json#status_templates',
      );
      continue;
    }
    used.add(index);
    const isActiveGroup = active?.group === group;
    if (isActiveGroup) {
      activeIndex = index;
    }
    const ordered = orderStatuses(items, isActiveGroup ? profile.statusCycle.enabled : true);
    if (ordered.length > STATUS_SLOTS) {
      collector.warn(
        'limit-exceeded',
        `DreamChatbox keeps at most ${STATUS_SLOTS} statuses per template; ${ordered.length - STATUS_SLOTS} were dropped from "${group}".`,
        'config.json#status_templates',
      );
    }
    const kept = ordered.slice(0, STATUS_SLOTS);
    const old = previous[index];
    const texts = Array.from({ length: STATUS_SLOTS }, (_, i) =>
      toDream(state, kept[i]?.text ?? '', 'config.json#status_templates'),
    );
    template['texts'] = texts;
    template['styles'] = texts.map((text, i) =>
      old?.texts[i] === text ? (old.styles[i] ?? 'normal') : 'normal',
    );
    const cycling = kept.filter((item) => item.useInCycle).length;
    template['count'] = Math.max(1, isActiveGroup && !profile.statusCycle.enabled ? 1 : cycling);
    if (group === '' || str(template, 'name') === '') {
      template['name'] = `Template ${index + 1}`;
    } else {
      template['name'] = group;
    }
  }
  cfg['status_templates'] = templates;
  cfg['status_template_active'] = activeIndex;
  const current = templates[activeIndex];
  cfg['status_texts'] = structuredClone(current?.['texts'] ?? []);
  cfg['status_styles'] = structuredClone(current?.['styles'] ?? []);
  cfg['status_count'] = current?.['count'] ?? 1;
  const seconds = clampInt(
    profile.statusCycle.intervalSeconds,
    MIN_STATUS_CYCLE_SEC,
    MAX_STATUS_CYCLE_SEC,
  );
  if (seconds !== Math.round(profile.statusCycle.intervalSeconds)) {
    collector.warn(
      'value-clamped',
      `Status cycle interval was clamped to ${seconds} s (DreamChatbox allows ${MIN_STATUS_CYCLE_SEC}-${MAX_STATUS_CYCLE_SEC}).`,
      'config.json#status_cycle_sec',
    );
  }
  cfg['status_cycle_sec'] = seconds;
  cfg['status_random'] = profile.statusCycle.random;
}

/** Cycling statuses first (Dream rotates the first `count`), the active one first when not cycling. */
function orderStatuses(items: readonly StatusItem[], cycling: boolean): StatusItem[] {
  if (!cycling) {
    const active = items.find((item) => item.active);
    return active === undefined ? [...items] : [active, ...items.filter((i) => i !== active)];
  }
  return [...items.filter((i) => i.useInCycle), ...items.filter((i) => !i.useInCycle)];
}

// ---------------------------------------------------------------- afk

function writeAfk(state: SerializeState): void {
  const { cfg, profile, collector } = state;
  const { afk } = profile;
  cfg['afk_detect'] = afk.enabled;
  if (!afk.enabled) {
    cfg['afk_manual'] = false;
  }
  cfg['afk_solo'] = afk.replaceEverything;
  const preset = num(cfg, 'afk_preset');
  const texts = fixedList(cfg['afk_texts'], 3, '', isStr);
  const converted = toDream(state, afk.template, 'config.json#afk_texts');
  const timerText = str(cfg, 'afk_timer_text');
  const suffix = ` ${timerText}`;
  if (timerText.includes('{afk_time}') && converted.endsWith(suffix)) {
    texts[preset] = converted.slice(0, -suffix.length).slice(0, TEXT_LIMIT);
    cfg['afk_timer'] = true;
  } else {
    texts[preset] = converted.slice(0, TEXT_LIMIT);
    cfg['afk_timer'] = false;
  }
  cfg['afk_texts'] = texts;
  if (afk.enabled && afk.timeoutSeconds !== 120) {
    collector.info(
      'unsupported-feature',
      'DreamChatbox detects AFK from VRChat itself; the AFK timeout has no equivalent.',
      'config.json#afk_detect',
    );
  }
}

// ---------------------------------------------------------------- apps

function writeApps(state: SerializeState): void {
  const { cfg, profile } = state;
  const first = (kind: SegmentKind): Segment | undefined =>
    profile.segments.find((s) => s.kind === kind);
  const status = first('status');
  if (status !== undefined) {
    cfg['status_active'] = status.enabled;
  }
  const media = first('media');
  if (media !== undefined) {
    writeMedia(state, media);
  }
  const lyrics = first('lyrics');
  cfg['media_show_lyrics'] = lyrics?.enabled === true;
  if (lyrics !== undefined) {
    writeLyricsPrefix(state, lyrics);
  }
  const hardware = first('hardware');
  if (hardware !== undefined) {
    cfg['hw_active'] = hardware.enabled;
    cfg['hw_custom'] = true;
    cfg['hw_custom_template'] = toDream(state, hardware.template, 'config.json#hw_custom_template');
    if (hardware.options.kind === 'hardware' && hardware.options.temperatureUnit === 'F') {
      state.collector.unsupported('Fahrenheit temperatures', 'config.json#hw_custom_template');
    }
  }
  const valid: readonly string[] = APP_ORDER_KEYS;
  const order: string[] = profile.segments
    .map((s) => s.kind)
    .filter((kind, i, all) => valid.includes(kind) && all.indexOf(kind) === i);
  cfg['app_order'] = [...order, ...valid.filter((key) => !order.includes(key))];
}

function writeMedia(state: SerializeState, media: Segment): void {
  const { cfg, collector } = state;
  cfg['media_active'] = media.enabled;
  cfg['media_custom'] = true;
  cfg['media_custom_template'] = toDream(
    state,
    media.template,
    'config.json#media_custom_template',
  );
  cfg['media_icon'] = false;
  if (media.options.kind !== 'media') {
    return;
  }
  const options = media.options;
  cfg['media_title_max'] = clampInt(
    options.titleMaxLength === 0 ? 64 : options.titleMaxLength,
    3,
    64,
  );
  writeProgressBar(cfg, options.progressBar);
  const idle = options.pausedTemplate || options.stoppedTemplate;
  if (idle === '') {
    cfg['media_idle'] = false;
  } else if (placeholdersIn(idle).length === 0) {
    cfg['media_idle'] = true;
    cfg['media_idle_text'] = idle.slice(0, 20);
  } else {
    collector.info(
      'unsupported-feature',
      'DreamChatbox shows a fixed idle text while paused; placeholders in the paused template were not carried over.',
      'config.json#media_idle_text',
    );
  }
  if (options.transient) {
    collector.unsupported('Transient (show-for-a-while) media display', 'config.json#media_active');
  }
}

function writeProgressBar(cfg: JsonObject, bar: ProgressBarStyle): void {
  const preset = BAR_PRESETS.findIndex(
    (p) =>
      p.start === bar.start &&
      p.filled === bar.filled &&
      p.empty === bar.empty &&
      p.position === bar.position &&
      p.end === bar.end,
  );
  const base = preset === 1 ? bar.length * 2 : bar.length;
  cfg['media_bar_size'] = clampInt((base / BAR_BASE_LENGTH) * 100, 30, 100);
  if (preset >= 0) {
    cfg['media_bar_style'] = preset;
    return;
  }
  cfg['media_bar_style'] = BAR_CUSTOM_STYLE;
  cfg['media_bar_custom'] = {
    prefix: bar.start,
    filled: bar.filled,
    empty: bar.empty,
    knob: bar.position,
    suffix: bar.end,
  };
}

function writeLyricsPrefix(state: SerializeState, lyrics: Segment): void {
  const { cfg, collector } = state;
  const match = /^(\S{0,4}) ?\{lyrics\}$/u.exec(lyrics.template.trim());
  if (match === null) {
    collector.info(
      'unsupported-feature',
      'DreamChatbox lyrics are always "<prefix> <line>"; the lyrics template was reduced to its prefix.',
      'config.json#media_lyrics_prefix',
    );
    return;
  }
  const prefix = match[1] ?? '';
  cfg['media_lyrics_prefix_on'] = prefix !== '';
  if (prefix !== '') {
    cfg['media_lyrics_prefix'] = prefix;
  }
}

// ---------------------------------------------------------------- all-in-one

/** Returns true when the config was switched to (or kept in) All-in-one mode. */
function writeAio(state: SerializeState): boolean {
  const { cfg, profile, collector } = state;
  const enabled = profile.segments.filter((s) => s.enabled);
  const seen = new Set<SegmentKind>();
  let needsAio = false;
  for (const segment of enabled) {
    needsAio = needsAio || !APP_KINDS.includes(segment.kind) || seen.has(segment.kind);
    seen.add(segment.kind);
  }
  const aio = needsAio || bool(cfg, 'aio_active');
  cfg['aio_active'] = aio;
  if (!aio) {
    return false;
  }
  if (needsAio && !bool(cfg, 'aio_active')) {
    collector.info(
      'aio-mode',
      'Segments without a DreamChatbox app were combined into one All-in-one template.',
      'config.json#aio_active',
    );
  }
  const line = enabled
    .map((segment) => aioPart(state, segment))
    .filter((text) => text !== '')
    .join(' \\n ');
  // Disabled segments keep their text in the spare slots (beyond `count`, so Dream never shows them).
  const spare = profile.segments
    .filter((s) => !s.enabled)
    .map((s) => aioPart(state, s))
    .filter((text) => text !== '');
  const templates = [line, ...spare];
  if (templates.length > AIO_MAX) {
    collector.warn(
      'limit-exceeded',
      `DreamChatbox has ${AIO_MAX} All-in-one slots; ${templates.length - AIO_MAX} disabled segments were dropped.`,
      'config.json#aio_sets',
    );
  }
  const slots = fixedList(templates, AIO_MAX, '', isStr);
  const sets = list(cfg, 'aio_sets');
  const index = num(cfg, 'aio_set_active');
  const set = sets[index];
  if (!isJsonObject(set)) {
    return true;
  }
  const filled = slots.filter((s) => s !== '').length;
  const count = clampInt(num(set, 'count'), 1, Math.max(1, filled));
  set['templates'] = slots;
  set['count'] = count;
  cfg['aio_mode'] = 'normal';
  cfg['aio_templates'] = [...slots];
  cfg['aio_count'] = count;
  return true;
}

/** One segment's share of the All-in-one line; a segment whose every placeholder is unsupported is dropped whole. */
function aioPart(state: SerializeState, segment: Segment): string {
  const path = `config.json#aio_sets[${segment.id}]`;
  const result = canonicalToDream(segment.template);
  if (placeholdersIn(segment.template).length > 0 && !result.template.includes('{')) {
    state.collector.unsupported(`The ${segment.kind} segment`, path);
    return '';
  }
  reportToDream(result, state.collector, path, state.plugins);
  return result.template;
}

// ---------------------------------------------------------------- custom box

function writeBox(state: SerializeState, aio: boolean): void {
  const { cfg, profile, collector } = state;
  const topLine = profile.output.prefix.replace(/\n$/, '');
  const bottomLine = profile.output.suffix.replace(/^\n/, '');
  const custom = frameFor({ ...cfg, box_template: BOX_CUSTOM_TEMPLATE });
  const top = topLine === '' ? undefined : matchBoxLine(topLine, 'top', custom);
  const bottom = bottomLine === '' ? undefined : matchBoxLine(bottomLine, 'bottom', custom);
  const time = aio ? undefined : profile.segments.find((s) => s.kind === 'time' && s.enabled);
  if (topLine !== '' && top === undefined) {
    collector.unsupported(
      'Output prefix (not a Custom Box frame line)',
      'config.json#box_top_custom',
    );
  }
  if (bottomLine !== '' && bottom === undefined) {
    collector.unsupported(
      'Output suffix (not a Custom Box frame line)',
      'config.json#box_bottom_custom',
    );
  }
  const frameMatch = top ?? bottom;
  if (frameMatch === undefined && time === undefined) {
    cfg['box_active'] = false;
    return;
  }
  cfg['box_active'] = true;
  if (frameMatch !== undefined) {
    cfg['box_template'] = frameMatch.template;
  }
  const sides = [
    ['top', top],
    ['bottom', bottom],
  ] as const;
  for (const [side, match] of sides) {
    cfg[`box_${side}_on`] = match !== undefined;
    if (match !== undefined) {
      cfg[`box_width_${side}`] = clampInt(match.width, 0, 40);
      writeBoxMiddle(state, side, match.middle);
    }
  }
  if (time !== undefined) {
    cfg['box_top_on'] = true;
    writeBoxMiddle(state, 'top', time.template);
    collector.info(
      'time-in-box',
      'DreamChatbox has no clock app; the time segment was placed in the Custom Box top line.',
      'config.json#box_top_mode',
    );
  }
}

function writeBoxMiddle(state: SerializeState, side: 'top' | 'bottom', middle: string): void {
  const { cfg } = state;
  const text = middle.trim();
  if (text === '') {
    cfg[`box_${side}_mode`] = 'none';
    return;
  }
  if (text === '{time}') {
    cfg[`box_${side}_mode`] = 'clock';
    return;
  }
  cfg[`box_${side}_mode`] = 'custom';
  cfg[`box_${side}_custom`] = toDream(
    state,
    text.replace(/\{time\}/gi, '{box_clock}'),
    `config.json#box_${side}_custom`,
  ).slice(0, 120);
}

// ---------------------------------------------------------------- output / osc

function writeOutput(state: SerializeState): void {
  const { cfg, profile, collector } = state;
  cfg['slim_chatbox'] = profile.output.minimalBackground;
  cfg['interval_sec'] = Math.max(1, Math.round(profile.output.sendIntervalSeconds));
  cfg['osc_ip'] = profile.osc.host;
  cfg['osc_port'] = profile.osc.port;
  if (!profile.output.separateWithNewlines) {
    collector.info(
      'unsupported-feature',
      'DreamChatbox always puts each app on its own line; the custom separator was not used.',
      'config.json#app_order',
    );
  }
}
