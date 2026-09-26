import { DEFAULT_PROGRESS_BAR, type SegmentOptions } from '../../model/segments';
import { renameTemplateTokens } from '../../model/template';
import type { DiagnosticCollector } from '../codec';
import {
  BPM_SUFFIX,
  DISCORD_DROPPED,
  DISCORD_TOKENS,
  FILES,
  MY_TIME_LABEL,
  SPOTIFY_DROPPED,
  SPOTIFY_TOKENS,
  TIKTOK_TOKENS,
  TIMEZONES,
  TWITCH_DROPPED,
  TWITCH_TOKENS,
  VRC_DROPPED,
  VRC_TOKENS,
  WEATHER_DROPPED,
  WEATHER_TOKENS,
  superscript,
  type SortKey,
} from './catalog';
import { COMPONENTS } from './defaults';
import { expandNewlines, Reader, type FileSet } from './files';

export interface ParseContext {
  readonly files: FileSet;
  readonly app: Reader;
  readonly collector: DiagnosticCollector;
}

export interface Reconstructed {
  readonly template: string;
  readonly options?: SegmentOptions;
}

/** Rename format tokens to canonical ones, dropping the listed ones with an info diagnostic. */
export function mapTokens(
  template: string,
  mapping: Readonly<Record<string, string>>,
  dropped: readonly string[],
  ctx: ParseContext,
  file: string,
): string {
  let out = expandNewlines(template);
  const removed: string[] = [];
  for (const token of dropped) {
    const pattern = new RegExp(`\\s?\\{${token}\\}`, 'giu');
    if (pattern.test(out)) {
      removed.push(token);
      out = out.replace(pattern, '');
    }
  }
  if (removed.length > 0) {
    ctx.collector.info(
      'token-dropped',
      `MagicChatbox token(s) ${removed.map((t) => `{${t}}`).join(', ')} have no canonical placeholder and were removed.`,
      file,
    );
  }
  return renameTemplateTokens(out, mapping)
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function reader(ctx: ParseContext, file: string): Reader {
  return new Reader(ctx.files.object(file));
}

function status(ctx: ParseContext): Reconstructed {
  const emoji = ctx.app.strings('EmojiCollection')?.[0] ?? '💬';
  return { template: ctx.app.bool('PrefixIconStatus', true) ? `${emoji} {status}` : '{status}' };
}

function window(ctx: ParseContext): Reconstructed {
  const wa = reader(ctx, FILES.window);
  const focus = wa.bool('ShowFocusedApp', true) ? `${wa.str('DesktopFocusTitle', 'ⁱⁿ')} ` : '';
  return {
    template: `{device_mode} ${focus}{window_title}`,
    options: {
      kind: 'window',
      maxTitleLength: wa.num('MaxShowTitleCount', 35),
      privateAppLabel: wa.str('PrivateName', '🔒 App'),
    },
  };
}

function twitch(ctx: ParseContext): Reconstructed {
  const tw = reader(ctx, FILES.twitch);
  const custom = tw.str('Template', '');
  if (custom.trim() !== '') {
    return { template: mapTokens(custom, TWITCH_TOKENS, TWITCH_DROPPED, ctx, FILES.twitch) };
  }
  const small = tw.bool('UseSmallText', true);
  const label = (text: string): string => (small ? superscript(text) : text);
  const parts: string[] = [];
  if (tw.bool('ShowLiveIndicator', true)) parts.push('{twitch_live}');
  if (tw.bool('ShowGameName', true))
    parts.push(`${label(tw.str('GamePrefix', 'playing'))} {twitch_game}`);
  if (tw.bool('ShowViewerCount', true)) {
    const suffix = tw.bool('ShowViewerLabel', true)
      ? ` ${label(tw.str('ViewerLabel', 'viewers'))}`
      : '';
    parts.push(`{twitch_viewers}${suffix}`);
  }
  if (tw.bool('ShowFollowerCount', false)) {
    const suffix = tw.bool('ShowFollowerLabel', true)
      ? ` ${label(tw.str('FollowerLabel', 'followers'))}`
      : '';
    parts.push(`{twitch_followers}${suffix}`);
  }
  if (tw.bool('ShowStreamTitle', false))
    parts.push(`${label(tw.str('StreamTitlePrefix', 'title'))} {twitch_title}`);
  if (tw.bool('ShowChannelName', false))
    parts.push(`${label(tw.str('ChannelPrefix', 'channel'))} {twitch_channel}`);
  const separator = tw.str('Separator', ' | ');
  return { template: parts.join(separator.trim() === '' ? ' | ' : separator) };
}

function tiktok(ctx: ParseContext): Reconstructed {
  const template = reader(ctx, FILES.tiktok).str(
    'SummaryTemplate',
    'LIVE @{host} | {viewers} viewers | {likes} likes',
  );
  return { template: mapTokens(template, TIKTOK_TOKENS, [], ctx, FILES.tiktok) };
}

function discord(ctx: ParseContext): Reconstructed {
  const template = reader(ctx, FILES.discord).str(
    'Template',
    '🔊 {channel} ({count}) | 🎙️ {speaking}',
  );
  return { template: mapTokens(template, DISCORD_TOKENS, DISCORD_DROPPED, ctx, FILES.discord) };
}

function spotify(ctx: ParseContext): Reconstructed {
  const sp = reader(ctx, FILES.spotify);
  const template = sp.str(
    'OutputTemplate',
    '{play_icon} {artist} - {title} {liked_icon} {explicit_icon}',
  );
  const pauseMode = sp.num('PauseOutputMode', 1);
  const playing = mapTokens(template, SPOTIFY_TOKENS, SPOTIFY_DROPPED, ctx, FILES.spotify);
  const paused =
    pauseMode === 0 ? '' : pauseMode === 2 ? playing : sp.str('PausedText', 'Spotify paused');
  return {
    template: playing,
    options: {
      kind: 'media',
      pausedTemplate: paused,
      stoppedTemplate: '',
      titleMaxLength: 0,
      progressBar: {
        length: sp.num('ProgressBarLength', 8),
        filled: sp.str('ProgressFilledCharacter', '▒'),
        empty: sp.str('ProgressNonFilledCharacter', '░'),
        position: sp.str('ProgressMiddleCharacter', '▓'),
        start: '',
        end: '',
      },
      transient: sp.bool('ShowOnlyOnChange', false),
      transientSeconds: sp.num('TransientDuration', 25),
    },
  };
}

function mediaLink(ctx: ParseContext): Reconstructed {
  const ml = reader(ctx, FILES.mediaLink);
  const prefixIcon = ctx.app.bool('PrefixIconMusic', true);
  const lead = prefixIcon ? '{play_icon}' : ml.str('TextPlaying', 'Listening to') || 'Listening to';
  const seekStyle = ml.num('TimeSeekStyle', 0);
  const seek =
    seekStyle === 1 ? '\n{progress_bar}' : seekStyle === 0 ? ' {position}/{duration}' : '';
  const separator = expandNewlines(ml.str('Separator', ' ᵇʸ '));
  const pauseIcon = ml.str('IconPause', '⏸');
  const paused =
    ml.bool('PauseIconMusic', true) && prefixIcon && pauseIcon.trim() !== ''
      ? pauseIcon
      : ml.str('TextPaused', 'Paused') || 'Paused';
  return {
    template: `${lead} {title}${separator}{artist}${seek}`,
    options: {
      kind: 'media',
      pausedTemplate: paused,
      stoppedTemplate: '',
      titleMaxLength: 0,
      progressBar: DEFAULT_PROGRESS_BAR,
      transient: ml.bool('ShowOnlyOnChange', false),
      transientSeconds: ml.num('TransientDuration', 25),
    },
  };
}

function vrcRadar(ctx: ParseContext): Reconstructed {
  const template = reader(ctx, FILES.vrcLog).str(
    'TemplateWorld',
    '{master}🌎 {world} | 👥 {count} | {type} {region}',
  );
  return { template: mapTokens(template, VRC_TOKENS, VRC_DROPPED, ctx, FILES.vrcLog) };
}

function heartRate(ctx: ParseContext): Reconstructed {
  const hr = reader(ctx, FILES.pulsoid);
  let text = hr.bool('MagicHeartIconPrefix', true) ? '❤️ {heartrate}' : '{heartrate}';
  if (hr.bool('ShowBPMSuffix', false)) text += ` ${BPM_SUFFIX}`;
  const trend = hr.bool('ShowHeartRateTrendIndicator', true);
  const behind = hr.bool('TrendIndicatorBehindStats', true);
  if (trend && !behind) text += ' {heartrate_trend}';
  if (hr.bool('PulsoidStatsEnabled', true)) {
    const stats: string[] = [];
    if (hr.bool('ShowAverageHeartRate', true)) stats.push(`{heartrate_avg} ${superscript('avg')}`);
    if (hr.bool('ShowMaximumHeartRate', true)) stats.push(`{heartrate_max} ${superscript('max')}`);
    if (hr.bool('ShowMinimumHeartRate', true)) stats.push(`{heartrate_min} ${superscript('min')}`);
    if (stats.length > 0) text += ` ${stats.join('|')}`;
  }
  if (trend && behind) text += ' {heartrate_trend}';
  if (hr.bool('HeartRateTitle', false))
    text = `${hr.str('CurrentHeartRateTitle', 'Heart Rate')}: ${text}`;
  return {
    template: text,
    options: {
      kind: 'heartrate',
      provider: 'pulsoid',
      smoothing: hr.bool('SmoothHeartRate', true),
      disconnectedTemplate: '',
    },
  };
}

function component(ctx: ParseContext): Reconstructed {
  const cs = reader(ctx, FILES.componentStats);
  const raw = ctx.files.raw(FILES.componentItems);
  const items = Array.isArray(raw)
    ? raw.map(
        (item) =>
          new Reader(
            typeof item === 'object' && item !== null && !Array.isArray(item) ? item : undefined,
          ),
      )
    : undefined;
  const parts: string[] = [];
  for (const spec of COMPONENTS) {
    const item = items?.find((candidate) => candidate.num('ComponentType', -1) === spec.type);
    if (items !== undefined && !(item?.bool('IsEnabled', true) ?? false)) {
      continue;
    }
    const lower = spec.name.toLowerCase();
    const name = item?.bool('ShowSmallName', true) === false ? spec.name : spec.smallName;
    let value =
      spec.showMax && (item?.bool('ShowMaxValue', true) ?? true)
        ? `{${lower}_used}/{${lower}_total}`
        : spec.showMax
          ? `{${lower}_used}`
          : `{${lower}_usage}`;
    if (spec.name === 'GPU') {
      if (item?.bool('ShowTemperature', false) ?? false) value += ' {gpu_temp}';
      if (item?.bool('ShowWattage', true) ?? true) value += ' {gpu_power}';
    }
    parts.push(`${name} ${value}`);
  }
  const fahrenheitOnly =
    cs.bool('TemperatureFahrenheit', true) && !cs.bool('TemperatureCelsius', true);
  const separator = cs.str('StatsSeparator', ' ¦ ');
  return {
    template: parts.join(separator),
    options: { kind: 'hardware', temperatureUnit: fahrenheitOnly ? 'F' : 'C', separator },
  };
}

function vrPerformance(ctx: ParseContext): Reconstructed {
  const vp = reader(ctx, FILES.vrPerformance);
  const unit = (text: string): string =>
    vp.bool('UseSuperscriptUnits', true) ? superscript(text) : text;
  const parts: string[] = [];
  if (vp.bool('ShowFps', true)) parts.push(`{vr_fps} ${unit('fps')}`);
  if (vp.bool('ShowTargetHz', false)) parts.push(`{vr_target_hz} ${unit('Hz')}`);
  if (vp.bool('ShowReprojection', true)) parts.push(`{vr_reprojection} ${unit('reproj')}`);
  if (vp.bool('ShowDroppedFrames', false)) parts.push(`{vr_dropped_frames} ${unit('dropped')}`);
  return { template: parts.join(vp.str('StatsSeparator', ' ¦ ')) };
}

function trackerBattery(ctx: ParseContext): Reconstructed {
  const tb = reader(ctx, FILES.trackerBattery);
  const showTrackers = tb.bool('ShowTrackers', false);
  const parts: string[] = [];
  if (tb.bool('ShowHeadset', true)) parts.push('HMD {hmd_battery}');
  if (tb.bool('ShowControllers', true))
    parts.push('L {left_controller_battery}', 'R {right_controller_battery}');
  if (showTrackers) parts.push('{tracker_lowest_name} {tracker_lowest_battery}');
  ctx.collector.info(
    'approximated',
    'MagicChatbox formats each tracked device with its own template; the battery segment was approximated with per-device placeholders.',
    FILES.trackerBattery,
  );
  return {
    template: `🔋 ${parts.join(' · ')}`,
    options: {
      kind: 'vr_battery',
      lowThresholdPercent: tb.num('LowThreshold', 20),
      showTrackers,
      showControllers: tb.bool('ShowControllers', true),
      showHeadset: tb.bool('ShowHeadset', true),
    },
  };
}

function network(ctx: ParseContext): Reconstructed {
  const ns = reader(ctx, FILES.network);
  const styled = ns.bool('StyledCharacters', true);
  const label = (text: string): string => (styled ? superscript(text) : text);
  const rows: readonly (readonly [string, boolean, string, string])[] = [
    ['ShowCurrentDown', true, 'Down', 'net_down'],
    ['ShowCurrentUp', false, 'Up', 'net_up'],
    ['ShowMaxDown', false, 'Max Down', 'net_max_down'],
    ['ShowMaxUp', false, 'Max Up', 'net_max_up'],
    ['ShowTotalDown', false, 'Total Down', 'net_total_down'],
    ['ShowTotalUp', false, 'Total Up', 'net_total_up'],
    ['ShowNetworkUtilization', true, 'Network Utilization', 'net_utilization'],
  ];
  const parts = rows
    .filter(([key, fallback]) => ns.bool(key, fallback))
    .map(([, , text, token]) => `${label(text)} {${token}}`);
  return { template: parts.join(' | ') };
}

function weather(ctx: ParseContext): Reconstructed {
  const ws = reader(ctx, FILES.weather);
  const cs = reader(ctx, FILES.componentStats);
  const custom = ws.str('WeatherTemplate', '');
  let template: string;
  if (custom.trim() !== '') {
    template = mapTokens(custom, WEATHER_TOKENS, WEATHER_DROPPED, ctx, FILES.weather);
  } else {
    const parts: string[] = [];
    const head = [
      ws.bool('ShowWeatherEmoji', false) ? '{weather_emoji}' : '',
      ws.bool('ShowWeatherCondition', false) ? '{weather_condition}' : '',
    ]
      .filter((part) => part !== '')
      .join(' ');
    if (head !== '') parts.push(head);
    parts.push('{weather_temp}');
    if (ws.bool('ShowWeatherFeelsLike', false))
      parts.push(`${superscript('feels')} {weather_feels_like}`);
    if (ws.bool('ShowWeatherHumidity', false)) parts.push('💧{weather_humidity}');
    if (ws.bool('ShowWeatherWind', false)) parts.push('💨{weather_wind}');
    template = parts.join(ws.str('WeatherStatsSeparator', ' '));
  }
  const override = ws.num('WeatherUnitOverride', 0);
  const globalF = cs.bool('TemperatureFahrenheit', true) && !cs.bool('TemperatureCelsius', true);
  const fahrenheit = override === 0 ? globalF : override === 2 || override === 4;
  const modeIndex = ws.num('WeatherLocationMode', 0);
  if (ws.str('WeatherLocationCityEncrypted', '') !== '') {
    ctx.collector.info(
      'encrypted-value',
      'The weather city is stored DPAPI-encrypted and cannot be read; set it again in the target app.',
      FILES.weather,
    );
  }
  return {
    template,
    options: {
      kind: 'weather',
      temperatureUnit: fahrenheit ? 'F' : 'C',
      locationMode: modeIndex === 1 ? 'coordinates' : modeIndex === 2 ? 'ip' : 'city',
      city: '',
      latitude: ws.num('WeatherLocationLatitude', 0),
      longitude: ws.num('WeatherLocationLongitude', 0),
      updateIntervalMinutes: Math.max(1, ws.num('WeatherUpdateIntervalMinutes', 10)),
    },
  };
}

function time(ctx: ParseContext): Reconstructed {
  const ts = reader(ctx, FILES.time);
  const showTimezone = ts.bool('TimeShowTimeZone', false);
  const clock = showTimezone ? '{time} {timezone}' : '{time}';
  const zoneIndex = ts.num('SelectedTimeZone', 0);
  return {
    template: ts.bool('PrefixTime', false) ? `${MY_TIME_LABEL} ${clock}` : clock,
    options: {
      kind: 'time',
      use24Hour: ts.bool('Time24H', false),
      showSeconds: false,
      timezone: TIMEZONES[zoneIndex] ?? 'UTC',
      showTimezone,
    },
  };
}

function soundpad(ctx: ParseContext): Reconstructed {
  return {
    template: ctx.app.bool('PrefixIconSoundpad', true)
      ? "🎶 '{soundpad_sound}'"
      : "'{soundpad_sound}'",
  };
}

function lyrics(ctx: ParseContext): Reconstructed {
  return {
    template: reader(ctx, FILES.lyrics).bool('ShowNoteIcon', true) ? '♪ {lyrics}' : '{lyrics}',
  };
}

export const TEMPLATE_BUILDERS: Readonly<Record<SortKey, (ctx: ParseContext) => Reconstructed>> = {
  Status: status,
  Window: window,
  Twitch: twitch,
  TikTokLive: tiktok,
  Discord: discord,
  Spotify: spotify,
  VrcRadar: vrcRadar,
  HeartRate: heartRate,
  Component: component,
  VrPerformance: vrPerformance,
  TrackerBattery: trackerBattery,
  Network: network,
  Weather: weather,
  Time: time,
  Soundpad: soundpad,
  Voicemod: () => ({ template: "🎙️ '{voicemod_voice}'" }),
  MediaLink: mediaLink,
  Lyrics: lyrics,
};
