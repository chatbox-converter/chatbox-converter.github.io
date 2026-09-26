/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPlaceholderName, PLACEHOLDERS } from '../../model/placeholders';
import { createDefaultProfile, createStatusItem } from '../../model/profile';
import { createSegment } from '../../model/segments';
import { ConfigParseError, type ConfigFile } from '../codec';
import { BUILT_IN_VARIABLES, CANONICAL_SOURCES, MODULES, vrcoscCodec } from './index';
import { readExtras } from './merge';
import { parseVJson, vEqual, type VObject } from './vjson';
const FIXTURES = join(import.meta.dirname, 'fixtures');
const MEDIA = 'volcanicarts.vrcosc.officialmodules.mediamodule';
const PULSOID = 'volcanicarts.vrcosc.officialmodules.pulsoidmodule';
const DATETIME = 'volcanicarts.vrcosc.officialmodules.datetimemodule';
const AFK = 'volcanicarts.vrcosc.officialmodules.afkdetectionmodule';

function fixture(name: string, path = name): ConfigFile {
  return { path, content: readFileSync(join(FIXTURES, name), 'utf8') };
}

function twoClips(): ConfigFile[] {
  return [fixture('two-clips.json', 'profiles/abc/chatbox.json')];
}

function compoundWithModules(): ConfigFile[] {
  return [
    fixture('compound.json', 'chatbox.json'),
    fixture(`modules/${DATETIME}.json`),
    fixture('modules/volcanicarts.vrcosc.officialmodules.weathermodule.json'),
    fixture(`modules/${PULSOID}.json`),
    fixture('configuration/settings.json'),
  ];
}

function chatboxOf(files: readonly ConfigFile[]): VObject {
  const file = files.find((candidate) => candidate.path === 'chatbox.json');
  expect(file).toBeDefined();
  return parseVJson(file?.content ?? '', 'chatbox.json') as VObject;
}

interface ClipJson {
  readonly layer: number;
  readonly start: number;
  readonly end: number;
  readonly linked_modules: string[];
  readonly states: {
    readonly enabled: boolean;
    readonly format: string;
    readonly variables: { module_id: string | null; variable_id: string; options: VObject }[];
    readonly states: Record<string, string> | null;
  }[];
}

function clipsOf(document: VObject): ClipJson[] {
  const timeline = document['timeline'] as VObject;
  return timeline['clips'] as unknown as ClipJson[];
}

describe('vrcoscCodec.detect', () => {
  it('recognises chatbox.json by name and by shape', () => {
    expect(vrcoscCodec.detect(twoClips())).toBe(1);
    expect(vrcoscCodec.detect([fixture('two-clips.json', 'export.json')])).toBe(0.9);
    expect(vrcoscCodec.detect([fixture(`modules/${DATETIME}.json`)])).toBe(0.3);
    expect(vrcoscCodec.detect([{ path: 'x.json', content: '{"version":1,"segments":[]}' }])).toBe(
      0,
    );
    expect(vrcoscCodec.detect([{ path: 'chatbox.json', content: 'nope' }])).toBe(0);
  });
});

describe('vrcoscCodec.parse', () => {
  it('parses the two-clip example from the format notes', () => {
    const { profile, diagnostics } = vrcoscCodec.parse(twoClips());
    expect(profile.meta.source).toBe('vrcosc');
    expect(profile.segments).toHaveLength(2);
    const [music, countdown] = profile.segments;
    expect(music?.kind).toBe('media');
    expect(music?.template).toBe('🎵 {artist} - {title}\n{position}/{duration} {progress_bar}');
    expect(music?.options.kind === 'media' && music.options.titleMaxLength).toBe(0);
    expect(music?.options.kind === 'media' && music.options.pausedTemplate).toBe('');
    expect(countdown?.kind).toBe('custom');
    expect(countdown?.template).toBe('Stream starts in {timer}');
    // 638990490000000000 ticks = 2025-11-18T07:50:00Z exactly (no sub-millisecond part).
    expect(countdown?.options.kind === 'custom' && countdown.options.timerTarget).toBe(
      '2025-11-18T07:50:00.000Z',
    );
    expect(profile.output.minimalBackground).toBe(true);
    expect(profile.statuses).toHaveLength(0);
    expect(profile.meta.notes).toContain("Clip 'Music' 0–30 s on layer 0");
    expect(profile.meta.notes).toContain("Clip 'Countdown' 0–60 s on layer 1");
    const codes = diagnostics.map((d) => d.code);
    expect(codes).toContain('events-not-modelled');
    expect(codes).toContain('option-not-modelled');
    expect(diagnostics.some((d) => d.message.includes('truncate_length=20'))).toBe(true);
    const extras = readExtras(profile.extras.vrcosc);
    expect(extras?.states).toHaveLength(2);
    expect(extras?.chatbox).toContain('638990490000000000');
  });

  it('splits a compound state into per-kind segments and keeps the paused variant', () => {
    const { profile, diagnostics } = vrcoscCodec.parse(compoundWithModules());
    expect(profile.segments.map((segment) => segment.kind)).toEqual([
      'media',
      'heartrate',
      'time',
      'status',
    ]);
    const [media, heart, time] = profile.segments;
    expect(media?.template).toBe('▶ {artist} - {title}');
    expect(media?.options.kind === 'media' && media.options.pausedTemplate).toBe(
      '⏸ {artist} - {title}',
    );
    expect(media?.options.kind === 'media' && media.options.titleMaxLength).toBe(24);
    expect(heart?.template).toBe('♥ {heartrate} bpm');
    expect(heart?.options.kind === 'heartrate' && heart.options.provider).toBe('pulsoid');
    expect(time?.template).toBe('🕒 {time}');
    expect(time?.options).toEqual({
      kind: 'time',
      use24Hour: false,
      showSeconds: true,
      timezone: 'Tokyo Standard Time',
      showTimezone: false,
    });
    expect(profile.statuses.map((item) => item.text)).toEqual(['Enjoy 💖']);
    expect(profile.statuses[0]?.active).toBe(true);
    expect(profile.output.sendIntervalSeconds).toBe(2);
    expect(profile.osc).toEqual({ host: '192.168.1.20', port: 9010 });
    expect(
      diagnostics.some((d) => d.code === 'module-disabled' && d.message.includes(PULSOID)),
    ).toBe(true);
  });

  it('reads the timezone and weather location from the module files', () => {
    const chatbox = {
      version: 1,
      timeline: {
        length: 60,
        clips: [
          {
            layer: 0,
            enabled: true,
            name: 'Weather',
            start: 0,
            end: 60,
            linked_modules: [DATETIME, 'volcanicarts.vrcosc.officialmodules.weathermodule'],
            states: [
              {
                enabled: true,
                format: '{0} {1}°F {2}',
                show_typing: false,
                use_minimal_background: false,
                variables: [
                  { module_id: DATETIME, variable_id: 'now', options: {} },
                  {
                    module_id: 'volcanicarts.vrcosc.officialmodules.weathermodule',
                    variable_id: 'tempf',
                    options: {},
                  },
                  {
                    module_id: 'volcanicarts.vrcosc.officialmodules.weathermodule',
                    variable_id: 'condition',
                    options: {},
                  },
                ],
                states: {
                  [DATETIME]: 'default',
                  'volcanicarts.vrcosc.officialmodules.weathermodule': 'default',
                },
              },
            ],
            events: [],
          },
        ],
      },
    };
    const files = [
      { path: 'chatbox.json', content: JSON.stringify(chatbox) },
      ...compoundWithModules().slice(1),
    ];
    const { profile } = vrcoscCodec.parse(files);
    expect(profile.segments).toHaveLength(1);
    const [segment] = profile.segments;
    expect(segment?.kind).toBe('custom');
    expect(segment?.template).toBe('{time} {weather_temp}°F {weather_condition}');
  });

  it('applies defaults for an empty timeline and rejects other versions', () => {
    const empty = [
      { path: 'chatbox.json', content: '{"version":1,"timeline":{"length":60,"clips":[]}}' },
    ];
    const { profile, diagnostics } = vrcoscCodec.parse(empty);
    expect(profile.segments).toEqual([]);
    expect(profile.statuses).toEqual([]);
    expect(profile.output.sendIntervalSeconds).toBe(1.5);
    expect(profile.osc).toEqual({ host: '127.0.0.1', port: 9000 });
    expect(diagnostics).toEqual([]);
    expect(() =>
      vrcoscCodec.parse([{ path: 'chatbox.json', content: '{"version":2,"timeline":{}}' }]),
    ).toThrow(ConfigParseError);
    expect(() => vrcoscCodec.parse([{ path: 'other.json', content: '{}' }])).toThrow(
      ConfigParseError,
    );
  });

  it('keeps unknown variables as literal tokens and reports them', () => {
    const chatbox = {
      version: 1,
      timeline: {
        length: 60,
        clips: [
          {
            layer: 0,
            enabled: true,
            name: 'Mystery',
            start: 0,
            end: 60,
            linked_modules: ['local.mymodule', MEDIA],
            states: [
              {
                enabled: true,
                format: '{0} | {1} | {2}',
                show_typing: false,
                use_minimal_background: false,
                variables: [
                  { module_id: 'local.mymodule', variable_id: 'thing', options: {} },
                  { module_id: MEDIA, variable_id: 'genres', options: {} },
                  { module_id: MEDIA, variable_id: 'title', options: {} },
                ],
                states: { 'local.mymodule': 'default', [MEDIA]: 'playing' },
              },
            ],
            events: [],
          },
        ],
      },
    };
    const { profile, diagnostics } = vrcoscCodec.parse([
      { path: 'chatbox.json', content: JSON.stringify(chatbox) },
    ]);
    expect(profile.segments[0]?.template).toBe('{mymodule:thing} | {mediamodule:genres} | {title}');
    expect(diagnostics.map((d) => d.code)).toEqual(
      expect.arrayContaining(['unknown-module', 'unmapped-variable']),
    );
  });
});

describe('vrcoscCodec.serialize', () => {
  it('writes a valid single-clip document for the default profile', () => {
    const profile = createDefaultProfile({
      segments: [createSegment('status'), createSegment('time')],
    });
    const { files, diagnostics } = vrcoscCodec.serialize(profile);
    expect(files.map((file) => file.path)).toEqual(['chatbox.json', `modules/${DATETIME}.json`]);
    const document = chatboxOf(files);
    expect(Object.keys(document)[0]).toBe('version');
    expect(document['version']).toBe(1);
    const clips = clipsOf(document);
    expect(clips).toHaveLength(1);
    const [clip] = clips;
    expect(clip?.start).toBe(0);
    expect(clip?.end).toBe(60);
    expect(clip?.linked_modules).toEqual([DATETIME]);
    expect(clip?.states).toHaveLength(1);
    const [state] = clip?.states ?? [];
    expect(state?.enabled).toBe(true);
    expect(state?.format).toBe('{0}\n{1}');
    expect(state?.states).toEqual({ [DATETIME]: 'default' });
    expect(state?.variables.map((v) => [v.module_id, v.variable_id])).toEqual([
      [null, 'text'],
      [DATETIME, 'now'],
    ]);
    expect(state?.variables[0]?.options['text']).toBe('Enjoy 💖');
    expect(state?.variables[1]?.options['datetime_format']).toBe('HH:mm');
    // Options are all-or-nothing: the datetime variable carries the base options too.
    expect(state?.variables[1]?.options['case_mode']).toBe(0);
    expect(diagnostics.some((d) => d.code === 'import-instructions')).toBe(true);
    expect(diagnostics.filter((d) => d.level === 'warning')).toEqual([]);

    const back = vrcoscCodec.parse(files).profile;
    expect(back.segments.map((segment) => segment.template)).toEqual(['{status}', '{time}']);
    expect(back.statuses.map((item) => item.text)).toEqual(['Enjoy 💖']);
  });

  it('emits paused/stopped/AFK compound states in linked_modules order', () => {
    const profile = createDefaultProfile({
      segments: [
        createSegment('status', { id: 's' }),
        createSegment('media', {
          id: 'm',
          template: '▶ {artist} - {title} {progress_bar}',
          options: {
            kind: 'media',
            pausedTemplate: '⏸ {title}',
            stoppedTemplate: '',
            titleMaxLength: 30,
            progressBar: { length: 8, filled: '█', empty: '░', position: '', start: '[', end: ']' },
            transient: false,
            transientSeconds: 25,
          },
        }),
        createSegment('heartrate', { id: 'h' }),
      ],
      afk: {
        enabled: true,
        timeoutSeconds: 60,
        template: '💤 AFK for {afk_duration}',
        replaceEverything: false,
      },
      output: {
        separator: ' | ',
        separateWithNewlines: false,
        prefix: '',
        suffix: '',
        minimalBackground: true,
        sendIntervalSeconds: 1.5,
      },
    });
    const { files } = vrcoscCodec.serialize(profile);
    const [clip] = clipsOf(chatboxOf(files));
    expect(clip?.linked_modules).toEqual([MEDIA, PULSOID, AFK]);
    // media 3 × heartrate 2 × afk 2 = 12 combinations, all non-empty thanks to the status text.
    expect(clip?.states).toHaveLength(12);
    const main = clip?.states[0];
    expect(main?.states).toEqual({ [MEDIA]: 'playing', [PULSOID]: 'connected', [AFK]: 'notafk' });
    expect(Object.keys(main?.states ?? {})).toEqual([MEDIA, PULSOID, AFK]);
    expect(main?.format).toBe('{0} | ▶ {1} - {2} {3} | ♥ {4} bpm');
    expect(main?.variables[2]?.options['truncate_length']).toBe(30);
    expect(main?.variables[3]?.options['visual_resolution']).toBe(8);
    expect(main?.variables[3]?.options['visual_start']).toBe('[');
    expect(clip?.states.every((state) => state.enabled)).toBe(true);
    const paused = clip?.states.find(
      (state) =>
        state.states?.[MEDIA] === 'paused' &&
        state.states[AFK] === 'notafk' &&
        state.states[PULSOID] === 'connected',
    );
    expect(paused?.format).toBe('{0} | ⏸ {1} | ♥ {2} bpm');
    const stopped = clip?.states.find(
      (state) =>
        state.states?.[MEDIA] === 'stopped' &&
        state.states[AFK] === 'notafk' &&
        state.states[PULSOID] === 'connected',
    );
    expect(stopped?.format).toBe('{0} | ♥ {1} bpm');
    const afk = clip?.states.find(
      (state) =>
        state.states?.[AFK] === 'afk' &&
        state.states[MEDIA] === 'playing' &&
        state.states[PULSOID] === 'connected',
    );
    expect(afk?.format).toBe('💤 AFK for {0} | ▶ {1} - {2} {3} | ♥ {4} bpm');
    expect(afk?.variables[0]).toMatchObject({ module_id: AFK, variable_id: 'duration' });
    expect(files.map((file) => file.path)).toContain(`modules/${AFK}.json`);
    const chatbox = files.find((file) => file.path === 'chatbox.json');
    expect(chatbox?.content).toContain('"use_minimal_background": true');
  });

  it('creates one clip per cycled status and caps the timeline', () => {
    const statuses = ['a', 'b', 'c'].map((text, index) =>
      createStatusItem(text, { id: text, active: index === 0, useInCycle: true }),
    );
    const cycling = createDefaultProfile({
      statuses,
      statusCycle: { enabled: true, intervalSeconds: 15, random: false },
      segments: [createSegment('status', { id: 's' })],
    });
    const { files, diagnostics } = vrcoscCodec.serialize(cycling);
    const document = chatboxOf(files);
    expect((document['timeline'] as VObject)['length']).toBe(45);
    const clips = clipsOf(document);
    expect(clips.map((clip) => [clip.start, clip.end])).toEqual([
      [0, 15],
      [15, 30],
      [30, 45],
    ]);
    expect(clips.map((clip) => clip.states[0]?.variables[0]?.options['text'])).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(clips.every((clip) => clip.layer === 0 && clip.states[0]?.states === null)).toBe(true);
    expect(diagnostics.filter((d) => d.level === 'warning')).toEqual([]);

    const many = createDefaultProfile({
      statuses: Array.from({ length: 10 }, (_, index) =>
        createStatusItem(`s${index}`, { id: `s${index}`, active: index === 0, useInCycle: true }),
      ),
      statusCycle: { enabled: true, intervalSeconds: 60, random: false },
      segments: [createSegment('status', { id: 's' })],
    });
    const capped = vrcoscCodec.serialize(many);
    expect(clipsOf(chatboxOf(capped.files))).toHaveLength(4);
    expect((chatboxOf(capped.files)['timeline'] as VObject)['length']).toBe(240);
    expect(capped.diagnostics.some((d) => d.code === 'statuses-dropped')).toBe(true);
  });

  it('drops placeholders VRCOSC has no module for and tidies separators', () => {
    const profile = createDefaultProfile({
      segments: [
        createSegment('twitch', { id: 't', template: '{twitch_live} | {twitch_viewers} viewers' }),
        createSegment('hardware', {
          id: 'h',
          template: 'CPU {cpu_usage} | {lyrics} | GPU {gpu_temp}',
        }),
        createSegment('vrchat', { id: 'v', template: '🌎 {vrc_world}' }),
      ],
    });
    const { files, diagnostics } = vrcoscCodec.serialize(profile);
    const [clip] = clipsOf(chatboxOf(files));
    // The Twitch segment lost every placeholder and is dropped as a whole; {lyrics} is tidied away.
    expect(clip?.states[0]?.format).toBe('CPU {0} | GPU {1}');
    expect(clip?.linked_modules).toEqual([
      'volcanicarts.vrcosc.officialmodules.hardwarestatsmodule',
    ]);
    const unsupported = diagnostics
      .filter((d) => d.code === 'unsupported-feature')
      .map((d) => d.message);
    expect(unsupported.some((m) => m.includes('{twitch_live}'))).toBe(true);
    expect(unsupported.some((m) => m.includes('{twitch_viewers}'))).toBe(true);
    expect(unsupported.some((m) => m.includes('{lyrics}'))).toBe(true);
    // vrc_world exists only in a stateless community module, which VRCOSC can never display.
    expect(
      diagnostics.some((d) => d.code === 'stateless-module' && d.message.includes('{vrc_world}')),
    ).toBe(true);
  });

  it('uses community modules only where the official set has nothing', () => {
    const profile = createDefaultProfile({
      segments: [
        createSegment('network', { id: 'n', template: '↓ {net_down} ↑ {net_up}' }),
        createSegment('window', { id: 'w', template: '{window_title}' }),
      ],
    });
    const { files, diagnostics } = vrcoscCodec.serialize(profile);
    const [clip] = clipsOf(chatboxOf(files));
    expect(clip?.linked_modules).toEqual(['bluscream.vrcosc.modules.linuxhardwarestatsmodule']);
    expect(clip?.states[0]?.variables.map((v) => [v.module_id, v.variable_id])).toEqual([
      ['bluscream.vrcosc.modules.linuxhardwarestatsmodule', 'networkdownload'],
      ['bluscream.vrcosc.modules.linuxhardwarestatsmodule', 'networkupload'],
      [null, 'focusedwindow'],
    ]);
    expect(
      diagnostics.some((d) => d.code === 'community-module' && d.message.includes('Bluscream')),
    ).toBe(true);
  });

  it('writes module settings from segment options', () => {
    const profile = createDefaultProfile({
      segments: [
        createSegment('time', {
          id: 't',
          options: {
            kind: 'time',
            use24Hour: false,
            showSeconds: true,
            timezone: 'Europe/Berlin',
            showTimezone: false,
          },
        }),
        createSegment('weather', {
          id: 'w',
          template: '{weather_temp} {weather_condition}',
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
    const { files } = vrcoscCodec.serialize(profile);
    const [clip] = clipsOf(chatboxOf(files));
    const variables = clip?.states[0]?.variables ?? [];
    expect(variables[0]?.options['datetime_format']).toBe('hh:mm:ss tt');
    expect(variables[0]?.options['timezone_id']).toBe('Europe/Berlin');
    expect(variables[1]?.variable_id).toBe('tempf');
    const datetime = files.find((file) => file.path === `modules/${DATETIME}.json`);
    expect(JSON.parse(datetime?.content ?? '{}')).toEqual({
      version: 1,
      enabled: true,
      settings: { timezone: 'Europe/Berlin' },
      parameters: {},
    });
    const weather = files.find((file) => file.path.endsWith('weathermodule.json'));
    expect(JSON.parse(weather?.content ?? '{}')).toMatchObject({
      settings: { location: 'Berlin' },
    });
  });
});

describe('VRCOSC → VRCOSC round trip', () => {
  it('reproduces the two-clip fixture structurally, ticks included', () => {
    const original = parseVJson(twoClips()[0]?.content ?? '', 'chatbox.json');
    const { profile } = vrcoscCodec.parse(twoClips());
    const { files, diagnostics } = vrcoscCodec.serialize(profile);
    const written = files.find((file) => file.path === 'chatbox.json');
    expect(written?.content).toContain('638990490000000000');
    expect(vEqual(parseVJson(written?.content ?? '', 'chatbox.json'), original)).toBe(true);
    expect(diagnostics.map((d) => d.code)).toContain('merged');
  });

  it('rewrites only the edited state and keeps the original variable order', () => {
    const { profile } = vrcoscCodec.parse(twoClips());
    const edited = {
      ...profile,
      segments: profile.segments.map((segment) =>
        segment.kind === 'media'
          ? { ...segment, template: '🎶 {artist} - {title}\n{position}/{duration} {progress_bar}' }
          : segment,
      ),
    };
    const { files } = vrcoscCodec.serialize(edited);
    const clips = clipsOf(chatboxOf(files));
    const music = clips.find((clip) => clip.layer === 0);
    expect(music?.states[0]?.format).toBe('🎶 {2} - {3}\n{0}/{1} {4}');
    // Untouched options survive (artist truncation is not modelled but was kept).
    expect(music?.states[0]?.variables[2]?.options['truncate_length']).toBe(20);
    expect(music?.states[0]?.variables[4]?.options['visual_line']).toBe('━');
    expect(clips[0]?.states[0]?.variables.length).toBe(5);
    // The countdown clip is byte-for-byte the original.
    const original = clipsOf(parseVJson(twoClips()[0]?.content ?? '', 'x') as VObject);
    expect(vEqual(clips[1] as unknown as VObject, original[1] as unknown as VObject)).toBe(true);
  });

  it('moves the timer when the target date changes and regenerates when segments are new', () => {
    const { profile } = vrcoscCodec.parse(twoClips());
    const moved = {
      ...profile,
      segments: profile.segments.map((segment) =>
        segment.options.kind === 'custom'
          ? { ...segment, options: { ...segment.options, timerTarget: '2026-01-01T00:00:00.000Z' } }
          : segment,
      ),
    };
    const movedClips = clipsOf(chatboxOf(vrcoscCodec.serialize(moved).files));
    const timer = movedClips[1]?.states[0]?.variables.find((v) => v.variable_id === 'timer');
    expect(timer?.options['datetime']).toBe(639028224000000000n);
    expect(timer?.options['time_format']).toBe('hh\\:mm\\:ss');

    const grown = {
      ...profile,
      segments: [...profile.segments, createSegment('heartrate', { id: 'new' })],
    };
    const result = vrcoscCodec.serialize(grown);
    expect(result.diagnostics.map((d) => d.code)).toContain('structure-changed');
    expect(clipsOf(chatboxOf(result.files))).toHaveLength(1);
  });

  it('round-trips the compound fixture and disables states whose segments are off', () => {
    const files = compoundWithModules();
    const original = parseVJson(files[0]?.content ?? '', 'chatbox.json');
    const { profile } = vrcoscCodec.parse(files);
    const same = vrcoscCodec.serialize(profile);
    expect(vEqual(chatboxOf(same.files), original)).toBe(true);
    expect(same.files.map((file) => file.path)).toContain(`modules/${DATETIME}.json`);

    const off = {
      ...profile,
      segments: profile.segments.map((segment) =>
        segment.kind === 'status' ? { ...segment, enabled: false } : segment,
      ),
    };
    const clips = clipsOf(chatboxOf(vrcoscCodec.serialize(off).files));
    expect(clips[1]?.states[0]?.enabled).toBe(false);
  });
});

describe('catalog', () => {
  it('maps every canonical reference to an existing variable', () => {
    for (const [name, sources] of CANONICAL_SOURCES) {
      expect(isPlaceholderName(name)).toBe(true);
      for (const source of sources) {
        const module =
          source.moduleId === null ? undefined : MODULES.find((m) => m.fullId === source.moduleId);
        const variables = source.moduleId === null ? BUILT_IN_VARIABLES : (module?.variables ?? {});
        expect(variables[source.variableId]?.canonical).toBe(name);
      }
    }
    for (const module of MODULES) {
      expect(module.fullId.startsWith(`${module.packageId}.`)).toBe(true);
      for (const state of Object.values(module.states)) {
        for (const id of state.defaultVariables) {
          expect(module.variables[id]).toBeDefined();
        }
      }
      if (module.mainState !== undefined) {
        expect(module.states[module.mainState]).toBeDefined();
      }
    }
    expect(MODULES.filter((m) => m.official)).toHaveLength(12);
    expect(MODULES.filter((m) => !m.official).length).toBeGreaterThanOrEqual(12);
    expect(CANONICAL_SOURCES.get('heartrate')?.map((s) => s.moduleId)).toEqual([
      PULSOID,
      'volcanicarts.vrcosc.officialmodules.hyperatemodule',
      'art.djdavid98.bluetoothheartrate.bluetoothheartratemodule',
    ]);
    expect(
      Object.keys(PLACEHOLDERS).filter(
        (name) => isPlaceholderName(name) && CANONICAL_SOURCES.has(name),
      ).length,
    ).toBeGreaterThan(40);
  });
});
