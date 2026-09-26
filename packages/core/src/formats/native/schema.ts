import { z } from 'zod';
import { FORMAT_IDS } from '../../model/profile';
import {
  HEARTRATE_PROVIDERS,
  SEGMENT_KINDS,
  TEMPERATURE_UNITS,
  WEATHER_LOCATION_MODES,
} from '../../model/segments';

const visibility = z.object({ desktop: z.boolean(), vr: z.boolean() });

const progressBar = z.object({
  length: z.number().int().min(0).max(64),
  filled: z.string(),
  empty: z.string(),
  position: z.string(),
  start: z.string(),
  end: z.string(),
});

const options = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('media'),
    pausedTemplate: z.string(),
    stoppedTemplate: z.string(),
    titleMaxLength: z.number().int().min(0),
    progressBar,
    transient: z.boolean(),
    transientSeconds: z.number().min(0),
  }),
  z.object({
    kind: z.literal('hardware'),
    temperatureUnit: z.enum(TEMPERATURE_UNITS),
    separator: z.string(),
  }),
  z.object({
    kind: z.literal('time'),
    use24Hour: z.boolean(),
    showSeconds: z.boolean(),
    timezone: z.string(),
    showTimezone: z.boolean(),
  }),
  z.object({
    kind: z.literal('weather'),
    temperatureUnit: z.enum(TEMPERATURE_UNITS),
    locationMode: z.enum(WEATHER_LOCATION_MODES),
    city: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    updateIntervalMinutes: z.number().int().min(1),
  }),
  z.object({
    kind: z.literal('heartrate'),
    provider: z.enum(HEARTRATE_PROVIDERS),
    smoothing: z.boolean(),
    disconnectedTemplate: z.string(),
  }),
  z.object({
    kind: z.literal('window'),
    maxTitleLength: z.number().int().min(0),
    privateAppLabel: z.string(),
  }),
  z.object({
    kind: z.literal('vr_battery'),
    lowThresholdPercent: z.number().int().min(1).max(100),
    showTrackers: z.boolean(),
    showControllers: z.boolean(),
    showHeadset: z.boolean(),
  }),
  z.object({ kind: z.literal('custom'), timerTarget: z.string(), filePath: z.string() }),
  z.object({
    kind: z.enum([
      'status',
      'lyrics',
      'vrchat',
      'vr_performance',
      'network',
      'twitch',
      'tiktok',
      'discord',
      'soundpad',
      'voicemod',
      'speech',
    ]),
  }),
]);

const segment = z.object({
  id: z.string().min(1),
  kind: z.enum(SEGMENT_KINDS),
  enabled: z.boolean(),
  visibility,
  template: z.string(),
  options,
});

export const profileSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    name: z.string(),
    source: z.enum(FORMAT_IDS).nullable(),
    notes: z.array(z.string()),
  }),
  statuses: z.array(
    z.object({
      id: z.string().min(1),
      text: z.string(),
      active: z.boolean(),
      useInCycle: z.boolean(),
      favorite: z.boolean(),
      group: z.string(),
    }),
  ),
  statusCycle: z.object({
    enabled: z.boolean(),
    intervalSeconds: z.number().min(1),
    random: z.boolean(),
  }),
  afk: z.object({
    enabled: z.boolean(),
    timeoutSeconds: z.number().min(0),
    template: z.string(),
    replaceEverything: z.boolean(),
  }),
  output: z.object({
    separator: z.string(),
    separateWithNewlines: z.boolean(),
    prefix: z.string(),
    suffix: z.string(),
    minimalBackground: z.boolean(),
    sendIntervalSeconds: z.number().min(0),
  }),
  osc: z.object({ host: z.string(), port: z.number().int().min(1).max(65535) }),
  segments: z.array(segment),
  extras: z.record(z.enum(FORMAT_IDS), z.unknown()),
});
