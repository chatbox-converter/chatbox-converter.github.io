import { describe, expect, it } from 'vitest';
import { PLACEHOLDER_NAMES, type PlaceholderName } from '../../model/placeholders';
import { createDefaultProfile, createStatusItem } from '../../model/profile';
import { createSegment } from '../../model/segments';
import type { ConfigFile } from '../codec';
import { CANONICAL_SOURCES, MODULES, findModule, vrcoscCodec } from './index';
import { parseVJson, type VObject } from './vjson';

/**
 * Bluscream/VRCOSC-Modules 2026.0926.3: catalog sanity, segment-level module
 * preference, compound states for every module state and the Status module.
 */
const B = 'bluscream.vrcosc.modules';
const MEDIA = 'volcanicarts.vrcosc.officialmodules.mediamodule';
const NEW_MODULES = [
  'statusmodule',
  'streamstatsmodule',
  'discordvoicemodule',
  'heartratestatsmodule',
  'linuxaudiofxmodule',
  'vrcextrasmodule',
  'mcbparitymodule',
  'openmeteoweathermodule',
  'translationpatchesmodule',
] as const;

/** Placeholders the converter provides itself (aliases and literals). */
const CONVERTER_SIDE: readonly PlaceholderName[] = [
  'status',
  'play_icon',
  'date',
  'timezone',
  'progress_percent',
  'translation',
];

interface StateJson {
  readonly format: string;
  readonly variables: { module_id: string | null; variable_id: string; options: VObject }[];
  readonly states: Record<string, string> | null;
}

interface ClipJson {
  readonly linked_modules: string[];
  readonly states: StateJson[];
}

function clipOf(files: readonly ConfigFile[]): ClipJson {
  const file = files.find((candidate) => candidate.path === 'chatbox.json');
  const document = parseVJson(file?.content ?? '', 'chatbox.json') as VObject;
  const clips = (document['timeline'] as VObject)['clips'] as unknown as ClipJson[];
  expect(clips).toHaveLength(1);
  return clips[0] ?? { linked_modules: [], states: [] };
}

function stateWhere(clip: ClipJson, wanted: Record<string, string>): StateJson | undefined {
  return clip.states.find((state) =>
    Object.entries(wanted).every(([moduleId, stateId]) => state.states?.[moduleId] === stateId),
  );
}

describe('Bluscream catalog', () => {
  it('lists the new modules with resolvable states and canonical sources', () => {
    for (const shortId of NEW_MODULES) {
      const module = findModule(`${B}.${shortId}`);
      expect(module, shortId).toBeDefined();
      expect(module?.official).toBe(false);
      expect(module?.mainState !== undefined && module.states[module.mainState]).toBeTruthy();
    }
    expect(findModule(`${B}.linuxhardwarestatsmodule`)?.variables['networkutilization']).toEqual({
      type: 'int',
      displayName: 'Network Utilization (%)',
      canonical: 'net_utilization',
    });
    expect(findModule(`${B}.linuxmediamodule`)?.variables['lyrics']?.canonical).toBe('lyrics');
    expect(Object.keys(findModule(`${B}.openxrstatisticsmodule`)?.states ?? {})).toEqual([
      'default',
      'noruntime',
    ]);
    expect(findModule(`${B}.heartratestatsmodule`)?.variables['heartrate_min']?.canonical).toBe(
      'heartrate_min',
    );
    expect(findModule(`${B}.streamstatsmodule`)?.variables['twitch_viewers']?.canonical).toBe(
      'twitch_viewers',
    );
  });

  it('gives every canonical placeholder a source in a module with states', () => {
    const stateful = new Set(
      MODULES.filter((module) => module.mainState !== undefined).map((module) => module.fullId),
    );
    const usable = PLACEHOLDER_NAMES.filter(
      (name) =>
        CONVERTER_SIDE.includes(name) ||
        (CANONICAL_SOURCES.get(name) ?? []).some(
          (source) => source.moduleId === null || stateful.has(source.moduleId),
        ),
    );
    expect(usable).toHaveLength(PLACEHOLDER_NAMES.length);
  });
});

describe('segment-level module preference', () => {
  const profile = createDefaultProfile({
    afk: { enabled: false, timeoutSeconds: 120, template: '', replaceEverything: false },
    segments: [
      createSegment('heartrate', {
        id: 'h',
        template: '♥ {heartrate} ({heartrate_min}-{heartrate_max}) {heartrate_trend}',
      }),
      createSegment('weather', { id: 'w', template: '{weather_temp} {weather_wind}' }),
      createSegment('twitch', { id: 't', template: '{twitch_viewers} viewers' }),
      createSegment('vrchat', { id: 'v', template: '🌎 {vrc_world}' }),
      createSegment('vr_performance', { id: 'p', template: '{vr_reprojection} reproj' }),
      createSegment('network', { id: 'n', template: '{net_utilization}' }),
      createSegment('soundpad', { id: 's', template: '{soundpad_sound}' }),
      createSegment('discord', { id: 'd', template: '{discord_speaking}' }),
      createSegment('media', { id: 'm', template: '{play_icon} {title} ♪ {lyrics}' }),
    ],
  });
  const result = vrcoscCodec.serialize(profile);
  const clip = clipOf(result.files);

  it('links one Bluscream module per segment and reports nothing unsupported', () => {
    expect(result.diagnostics.filter((d) => d.code === 'unsupported-feature')).toEqual([]);
    expect(result.diagnostics.filter((d) => d.code === 'stateless-module')).toEqual([]);
    expect(clip.linked_modules).toEqual([
      `${B}.heartratestatsmodule`,
      `${B}.openmeteoweathermodule`,
      `${B}.streamstatsmodule`,
      `${B}.vrcextrasmodule`,
      `${B}.mcbparitymodule`,
      `${B}.linuxhardwarestatsmodule`,
      `${B}.linuxaudiofxmodule`,
      `${B}.discordvoicemodule`,
      `${B}.linuxmediamodule`,
    ]);
    expect(result.files.map((file) => file.path)).toEqual([
      'chatbox.json',
      ...clip.linked_modules.map((id) => `modules/${id}.json`),
    ]);
  });

  it('writes the HypeRate provider into the Heartrate Stats settings', () => {
    const hyperate = createDefaultProfile({
      segments: [
        createSegment('heartrate', {
          id: 'h',
          template: '{heartrate} {heartrate_trend}',
          options: {
            kind: 'heartrate',
            provider: 'hyperate',
            smoothing: true,
            disconnectedTemplate: '💤',
          },
        }),
      ],
    });
    const { files } = vrcoscCodec.serialize(hyperate);
    const settings = files.find((file) => file.path.endsWith('heartratestatsmodule.json'));
    expect(JSON.parse(settings?.content ?? '{}')).toMatchObject({ settings: { provider: 1 } });
    const clip = clipOf(files);
    const down = stateWhere(clip, { [`${B}.heartratestatsmodule`]: 'disconnected' });
    expect(down?.format).toBe('💤');
  });

  it('uses the real Linux Media play icon and takes every heart value from Heartrate Stats', () => {
    const main = clip.states[0];
    expect(main?.states).toEqual(
      Object.fromEntries(
        clip.linked_modules.map((id) => {
          const module = findModule(id);
          return [id, module?.mainState];
        }),
      ),
    );
    expect(Object.keys(main?.states ?? {})).toEqual(clip.linked_modules);
    const heart = main?.variables.slice(0, 4).map((v) => [v.module_id, v.variable_id]);
    expect(heart).toEqual([
      [`${B}.heartratestatsmodule`, 'heartrate'],
      [`${B}.heartratestatsmodule`, 'heartrate_min'],
      [`${B}.heartratestatsmodule`, 'heartrate_max'],
      [`${B}.heartratestatsmodule`, 'heartrate_trend'],
    ]);
    const media = main?.variables.filter((v) => v.module_id === `${B}.linuxmediamodule`);
    expect(media?.map((v) => v.variable_id)).toEqual(['playicon', 'title', 'lyrics']);
    expect(main?.format.endsWith('{12} {13} ♪ {14}')).toBe(true);
  });

  it('writes a compound state for every module state, hiding the segment when not main', () => {
    // 2 × 2 × 3 × 2 × 1 × 1 × 2 × 3 × 3 = 432 ≤ 512: the full product, Linux Audio FX keeps
    // every combination non-empty.
    expect(result.diagnostics.some((d) => d.code === 'too-many-states')).toBe(false);
    expect(clip.states).toHaveLength(432);
    const offline = stateWhere(clip, { [`${B}.streamstatsmodule`]: 'offline' });
    expect(offline?.format).not.toContain('viewers');
    const away = stateWhere(clip, { [`${B}.vrcextrasmodule`]: 'notininstance' });
    expect(away?.format).not.toContain('🌎');
    const noWeather = stateWhere(clip, { [`${B}.openmeteoweathermodule`]: 'unavailable' });
    expect(noWeather?.variables.some((v) => v.module_id === `${B}.openmeteoweathermodule`)).toBe(
      false,
    );
    const quiet = stateWhere(clip, { [`${B}.discordvoicemodule`]: 'notinvoice' });
    expect(quiet?.variables.some((v) => v.variable_id === 'discord_speaking')).toBe(false);
    // Linux Audio FX keeps the segment in both states; MagicChatbox Parity only has `default`.
    const playing = stateWhere(clip, { [`${B}.linuxaudiofxmodule`]: 'playing' });
    expect(playing?.variables.some((v) => v.variable_id === 'soundpad_sound')).toBe(true);
    expect(Object.keys(findModule(`${B}.mcbparitymodule`)?.states ?? {})).toEqual(['default']);
    expect(clip.states.every((s) => s.states?.[`${B}.mcbparitymodule`] === 'default')).toBe(true);
    const paused = stateWhere(clip, { [`${B}.linuxmediamodule`]: 'paused' });
    expect(paused?.format).toContain('⏸ {');
  });

  it('keeps official modules for plain segments and enumerates the full product below the cap', () => {
    const plain = createDefaultProfile({
      segments: [
        createSegment('heartrate', { id: 'h' }),
        createSegment('weather', { id: 'w', template: '{weather_temp} {weather_condition}' }),
        createSegment('media', { id: 'm' }),
        createSegment('vrchat', { id: 'v' }),
      ],
    });
    const { files, diagnostics } = vrcoscCodec.serialize(plain);
    const clip = clipOf(files);
    expect(clip.linked_modules).toEqual([
      'volcanicarts.vrcosc.officialmodules.pulsoidmodule',
      'volcanicarts.vrcosc.officialmodules.weathermodule',
      MEDIA,
      `${B}.vrcextrasmodule`,
    ]);
    // 2 × 1 × 3 × 2 = 12, the status text keeps every combination non-empty.
    expect(clip.states).toHaveLength(12);
    expect(diagnostics.some((d) => d.code === 'too-many-states')).toBe(false);
    // VRChat Extras now fills the master icon and the world capacity itself (2026.0926.3).
    const vrchat = clip.states[0]?.variables.filter((v) => v.module_id === `${B}.vrcextrasmodule`);
    expect(vrchat?.map((v) => v.variable_id)).toEqual([
      'mastericon',
      'world',
      'playercount',
      'vrc_instance_capacity',
    ]);
    const away = stateWhere(clip, { [`${B}.vrcextrasmodule`]: 'notininstance' });
    expect(away?.variables.some((v) => v.module_id === `${B}.vrcextrasmodule`)).toBe(false);
  });

  it('takes the zone abbreviation from MagicChatbox Parity only when no DateTime value is needed', () => {
    const zoneOnly = createDefaultProfile({
      segments: [createSegment('time', { id: 't', template: 'Zone {timezone}' })],
    });
    const alone = vrcoscCodec.serialize(zoneOnly);
    expect(clipOf(alone.files).linked_modules).toEqual([`${B}.mcbparitymodule`]);
    expect(clipOf(alone.files).states[0]?.variables[0]).toEqual({
      module_id: `${B}.mcbparitymodule`,
      variable_id: 'timezone',
      options: {},
    });
    expect(alone.diagnostics.some((d) => d.code === 'timezone-offset')).toBe(false);

    const withTime = createDefaultProfile({
      segments: [createSegment('time', { id: 't', template: '{time} {timezone}' })],
    });
    const clock = vrcoscCodec.serialize(withTime);
    expect(clipOf(clock.files).linked_modules).toEqual([
      'volcanicarts.vrcosc.officialmodules.datetimemodule',
    ]);
    expect(clipOf(clock.files).states[0]?.variables[1]?.options['datetime_format']).toBe('zzz');
    expect(clock.diagnostics.some((d) => d.code === 'timezone-offset')).toBe(true);
  });

  it('chooses Fahrenheit variables from Open-Meteo and writes its location', () => {
    const f = createDefaultProfile({
      segments: [
        createSegment('weather', {
          id: 'w',
          template: '{weather_emoji} {weather_temp} (feels {weather_feels_like})',
          options: {
            kind: 'weather',
            temperatureUnit: 'F',
            locationMode: 'city',
            city: 'Berlin',
            latitude: 0,
            longitude: 0,
            updateIntervalMinutes: 10,
          },
        }),
      ],
    });
    const { files } = vrcoscCodec.serialize(f);
    const clip = clipOf(files);
    expect(clip.states[0]?.variables.map((v) => v.variable_id)).toEqual([
      'emoji',
      'tempf',
      'feelslikef',
    ]);
    const settings = files.find((file) => file.path.endsWith('openmeteoweathermodule.json'));
    expect(JSON.parse(settings?.content ?? '{}')).toMatchObject({
      settings: { location: 'Berlin' },
    });
  });
});

describe('Speech Translation', () => {
  it('provides {speech_text} and {translation} as real variables and hides the segment when idle', () => {
    const profile = createDefaultProfile({
      segments: [
        createSegment('speech', { id: 's', template: '🗣 {speech_text} → {translation}' }),
        createSegment('time', { id: 't', template: '{time}' }),
      ],
    });
    const { files, diagnostics } = vrcoscCodec.serialize(profile);
    const clip = clipOf(files);
    expect(clip.linked_modules).toEqual([
      `${B}.translationpatchesmodule`,
      'volcanicarts.vrcosc.officialmodules.datetimemodule',
    ]);
    expect(diagnostics.some((d) => d.code === 'translation-app-side')).toBe(false);
    expect(diagnostics.filter((d) => d.code === 'unsupported-feature')).toEqual([]);
    const speaking = stateWhere(clip, { [`${B}.translationpatchesmodule`]: 'speaking' });
    expect(speaking?.format).toBe('🗣 {0} → {1}\n{2}');
    expect(speaking?.variables.slice(0, 2).map((v) => [v.module_id, v.variable_id])).toEqual([
      [`${B}.translationpatchesmodule`, 'speech_text'],
      [`${B}.translationpatchesmodule`, 'translation'],
    ]);
    const idle = stateWhere(clip, { [`${B}.translationpatchesmodule`]: 'idle' });
    expect(idle?.format).toBe('{0}');
    expect(idle?.variables.some((v) => v.module_id === `${B}.translationpatchesmodule`)).toBe(
      false,
    );
    const settings = files.find((file) => file.path.endsWith('translationpatchesmodule.json'));
    expect(JSON.parse(settings?.content ?? '{}')).toEqual({
      version: 1,
      enabled: true,
      settings: {},
      parameters: {},
    });

    const back = vrcoscCodec.parse(files).profile;
    expect(back.segments.map((segment) => segment.template)).toContain(
      '🗣 {speech_text} → {translation}',
    );
  });
});

describe('Status module', () => {
  it('uses the Status module for grouped statuses and hides the line when idle', () => {
    const profile = createDefaultProfile({
      statuses: [
        createStatusItem('hi', { id: 'a', active: true, group: 'day' }),
        createStatusItem('bye', { id: 'b', group: 'night' }),
      ],
      segments: [createSegment('status', { id: 's' }), createSegment('time', { id: 't' })],
    });
    const { files, diagnostics } = vrcoscCodec.serialize(profile);
    const clip = clipOf(files);
    expect(clip.linked_modules[0]).toBe(`${B}.statusmodule`);
    expect(clip.states.map((state) => [state.states?.[`${B}.statusmodule`], state.format])).toEqual(
      [
        ['default', '{0}\n{1}'],
        ['idle', '{0}'],
      ],
    );
    expect(clip.states[0]?.variables[0]).toEqual({
      module_id: `${B}.statusmodule`,
      variable_id: 'text',
      options: {},
    });
    const settings = files.find((file) => file.path === `modules/${B}.statusmodule.json`);
    expect(JSON.parse(settings?.content ?? '{}')).toEqual({
      version: 1,
      enabled: true,
      settings: {
        statuses: [
          { text: 'hi', group: 'day', cycle: false },
          { text: 'bye', group: 'night', cycle: false },
        ],
        interval: 10,
        prefixicon: false,
      },
      parameters: {},
    });
    expect(diagnostics.some((d) => d.code === 'status-module')).toBe(true);

    const back = vrcoscCodec.parse(files).profile;
    expect(back.statuses.map((item) => [item.text, item.group, item.active])).toEqual([
      ['hi', 'day', true],
      ['bye', 'night', false],
    ]);
    expect(back.statusCycle.enabled).toBe(false);
  });

  it('keeps the built-in text variable for a single ungrouped status', () => {
    const { files } = vrcoscCodec.serialize(
      createDefaultProfile({ segments: [createSegment('status', { id: 's' })] }),
    );
    const clip = clipOf(files);
    expect(clip.linked_modules).toEqual([]);
    expect(clip.states[0]?.variables[0]).toMatchObject({ module_id: null, variable_id: 'text' });
  });

  it('warns and keeps a placeholder status when the module file is missing', () => {
    const profile = createDefaultProfile({
      statuses: [
        createStatusItem('a', { id: 'a', active: true }),
        createStatusItem('b', { id: 'b' }),
      ],
      segments: [createSegment('status', { id: 's' })],
    });
    const { files } = vrcoscCodec.serialize(profile);
    const withoutModule = files.filter((file) => file.path === 'chatbox.json');
    const { profile: back, diagnostics } = vrcoscCodec.parse(withoutModule);
    expect(diagnostics.some((d) => d.code === 'status-module-missing')).toBe(true);
    expect(back.statuses).toHaveLength(1);
    expect(back.segments.map((segment) => segment.template)).toEqual(['{status}']);
  });
});
