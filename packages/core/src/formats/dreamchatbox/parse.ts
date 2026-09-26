import { PLACEHOLDERS, type PlaceholderCategory } from '../../model/placeholders';
import {
  createStatusItem,
  type AfkSettings,
  type ChatboxProfile,
  type StatusCycle,
  type StatusItem,
} from '../../model/profile';
import {
  createSegment,
  defaultSegmentOptions,
  isSegmentKind,
  type ProgressBarStyle,
  type Segment,
  type SegmentKind,
} from '../../model/segments';
import { placeholdersIn } from '../../model/template';
import { isJsonObject, parseJsonFile, type JsonObject } from '../../util/json';
import { ConfigParseError, DiagnosticCollector, type ConfigFile, type ParseResult } from '../codec';
import { frameFor, renderBoxLine } from './box';
import { BAR_BASE_LENGTH, BAR_CUSTOM_STYLE, BAR_PRESETS } from './catalog';
import { bool, fixedList, isStr, list, num, obj, str } from './defaults';
import { isExportEnvelope, pickInputFile, readDreamInput, toExtras } from './export';
import { normalizeConfig } from './normalize';
import { dreamToCanonical, reportToCanonical, type DreamContext } from './tokens';

const DETECT_KEYS = ['status_templates', 'aio_sets', 'app_order', 'status_texts', 'aio_templates'];

export function detectDream(files: readonly ConfigFile[]): number {
  for (const file of files) {
    if (!file.path.toLowerCase().endsWith('.json')) {
      continue;
    }
    try {
      const json = parseJsonFile(file.content, file.path);
      if (
        isJsonObject(json) &&
        (isExportEnvelope(json) || DETECT_KEYS.some((key) => key in json))
      ) {
        return 1;
      }
    } catch {
      // not JSON: try the next file
    }
  }
  return 0;
}

interface ParseState {
  readonly cfg: JsonObject;
  readonly path: string;
  readonly collector: DiagnosticCollector;
  readonly ctx: DreamContext;
}

export function parseDream(files: readonly ConfigFile[]): ParseResult {
  const file = pickInputFile(files);
  if (file === undefined) {
    throw new ConfigParseError('No DreamChatbox config.json or .dcbprofile.json was provided.');
  }
  const json = parseJsonFile(file.content, file.path);
  if (!isJsonObject(json)) {
    throw new ConfigParseError(`${file.path} does not contain a JSON object.`, file.path);
  }
  const input = readDreamInput(json, file.path);
  if (input === undefined) {
    throw new ConfigParseError(`${file.path} is a profile export without a profile.`, file.path);
  }
  const cfg = normalizeConfig(input.stored);
  const collector = new DiagnosticCollector();
  reportProfileFile(input, collector, file.path);
  const state: ParseState = {
    cfg,
    path: file.path,
    collector,
    ctx: {
      lyricsPrefix: bool(cfg, 'media_lyrics_prefix_on') ? str(cfg, 'media_lyrics_prefix') : '',
      ramType: str(cfg, 'hw_ram_type').trim(),
    },
  };
  const { statuses, statusCycle } = parseStatuses(state);
  const { prefix, suffix } = parseBox(state);
  const profile: ChatboxProfile = {
    version: 1,
    meta: {
      name: input.name !== '' ? input.name : str(cfg, 'profile_active'),
      source: 'dreamchatbox',
      notes: [],
    },
    statuses,
    statusCycle,
    afk: parseAfk(state),
    output: {
      separator: ' ┆ ',
      separateWithNewlines: true,
      prefix,
      suffix,
      minimalBackground: bool(cfg, 'slim_chatbox'),
      sendIntervalSeconds: num(cfg, 'interval_sec'),
    },
    osc: { host: str(cfg, 'osc_ip'), port: num(cfg, 'osc_port') },
    segments: bool(cfg, 'aio_active') ? parseAioSegments(state) : parseAppSegments(state),
    extras: { dreamchatbox: toExtras({ config: cfg, profile: input.meta }) },
  };
  return { profile, diagnostics: collector.all() };
}

/** What a v1.5.7+ profile carries besides settings: plugin switches and their settings. */
function reportProfileFile(
  input: ReturnType<typeof readDreamInput>,
  collector: DiagnosticCollector,
  path: string,
): void {
  if (input === undefined) {
    return;
  }
  if (input.envelope) {
    collector.info(
      'profile-export',
      `Read the DreamChatbox profile export “${input.name}”; the OSC target and theme are not part of it and keep their defaults.`,
      path,
    );
  }
  const on = Object.keys(input.meta.plugins).filter((pid) => input.meta.plugins[pid] === true);
  if (on.length > 0) {
    collector.info(
      'plugin-state',
      `The profile switches on the plugins ${on.join(', ')}; their on/off state and settings are kept in extras only.`,
      path,
    );
  }
}

function convert(state: ParseState, template: string, key: string): string {
  const result = dreamToCanonical(template, state.ctx);
  reportToCanonical(result, state.collector, `${state.path}#${key}`);
  return result.template;
}

// ---------------------------------------------------------------- statuses

function parseStatuses(state: ParseState): {
  statuses: StatusItem[];
  statusCycle: StatusCycle;
} {
  const { cfg, collector } = state;
  const activeIndex = num(cfg, 'status_template_active');
  const statuses: StatusItem[] = [];
  let cycleCount = 0;
  let activeAssigned = false;
  list(cfg, 'status_templates').forEach((raw, templateIndex) => {
    const template = isJsonObject(raw) ? raw : {};
    const texts = fixedList(template['texts'], 20, '', isStr);
    const count = num(template, 'count');
    const group = str(template, 'name');
    const isActive = templateIndex === activeIndex;
    texts.forEach((text, slot) => {
      if (text.trim() === '') {
        return;
      }
      const inCycle = slot < count;
      if (isActive && inCycle) {
        cycleCount += 1;
      }
      const active = isActive && inCycle && !activeAssigned;
      activeAssigned = activeAssigned || active;
      statuses.push(
        createStatusItem(convert(state, text, `status_templates[${templateIndex}]`), {
          id: `status-${templateIndex + 1}-${slot + 1}`,
          active,
          useInCycle: inCycle,
          group,
        }),
      );
    });
  });
  if (activeStylesUsed(cfg)) {
    collector.info(
      'style-markers-stripped',
      'Superscript/subscript status styles are not part of the neutral model.',
      `${state.path}#status_styles`,
    );
  }
  return {
    statuses,
    statusCycle: {
      enabled: cycleCount > 1,
      intervalSeconds: num(cfg, 'status_cycle_sec'),
      random: bool(cfg, 'status_random'),
    },
  };
}

/** True when a rotating status of the active template uses a super/sub style. */
function activeStylesUsed(cfg: JsonObject): boolean {
  const texts = fixedList(cfg['status_texts'], 20, '', isStr);
  const styles = fixedList(cfg['status_styles'], 20, 'normal', isStr);
  const count = num(cfg, 'status_count');
  return styles.some((style, i) => i < count && style !== 'normal' && (texts[i] ?? '') !== '');
}

// ---------------------------------------------------------------- afk

function parseAfk(state: ParseState): AfkSettings {
  const { cfg, collector } = state;
  const texts = fixedList(cfg['afk_texts'], 3, '', isStr);
  const text = texts[num(cfg, 'afk_preset')] ?? '';
  const timer = bool(cfg, 'afk_timer') ? ` ${str(cfg, 'afk_timer_text')}` : '';
  const enabled = bool(cfg, 'afk_detect') || bool(cfg, 'afk_manual');
  if (enabled) {
    collector.info(
      'default-applied',
      'DreamChatbox has no AFK timeout setting; the default of 120 seconds was kept.',
      `${state.path}#afk_detect`,
    );
  }
  return {
    enabled,
    timeoutSeconds: 120,
    template: convert(state, `${text}${timer}`, 'afk_texts'),
    replaceEverything: bool(cfg, 'afk_solo'),
  };
}

// ---------------------------------------------------------------- normal mode

function parseAppSegments(state: ParseState): Segment[] {
  const { cfg } = state;
  const segments: Segment[] = [];
  for (const app of list(cfg, 'app_order')) {
    if (app === 'status') {
      segments.push(createSegment('status', { id: 'status', enabled: bool(cfg, 'status_active') }));
    } else if (app === 'media') {
      segments.push(parseMedia(state));
      if (bool(cfg, 'media_show_lyrics')) {
        segments.push(parseLyrics(state));
      }
    } else if (app === 'hardware') {
      segments.push(parseHardware(state));
    }
  }
  return segments;
}

function parseMedia(state: ParseState): Segment {
  const { cfg, collector } = state;
  let template = bool(cfg, 'media_custom')
    ? convert(state, str(cfg, 'media_custom_template'), 'media_custom_template')
    : generatedMediaTemplate(cfg);
  if (bool(cfg, 'media_icon') && template !== '') {
    const lines = template.split('\n');
    lines[0] = `🎵 ${lines[0] ?? ''} 🎵`;
    template = lines.join('\n');
  }
  if (bool(cfg, 'hw_gpu2')) {
    collector.info(
      'unsupported-feature',
      'The second GPU line is kept only in extras.',
      state.path,
    );
  }
  const idle = bool(cfg, 'media_idle') ? str(cfg, 'media_idle_text') : '';
  return createSegment('media', {
    id: 'media',
    enabled: bool(cfg, 'media_active'),
    template,
    options: {
      kind: 'media',
      pausedTemplate: idle,
      stoppedTemplate: idle,
      titleMaxLength: num(cfg, 'media_title_max'),
      progressBar: parseProgressBar(cfg),
      transient: false,
      transientSeconds: 25,
    },
  });
}

/** The checkbox-driven layout of `build_media_lines` (`apps_page.py:4102-4173`). */
export function generatedMediaTemplate(cfg: JsonObject): string {
  const parts: string[] = [];
  if (bool(cfg, 'media_show_artist')) {
    parts.push('{artist}');
  }
  if (bool(cfg, 'media_show_title')) {
    parts.push('{title}');
  }
  let text = parts.join(' : ');
  const timePos = str(cfg, 'media_time_pos');
  const showTime = bool(cfg, 'media_show_time');
  const showBar = bool(cfg, 'media_show_bar');
  const merge = showTime && showBar && timePos !== 'line';
  if (showTime && !merge) {
    text = text === '' ? '{position}/{duration}' : `${text} | {position}/{duration}`;
  }
  const lines = text === '' ? [] : [text];
  if (showBar) {
    const bars: Record<string, string> = {
      before: '{position}/{duration} {progress_bar}',
      after: '{progress_bar} {position}/{duration}',
      split: '{position}{progress_bar}{duration}',
    };
    lines.push(merge ? (bars[timePos] ?? '{progress_bar}') : '{progress_bar}');
  }
  return lines.join('\n');
}

function parseProgressBar(cfg: JsonObject): ProgressBarStyle {
  const style = num(cfg, 'media_bar_style');
  const pct = Math.min(100, Math.max(30, num(cfg, 'media_bar_size')));
  let length = Math.max(4, Math.round((BAR_BASE_LENGTH * pct) / 100));
  if (style === 1) {
    length = Math.max(5, Math.trunc(length / 2));
  }
  const preset = BAR_PRESETS[style];
  if (style !== BAR_CUSTOM_STYLE && preset !== undefined) {
    return { ...preset, length };
  }
  const custom = obj(cfg, 'media_bar_custom');
  const part = (key: string, fallback: string): string => {
    const value = custom[key];
    return typeof value === 'string' ? value : fallback;
  };
  return {
    length,
    start: part('prefix', '['),
    filled: part('filled', '█') || '█',
    empty: part('empty', '░') || '░',
    position: part('knob', ''),
    end: part('suffix', ']'),
  };
}

function parseLyrics(state: ParseState): Segment {
  const prefix = state.ctx.lyricsPrefix;
  return createSegment('lyrics', {
    id: 'lyrics',
    enabled: bool(state.cfg, 'media_active'),
    template: prefix === '' ? '{lyrics}' : `${prefix} {lyrics}`,
  });
}

function parseHardware(state: ParseState): Segment {
  const { cfg, collector } = state;
  const template = bool(cfg, 'hw_custom')
    ? convert(state, str(cfg, 'hw_custom_template'), 'hw_custom_template')
    : generatedHardwareTemplate(cfg);
  if (bool(cfg, 'hw_flame')) {
    collector.info(
      'unsupported-feature',
      'The 🔥 temperature icon (hw_flame) cannot be expressed; temperatures use °C.',
      `${state.path}#hw_flame`,
    );
  }
  return createSegment('hardware', {
    id: 'hardware',
    enabled: bool(cfg, 'hw_active'),
    template,
    options: { kind: 'hardware', temperatureUnit: 'C', separator: ' | ' },
  });
}

/** The checkbox-driven layout of `build_hw_lines` (`apps_page.py:4490-4561`). */
export function generatedHardwareTemplate(cfg: JsonObject): string {
  const lines: string[] = [];
  const name = (device: 'gpu' | 'cpu'): string => {
    const custom = str(cfg, `hw_${device}_custom_name`).trim();
    return bool(cfg, `hw_${device}_custom`) && custom !== '' ? custom : `{${device}_name}`;
  };
  const gpuValues = [
    bool(cfg, 'hw_gpu_usage') ? '{gpu_usage}' : '',
    bool(cfg, 'hw_gpu_temp') ? '{gpu_temp}' : '',
    bool(cfg, 'hw_gpu_power') ? '{gpu_power}' : '',
  ].filter((v) => v !== '');
  const vram = [
    bool(cfg, 'hw_vram_used') ? '{vram_used}/{vram_total}' : '',
    bool(cfg, 'hw_vram_pct') ? '{vram_usage}' : '',
  ].filter((v) => v !== '');
  if (gpuValues.length > 0 || vram.length > 0) {
    let line = name('gpu');
    if (gpuValues.length > 0) {
      line += `: ${gpuValues.join(' ')}`;
    }
    if (vram.length > 0) {
      line += ` | VRAM ${vram.join(' ')}`;
    }
    lines.push(line);
  }
  const cpuValues = [
    bool(cfg, 'hw_cpu_usage') ? '{cpu_usage}' : '',
    bool(cfg, 'hw_cpu_temp') ? '{cpu_temp}' : '',
    bool(cfg, 'hw_cpu_power') ? '{cpu_power}' : '',
  ].filter((v) => v !== '');
  if (cpuValues.length > 0) {
    lines.push(`${name('cpu')}: ${cpuValues.join(' ')}`);
  }
  const ram = [
    bool(cfg, 'hw_ram_used') ? '{ram_used}/{ram_total}' : '',
    bool(cfg, 'hw_ram_pct') ? '{ram_usage}' : '',
  ].filter((v) => v !== '');
  if (ram.length > 0) {
    const type = str(cfg, 'hw_ram_type').trim();
    lines.push(`RAM: ${ram.join(' ')}${type === '' ? '' : ` ${type}`}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------- all-in-one

function parseAioSegments(state: ParseState): Segment[] {
  const { cfg, collector, path } = state;
  const sets = list(cfg, 'aio_sets');
  const set = sets[num(cfg, 'aio_set_active')];
  const active = isJsonObject(set) ? set : {};
  const templates = fixedList(active['templates'], 10, '', isStr);
  const count = num(active, 'count');
  const customTime = fixedList(active['custom_time'], 10, false, (v) => typeof v === 'boolean');
  const customSec = fixedList(active['custom_sec'], 10, 10, (v) => typeof v === 'number');
  if (str(cfg, 'aio_mode') === 'advanced') {
    collector.warn(
      'unsupported-feature',
      'All-in-one advanced mode (node graphs) cannot be converted; the graphs are kept only in extras.',
      `${path}#aio_graphs`,
    );
  }
  collector.info(
    'aio-mode',
    'All-in-one mode replaces the status/media/hardware apps; their settings are kept in extras.',
    `${path}#aio_active`,
  );
  const segments: Segment[] = [];
  templates.forEach((template, slot) => {
    if (template.trim() === '') {
      return;
    }
    const converted = convert(state, template, `aio_sets.templates[${slot}]`);
    const kind = dominantKind(converted);
    const enabled = segments.length === 0;
    if (!enabled && slot < count) {
      const dwell =
        customTime[slot] === true ? (customSec[slot] ?? 10) : num(cfg, 'aio_rotate_sec');
      collector.info(
        'aio-rotation',
        `All-in-one slot ${slot + 1} rotates with slot 1 every ${dwell} s in DreamChatbox; it was imported disabled.`,
        `${path}#aio_sets.templates[${slot}]`,
      );
    }
    segments.push(
      createSegment(kind, {
        id: `aio-${slot + 1}`,
        enabled,
        template: converted,
        options: defaultSegmentOptions(kind),
      }),
    );
  });
  return segments;
}

/** The segment kind a free template belongs to when all its placeholders share one category. */
export function dominantKind(template: string): SegmentKind {
  const categories = new Set<PlaceholderCategory>(
    placeholdersIn(template).map((name) => PLACEHOLDERS[name].category),
  );
  if (categories.size !== 1) {
    return 'custom';
  }
  const [category] = categories;
  return category !== undefined && isSegmentKind(category) ? category : 'custom';
}

// ---------------------------------------------------------------- custom box

function parseBox(state: ParseState): { prefix: string; suffix: string } {
  const { cfg, collector, path } = state;
  if (!bool(cfg, 'box_active')) {
    return { prefix: '', suffix: '' };
  }
  const frame = frameFor(cfg);
  const middle = (side: 'top' | 'bottom'): string => {
    const mode = str(cfg, `box_${side}_mode`);
    if (mode === 'clock') {
      return '{time}';
    }
    return mode === 'custom'
      ? convert(state, str(cfg, `box_${side}_custom`), `box_${side}_custom`)
      : '';
  };
  const top = bool(cfg, 'box_top_on')
    ? renderBoxLine(frame, 'top', num(cfg, 'box_width_top'), middle('top'))
    : '';
  const bottom = bool(cfg, 'box_bottom_on')
    ? renderBoxLine(frame, 'bottom', num(cfg, 'box_width_bottom'), middle('bottom'))
    : '';
  if (bool(cfg, 'box_align')) {
    collector.info(
      'unsupported-feature',
      'Custom Box line alignment (box_align) depends on the live text and cannot be reproduced statically.',
      `${path}#box_align`,
    );
  }
  return { prefix: top === '' ? '' : `${top}\n`, suffix: bottom === '' ? '' : `\n${bottom}` };
}
