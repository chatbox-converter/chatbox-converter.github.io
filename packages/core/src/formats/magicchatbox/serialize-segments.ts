import type { PlaceholderName } from '../../model/placeholders';
import type { Segment } from '../../model/segments';
import { parseTemplate, placeholdersIn } from '../../model/template';
import type { JsonObject } from '../../util/json';
import type { DiagnosticCollector } from '../codec';
import {
  DISCORD_TOKENS,
  FILES,
  MY_TIME_LABEL,
  SPOTIFY_TOKENS,
  TIKTOK_TOKENS,
  TWITCH_TOKENS,
  VRC_TOKENS,
  WEATHER_TOKENS,
  invert,
  timezoneEnumFor,
  type SortKey,
} from './catalog';
import { COMPONENTS, componentItemDefaults } from './defaults';
import { escapeNewlines, mergeDefaults, Reader, setKey } from './files';

export interface SerializeContext {
  /** Canonical file name → settings object being built. */
  readonly files: Map<string, JsonObject>;
  readonly collector: DiagnosticCollector;
  readonly now: Date;
}

export function fileOf(ctx: SerializeContext, name: string): JsonObject {
  const existing = ctx.files.get(name);
  if (existing === undefined) {
    throw new Error(`${name} was not prepared for serialization.`);
  }
  return existing;
}

/** Canonical placeholders → format tokens; placeholders the integration lacks are removed. */
export function unmapTokens(
  segment: Segment,
  mapping: Readonly<Record<string, string>>,
  ctx: SerializeContext,
  file: string,
): string {
  const inverse = invert(mapping);
  const lost: string[] = [];
  let out = '';
  for (const token of parseTemplate(segment.template)) {
    if (token.kind === 'text') {
      out += token.text;
    } else if (token.kind === 'unknown') {
      out += token.raw;
    } else if (Object.hasOwn(inverse, token.name)) {
      out += `{${inverse[token.name] ?? token.name}}`;
    } else {
      lost.push(token.name);
      out = out.replace(/\s$/u, '');
    }
  }
  for (const name of new Set(lost)) {
    ctx.collector.unsupported(`Placeholder {${name}} in the ${segment.kind} segment`, file);
  }
  return escapeNewlines(out.replace(/[ \t]{2,}/g, ' ').trim());
}

function uses(segment: Segment, ...names: PlaceholderName[]): boolean {
  const used = placeholdersIn(segment.template);
  return names.some((name) => used.includes(name));
}

/** Literal text before the first placeholder. */
function leadingText(template: string): string {
  const first = parseTemplate(template)[0];
  return first?.kind === 'text' ? first.text : '';
}

/** Literal text between two placeholders, or undefined when they are not adjacent in that order. */
function textBetween(
  template: string,
  from: PlaceholderName,
  to: PlaceholderName,
): string | undefined {
  const tokens = parseTemplate(template);
  const start = tokens.findIndex((token) => token.kind === 'placeholder' && token.name === from);
  if (start < 0) {
    return undefined;
  }
  const next = tokens[start + 1];
  const after = tokens[start + 2];
  if (next?.kind === 'placeholder' && next.name === to) {
    return '';
  }
  return next?.kind === 'text' && after?.kind === 'placeholder' && after.name === to
    ? next.text
    : undefined;
}

function writeStatus(segment: Segment, ctx: SerializeContext): void {
  const app = fileOf(ctx, FILES.app);
  const emoji = leadingText(segment.template).trim();
  setKey(app, 'PrefixIconStatus', emoji !== '');
  if (emoji !== '' && emoji !== '💬') {
    const existing = new Reader(app).strings('EmojiCollection') ?? [];
    setKey(app, 'EmojiCollection', [emoji, ...existing.filter((item) => item !== emoji)]);
  }
}

function writeWindow(segment: Segment, ctx: SerializeContext): void {
  const wa = fileOf(ctx, FILES.window);
  const focus = textBetween(segment.template, 'device_mode', 'window_title');
  setKey(wa, 'ShowFocusedApp', uses(segment, 'window_title'));
  if (focus !== undefined && focus.trim() !== '') {
    setKey(wa, 'DesktopFocusTitle', focus.trim());
  }
  const lead = leadingText(segment.template).trim();
  if (lead !== '' && !uses(segment, 'device_mode')) {
    setKey(wa, 'DesktopTitle', lead);
  }
  if (segment.options.kind === 'window') {
    setKey(wa, 'MaxShowTitleCount', segment.options.maxTitleLength);
    setKey(wa, 'PrivateName', segment.options.privateAppLabel);
  }
}

function writeSpotify(segment: Segment, ctx: SerializeContext): void {
  const sp = fileOf(ctx, FILES.spotify);
  setKey(sp, 'OutputTemplate', unmapTokens(segment, SPOTIFY_TOKENS, ctx, FILES.spotify));
  setKey(sp, 'ShowAlbum', uses(segment, 'album'));
  setKey(sp, 'ShowDevice', uses(segment, 'player'));
  setKey(sp, 'ShowVolume', uses(segment, 'volume'));
  const bar = uses(segment, 'progress_bar');
  const numbers = uses(segment, 'position', 'duration', 'remaining');
  const percent = uses(segment, 'progress_percent');
  setKey(sp, 'ShowProgress', bar || numbers || percent);
  if (bar || numbers || percent) {
    setKey(sp, 'ProgressDisplayMode', bar ? 3 : percent ? 1 : 2);
  }
  if (segment.options.kind !== 'media') {
    return;
  }
  const { progressBar, pausedTemplate } = segment.options;
  setKey(sp, 'ProgressBarLength', progressBar.length);
  setKey(sp, 'ProgressFilledCharacter', progressBar.filled);
  setKey(
    sp,
    'ProgressMiddleCharacter',
    progressBar.position === '' ? progressBar.filled : progressBar.position,
  );
  setKey(sp, 'ProgressNonFilledCharacter', progressBar.empty);
  setKey(sp, 'ShowOnlyOnChange', segment.options.transient);
  setKey(sp, 'TransientDuration', segment.options.transientSeconds);
  if (pausedTemplate === '') {
    setKey(sp, 'PauseOutputMode', 0);
  } else if (placeholdersIn(pausedTemplate).length === 0) {
    setKey(sp, 'PauseOutputMode', 1);
    setKey(sp, 'PausedText', pausedTemplate);
  } else {
    setKey(sp, 'PauseOutputMode', 2);
    ctx.collector.info(
      'approximated',
      'Spotify shows the last track while paused; the paused template itself is not configurable.',
      FILES.spotify,
    );
  }
}

function writeMediaLink(segment: Segment, ctx: SerializeContext): void {
  const ml = fileOf(ctx, FILES.mediaLink);
  const app = fileOf(ctx, FILES.app);
  const playIcon = uses(segment, 'play_icon');
  setKey(app, 'PrefixIconMusic', playIcon);
  const lead = leadingText(segment.template).trim();
  if (!playIcon && lead !== '') {
    setKey(ml, 'TextPlaying', lead);
  }
  const titleFirst = textBetween(segment.template, 'title', 'artist');
  const artistFirst = textBetween(segment.template, 'artist', 'title');
  const separator = titleFirst ?? artistFirst;
  if (separator !== undefined && separator !== '') {
    setKey(ml, 'Separator', escapeNewlines(separator));
  }
  if (titleFirst === undefined && artistFirst !== undefined) {
    ctx.collector.info(
      'approximated',
      'MediaLink always prints the title before the artist.',
      FILES.mediaLink,
    );
  }
  setKey(
    ml,
    'TimeSeekStyle',
    uses(segment, 'progress_bar') ? 1 : uses(segment, 'position', 'duration') ? 0 : 2,
  );
  const lost = placeholdersIn(segment.template).filter(
    (name) =>
      !['play_icon', 'title', 'artist', 'progress_bar', 'position', 'duration'].includes(name),
  );
  for (const name of lost) {
    ctx.collector.unsupported(`Placeholder {${name}} in the MediaLink segment`, FILES.mediaLink);
  }
  if (segment.options.kind !== 'media') {
    return;
  }
  const paused = segment.options.pausedTemplate;
  setKey(ml, 'ShowOnlyOnChange', segment.options.transient);
  setKey(ml, 'TransientDuration', segment.options.transientSeconds);
  if (paused !== '' && placeholdersIn(paused).length === 0) {
    setKey(ml, 'IconPause', paused);
    setKey(ml, 'PauseIconMusic', true);
  } else {
    setKey(ml, 'PauseIconMusic', false);
    const label = leadingText(paused).trim();
    if (label !== '') {
      setKey(ml, 'TextPaused', label);
    }
    ctx.collector.info(
      'approximated',
      'MediaLink shows only a pause icon or label while paused.',
      FILES.mediaLink,
    );
  }
}

function writeHeartRate(segment: Segment, ctx: SerializeContext): void {
  const hr = fileOf(ctx, FILES.pulsoid);
  const lead = leadingText(segment.template);
  const titleMatch = /^(.*?):\s/u.exec(lead);
  setKey(hr, 'HeartRateTitle', titleMatch !== null);
  if (titleMatch?.[1] !== undefined && titleMatch[1].trim() !== '') {
    setKey(hr, 'CurrentHeartRateTitle', titleMatch[1].trim());
  }
  setKey(hr, 'MagicHeartIconPrefix', /[❤♥💖💗💙💚💛💜]/u.test(segment.template));
  setKey(hr, 'ShowBPMSuffix', /ᵇᵖᵐ|bpm/iu.test(segment.template));
  setKey(hr, 'ShowHeartRateTrendIndicator', uses(segment, 'heartrate_trend'));
  setKey(hr, 'ShowAverageHeartRate', uses(segment, 'heartrate_avg'));
  setKey(hr, 'ShowMaximumHeartRate', uses(segment, 'heartrate_max'));
  setKey(hr, 'ShowMinimumHeartRate', uses(segment, 'heartrate_min'));
  setKey(
    hr,
    'PulsoidStatsEnabled',
    uses(segment, 'heartrate_avg', 'heartrate_max', 'heartrate_min'),
  );
  if (segment.options.kind === 'heartrate') {
    setKey(hr, 'SmoothHeartRate', segment.options.smoothing);
  }
}

function writeComponent(segment: Segment, ctx: SerializeContext): void {
  const cs = fileOf(ctx, FILES.componentStats);
  const items = fileOf(ctx, FILES.componentItems);
  const used = placeholdersIn(segment.template);
  const has = (...names: PlaceholderName[]): boolean => names.some((name) => used.includes(name));
  for (const spec of COMPONENTS) {
    const item = items[spec.name];
    if (item === undefined || typeof item !== 'object' || item === null || Array.isArray(item)) {
      continue;
    }
    const lower = spec.name.toLowerCase();
    const usage = `${lower}_usage` as PlaceholderName;
    const usedValue = `${lower}_used` as PlaceholderName;
    const total = `${lower}_total` as PlaceholderName;
    const temp = `${lower}_temp` as PlaceholderName;
    const power = `${lower}_power` as PlaceholderName;
    setKey(item, 'IsEnabled', has(usage, usedValue, total, temp, power));
    if (spec.showMax) {
      setKey(item, 'ShowMaxValue', has(total));
    }
    if (spec.name === 'GPU') {
      setKey(item, 'ShowTemperature', has(temp));
      setKey(item, 'ShowWattage', has(power));
    }
  }
  for (const name of used) {
    if (
      ['cpu_temp', 'cpu_power', 'cpu_name', 'gpu_name', 'fps', 'ram_usage', 'vram_usage'].includes(
        name,
      )
    ) {
      ctx.collector.unsupported(
        `Placeholder {${name}} in the hardware segment`,
        FILES.componentItems,
      );
    }
  }
  ctx.collector.info(
    'approximated',
    'MagicChatbox generates its own component-stats layout; the hardware template text was reduced to per-component toggles.',
    FILES.componentItems,
  );
  if (segment.options.kind === 'hardware') {
    const fahrenheit = segment.options.temperatureUnit === 'F';
    setKey(cs, 'StatsSeparator', segment.options.separator);
    setKey(cs, 'TemperatureCelsius', !fahrenheit);
    setKey(cs, 'TemperatureFahrenheit', fahrenheit);
    setKey(cs, 'IsFahrenheit', fahrenheit);
    setKey(cs, 'IsTemperatureSwitchEnabled', false);
  }
}

/** ComponentStatsV1.json as an object keyed by component name; turned into the array on output. */
export function prepareComponentItems(previous: unknown, now: string): JsonObject {
  const previousItems: unknown[] = Array.isArray(previous) ? (previous as unknown[]) : [];
  const out: JsonObject = {};
  for (const spec of COMPONENTS) {
    const old = previousItems.find(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item) &&
        new Reader(item as JsonObject).num('ComponentType', -1) === spec.type,
    );
    out[spec.name] = mergeDefaults(componentItemDefaults(spec, now), old as JsonObject | undefined);
  }
  return out;
}

function writeVrPerformance(segment: Segment, ctx: SerializeContext): void {
  const vp = fileOf(ctx, FILES.vrPerformance);
  setKey(vp, 'ShowFps', uses(segment, 'vr_fps'));
  setKey(vp, 'ShowTargetHz', uses(segment, 'vr_target_hz'));
  setKey(vp, 'ShowReprojection', uses(segment, 'vr_reprojection'));
  setKey(vp, 'ShowDroppedFrames', uses(segment, 'vr_dropped_frames'));
}

function writeTrackerBattery(segment: Segment, ctx: SerializeContext): void {
  const tb = fileOf(ctx, FILES.trackerBattery);
  if (segment.options.kind === 'vr_battery') {
    setKey(tb, 'ShowHeadset', segment.options.showHeadset);
    setKey(tb, 'ShowControllers', segment.options.showControllers);
    setKey(tb, 'ShowTrackers', segment.options.showTrackers);
    setKey(
      tb,
      'LowThreshold',
      Math.min(100, Math.max(1, Math.round(segment.options.lowThresholdPercent))),
    );
  }
  ctx.collector.info(
    'approximated',
    'MagicChatbox formats each tracked device with its per-device template; the battery template text is not transferable.',
    FILES.trackerBattery,
  );
}

function writeNetwork(segment: Segment, ctx: SerializeContext): void {
  const ns = fileOf(ctx, FILES.network);
  setKey(ns, 'ShowCurrentDown', uses(segment, 'net_down'));
  setKey(ns, 'ShowCurrentUp', uses(segment, 'net_up'));
  setKey(ns, 'ShowMaxDown', uses(segment, 'net_max_down'));
  setKey(ns, 'ShowMaxUp', uses(segment, 'net_max_up'));
  setKey(ns, 'ShowTotalDown', uses(segment, 'net_total_down'));
  setKey(ns, 'ShowTotalUp', uses(segment, 'net_total_up'));
  setKey(ns, 'ShowNetworkUtilization', uses(segment, 'net_utilization'));
}

function writeWeather(segment: Segment, ctx: SerializeContext): void {
  const ws = fileOf(ctx, FILES.weather);
  setKey(ws, 'ShowWeatherInTime', segment.enabled);
  setKey(
    ws,
    'WeatherTemplate',
    unmapTokens(segment, WEATHER_TOKENS, ctx, FILES.weather).slice(0, 144),
  );
  setKey(ws, 'ShowWeatherCondition', uses(segment, 'weather_condition'));
  setKey(ws, 'ShowWeatherEmoji', uses(segment, 'weather_emoji'));
  setKey(ws, 'ShowWeatherFeelsLike', uses(segment, 'weather_feels_like'));
  setKey(ws, 'ShowWeatherHumidity', uses(segment, 'weather_humidity'));
  setKey(ws, 'ShowWeatherWind', uses(segment, 'weather_wind'));
  if (segment.options.kind !== 'weather') {
    return;
  }
  const options = segment.options;
  setKey(ws, 'WeatherUnitOverride', options.temperatureUnit === 'F' ? 2 : 1);
  setKey(
    ws,
    'WeatherLocationMode',
    options.locationMode === 'coordinates' ? 1 : options.locationMode === 'ip' ? 2 : 0,
  );
  setKey(ws, 'WeatherAllowIPLocation', options.locationMode === 'ip');
  setKey(ws, 'WeatherLocationLatitude', options.latitude);
  setKey(ws, 'WeatherLocationLongitude', options.longitude);
  setKey(
    ws,
    'WeatherUpdateIntervalMinutes',
    Math.max(1, Math.round(options.updateIntervalMinutes)),
  );
  if (options.city !== '') {
    ctx.collector.warn(
      'encrypted-value',
      `The weather city "${options.city}" cannot be written: MagicChatbox stores it DPAPI-encrypted. Enter it again in the app.`,
      FILES.weather,
    );
  }
}

function writeTime(segment: Segment, ctx: SerializeContext): void {
  const ts = fileOf(ctx, FILES.time);
  setKey(ts, 'PrefixTime', segment.template.trimStart().startsWith(MY_TIME_LABEL));
  setKey(ts, 'TimeShowTimeZone', uses(segment, 'timezone'));
  if (segment.options.kind !== 'time') {
    return;
  }
  setKey(ts, 'Time24H', segment.options.use24Hour);
  const zone = segment.options.timezone;
  const index = zone === '' ? undefined : timezoneEnumFor(zone);
  setKey(ts, 'SelectedTimeZone', index ?? 0);
  if (index === undefined) {
    ctx.collector.warn(
      'timezone-unmapped',
      zone === ''
        ? 'MagicChatbox has no "system local" time zone; UTC was selected.'
        : `Time zone "${zone}" is not one of MagicChatbox's 19 zones; UTC was selected.`,
      FILES.time,
    );
  }
  if (segment.options.showSeconds) {
    ctx.collector.unsupported('Seconds in the time segment', FILES.time);
  }
}

function writeSoundpad(segment: Segment, ctx: SerializeContext): void {
  setKey(fileOf(ctx, FILES.app), 'PrefixIconSoundpad', segment.template.includes('🎶'));
}

function writeLyrics(segment: Segment, ctx: SerializeContext): void {
  setKey(fileOf(ctx, FILES.lyrics), 'ShowNoteIcon', segment.template.includes('♪'));
}

function writeFixed(
  file: string,
  canonical: string,
): (segment: Segment, ctx: SerializeContext) => void {
  return (segment, ctx) => {
    if (segment.template !== canonical) {
      ctx.collector.info(
        'approximated',
        `MagicChatbox renders this segment as "${canonical}"; the custom template was dropped.`,
        file,
      );
    }
  };
}

function writeTemplate(
  file: string,
  key: string,
  mapping: Readonly<Record<string, string>>,
): (segment: Segment, ctx: SerializeContext) => void {
  return (segment, ctx) => {
    setKey(fileOf(ctx, file), key, unmapTokens(segment, mapping, ctx, file));
  };
}

export const SEGMENT_WRITERS: Readonly<
  Record<SortKey, (segment: Segment, ctx: SerializeContext) => void>
> = {
  Status: writeStatus,
  Window: writeWindow,
  Twitch: writeTemplate(FILES.twitch, 'Template', TWITCH_TOKENS),
  TikTokLive: writeTemplate(FILES.tiktok, 'SummaryTemplate', TIKTOK_TOKENS),
  Discord: writeTemplate(FILES.discord, 'Template', DISCORD_TOKENS),
  Spotify: writeSpotify,
  VrcRadar: writeTemplate(FILES.vrcLog, 'TemplateWorld', VRC_TOKENS),
  HeartRate: writeHeartRate,
  Component: writeComponent,
  VrPerformance: writeVrPerformance,
  TrackerBattery: writeTrackerBattery,
  Network: writeNetwork,
  Weather: writeWeather,
  Time: writeTime,
  Soundpad: writeSoundpad,
  Voicemod: writeFixed(FILES.integration, "🎙️ '{voicemod_voice}'"),
  MediaLink: writeMediaLink,
  Lyrics: writeLyrics,
};
