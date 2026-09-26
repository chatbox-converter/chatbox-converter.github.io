import { describe, expect, it } from 'vitest';
import { createDefaultProfile, createStatusItem, type ChatboxProfile } from '../../model/profile';
import { createSegment } from '../../model/segments';
import { isJsonObject, type JsonObject } from '../../util/json';
import { ConfigParseError, type ConfigFile } from '../codec';
import aioFixture from './fixtures/aio-config.json';
import fullFixture from './fixtures/full-config.json';
import exportFixture from './fixtures/gaming.dcbprofile.json';
import legacyFixture from './fixtures/legacy-config.json';
import { EXPORT_FORMAT } from './export';
import { dreamchatboxCodec } from './index';

const files = (json: unknown, path = 'config.json'): ConfigFile[] => [
  { path, content: JSON.stringify(json) },
];

function fileOf(profile: ChatboxProfile, path: string): JsonObject {
  const result = dreamchatboxCodec.serialize(profile);
  const content = result.files.find((f) => f.path === path)?.content ?? '{}';
  const json: unknown = JSON.parse(content);
  if (!isJsonObject(json)) {
    throw new Error(`${path} is not an object`);
  }
  return json;
}

const configOf = (profile: ChatboxProfile): JsonObject => fileOf(profile, 'config.json');

/** The normalised config kept in `extras.dreamchatbox.config`. */
function extrasConfig(profile: ChatboxProfile): JsonObject {
  const extras = profile.extras.dreamchatbox;
  const config = isJsonObject(extras) ? extras['config'] : undefined;
  return isJsonObject(config) ? config : {};
}

/** The model fields that must survive a round trip (extras and ids aside). */
function modelView(profile: ChatboxProfile): Record<string, unknown> {
  return Object.fromEntries(Object.entries(profile).filter(([key]) => key !== 'extras'));
}

const codes = (diagnostics: readonly { code: string }[]): string[] =>
  diagnostics.map((d) => d.code);

describe('dreamchatboxCodec.detect', () => {
  it('recognises config.json and profile files', () => {
    expect(dreamchatboxCodec.detect(files(fullFixture))).toBe(1);
    expect(dreamchatboxCodec.detect(files(aioFixture, 'profiles/Gaming.json'))).toBe(1);
    expect(dreamchatboxCodec.detect(files({ app_order: ['status'] }))).toBe(1);
  });

  it('recognises a .dcbprofile.json export by its format field', () => {
    expect(dreamchatboxCodec.detect(files(exportFixture, 'Gaming.dcbprofile.json'))).toBe(1);
    const tiny = { format: EXPORT_FORMAT, version: 1, profile: { media_active: true } };
    expect(dreamchatboxCodec.detect(files(tiny, 'renamed.json'))).toBe(1);
    expect(dreamchatboxCodec.detect(files({ format: 'other', profile: {} }))).toBe(0);
  });

  it('rejects other JSON and non-JSON', () => {
    expect(dreamchatboxCodec.detect(files({ version: 1, segments: [] }))).toBe(0);
    expect(dreamchatboxCodec.detect([{ path: 'x.json', content: 'nope' }])).toBe(0);
    expect(dreamchatboxCodec.detect([{ path: 'x.txt', content: '{"app_order":[]}' }])).toBe(0);
  });

  it('throws ConfigParseError for unreadable input', () => {
    expect(() => dreamchatboxCodec.parse([])).toThrow(ConfigParseError);
    expect(() => dreamchatboxCodec.parse([{ path: 'config.json', content: '[1]' }])).toThrow(
      ConfigParseError,
    );
    expect(() =>
      dreamchatboxCodec.parse(files({ format: EXPORT_FORMAT, version: 1, profile: 'x' })),
    ).toThrow(ConfigParseError);
  });
});

describe('dreamchatboxCodec.parse (full config)', () => {
  const { profile, diagnostics } = dreamchatboxCodec.parse(files(fullFixture));

  it('imports statuses from every template with cycle settings', () => {
    expect(profile.statuses.map((s) => [s.text, s.group, s.active, s.useInCycle])).toEqual([
      ['Enjoy 💖', 'Template 1', true, true],
      ['Chilling ✨', 'Template 1', false, true],
      ['Ask me anything', 'Template 1', false, true],
      ['Streaming 🔴', 'Template 2', false, true],
      ['Hidden extra', 'Template 2', false, false],
    ]);
    expect(profile.statusCycle).toEqual({ enabled: true, intervalSeconds: 15, random: false });
    expect(codes(diagnostics)).toContain('style-markers-stripped');
  });

  it('imports AFK with the timer text appended and {afk_time} renamed', () => {
    expect(profile.afk).toEqual({
      enabled: true,
      timeoutSeconds: 120,
      template: '💤 AFK / Away 💤 for {afk_duration}',
      replaceEverything: true,
    });
    expect(codes(diagnostics)).toContain('default-applied');
  });

  it('follows app_order and converts the media custom template', () => {
    expect(profile.segments.map((s) => [s.kind, s.enabled])).toEqual([
      ['media', true],
      ['lyrics', true],
      ['status', true],
      ['hardware', true],
    ]);
    const media = profile.segments[0];
    expect(media?.template).toBe('{artist} : {title} | {position}/{duration}\n{progress_bar}');
    expect(media?.options).toMatchObject({
      kind: 'media',
      titleMaxLength: 30,
      pausedTemplate: '⏸',
      progressBar: { start: '[', filled: '█', empty: '░', position: '', end: ']', length: 13 },
    });
    expect(profile.segments[1]?.template).toBe('♪ {lyrics}');
  });

  it('generates the hardware layout from the checkboxes', () => {
    expect(profile.segments[3]?.template).toBe(
      '{gpu_name}: {gpu_usage} {gpu_temp} {gpu_power} | VRAM {vram_used}/{vram_total}\n' +
        'CPU: {cpu_usage} {cpu_temp}\n' +
        'RAM: {ram_used}/{ram_total} DDR5',
    );
  });

  it('renders the Custom Box into prefix/suffix and maps output/osc', () => {
    expect(profile.output).toEqual({
      separator: ' ┆ ',
      separateWithNewlines: true,
      prefix: '╔═══ {time} ═══╗\n',
      suffix: '\n╚═ OSC-DreamChatbox ═╝',
      minimalBackground: true,
      sendIntervalSeconds: 4,
    });
    expect(profile.osc).toEqual({ host: '192.168.1.20', port: 9010 });
    expect(profile.meta).toEqual({ name: 'Gaming', source: 'dreamchatbox', notes: [] });
  });

  it('keeps the whole normalised config (unknown keys included) in extras', () => {
    const extras = extrasConfig(profile);
    expect(extras['my_custom_key']).toBe(42);
    expect(extras['plugin_theme_extra']).toEqual({ accent: '#ff00aa' });
    expect(extras['status_texts']).toHaveLength(20);
    expect(extras['profile_save_on_exit']).toBe(true);
    expect(profile.extras.dreamchatbox).toMatchObject({
      profile: { plugins: {}, pluginSettings: {} },
    });
  });
});

describe('dreamchatboxCodec.parse (.dcbprofile.json export)', () => {
  const input = files(exportFixture, 'Gaming.dcbprofile.json');
  const { profile, diagnostics } = dreamchatboxCodec.parse(input);

  it('unwraps the envelope and takes the name from it', () => {
    expect(profile.meta).toEqual({ name: 'Gaming', source: 'dreamchatbox', notes: [] });
    expect(profile.statuses.map((s) => s.text)[0]).toBe('Enjoy 💖');
    expect(profile.segments.find((s) => s.kind === 'media')?.template).toBe(
      '{artist} : {title} ({album}) | {position}/{duration} -{remaining} {progress_percent}\n{progress_bar}',
    );
    // app-wide keys are not part of an export: defaults apply
    expect(profile.osc).toEqual({ host: '127.0.0.1', port: 9000 });
    expect(profile.output.sendIntervalSeconds).toBe(5);
  });

  it('keeps the plugin flags and settings in extras, out of the config', () => {
    const extras = extrasConfig(profile);
    expect(extras).not.toHaveProperty('plugin_life_stats');
    expect(extras['my_custom_key']).toBe(42);
    expect(profile.extras.dreamchatbox).toMatchObject({
      profile: {
        plugins: { life_stats: true, oscleash: false, world_stats: true },
        pluginSettings: { life_stats: exportFixture.plugins.life_stats },
      },
    });
    expect(codes(diagnostics)).toEqual(expect.arrayContaining(['profile-export', 'plugin-state']));
    expect(diagnostics.find((d) => d.code === 'plugin-state')?.message).toContain(
      'life_stats, world_stats',
    );
  });

  it('falls back to the file name and accepts a plain profile file', () => {
    const unnamed = { ...exportFixture, name: '' };
    const fromFile = dreamchatboxCodec.parse(files(unnamed, 'backups/Music.dcbprofile.json'));
    expect(fromFile.profile.meta.name).toBe('Music');
    const plain = dreamchatboxCodec.parse(
      files({ media_active: true, plugin_afk: true, plugin_x: 'no' }, 'profiles/Chill.json'),
    );
    expect(plain.profile.meta.name).toBe('Chill');
    expect(plain.profile.extras.dreamchatbox).toMatchObject({
      profile: { plugins: { afk: true } },
    });
    expect(extrasConfig(plain.profile)['plugin_x']).toBe('no');
    // a non-boolean plugin_ key is config (kept in config.json) but never part of a profile file
    expect(configOf(plain.profile)['plugin_x']).toBe('no');
    expect(fileOf(plain.profile, 'profiles/Chill.json')).not.toHaveProperty('plugin_x');
    expect(fileOf(plain.profile, 'profiles/Chill.json')['plugin_afk']).toBe(true);
  });

  it('prefers config.json over an export when both are uploaded', () => {
    const both = [...files(fullFixture), ...input];
    expect(dreamchatboxCodec.parse(both).profile.osc.port).toBe(9010);
    expect(dreamchatboxCodec.parse([...input, ...files(fullFixture)]).profile.osc.port).toBe(9010);
  });
});

describe('dreamchatboxCodec.parse (all-in-one config)', () => {
  const { profile, diagnostics } = dreamchatboxCodec.parse(files(aioFixture));

  it('turns each slot into a segment, only the first enabled', () => {
    expect(profile.segments.map((s) => [s.id, s.kind, s.enabled])).toEqual([
      ['aio-1', 'custom', true],
      ['aio-2', 'media', false],
    ]);
    expect(profile.segments[0]?.template).toBe(
      '{status}\n{vrc_player_count} {vrc_world}\n{time} {fps}',
    );
    expect(profile.segments[1]?.template).toBe(
      '{artist} : {title} | {position}/{duration}\n{progress_bar}',
    );
  });

  it('explains the rotation and the mode switch', () => {
    expect(codes(diagnostics)).toEqual(['aio-mode', 'aio-rotation']);
    expect(diagnostics[1]?.message).toContain('every 20 s');
  });

  it('reports advanced mode as unsupported', () => {
    const advanced = { ...aioFixture, aio_mode: 'advanced' };
    const result = dreamchatboxCodec.parse(files(advanced));
    expect(result.diagnostics.some((d) => d.code === 'unsupported-feature')).toBe(true);
    expect(result.profile.segments).toHaveLength(2);
  });
});

describe('dreamchatboxCodec.parse (legacy config)', () => {
  const { profile, diagnostics } = dreamchatboxCodec.parse(files(legacyFixture));
  const extras = extrasConfig(profile);

  it('applies defaults and legacy migrations', () => {
    expect(profile.statuses.map((s) => s.text)).toEqual(['Hello legacy']);
    expect(profile.afk.template).toBe('brb, grabbing water');
    expect(extras['afk_preset']).toBe(2);
    expect(extras['afk_text']).toBeUndefined();
    expect(extras['stt_send_mode']).toBe('line');
    expect(extras['chat_send_mode']).toBeUndefined();
    expect(extras['hw_fps']).toBeUndefined();
    expect(extras['box_width_top']).toBe(5);
    expect(extras['box_width_bottom']).toBe(5);
    expect(extras['status_cycle_sec']).toBe(10);
    expect(extras['status_templates']).toHaveLength(10);
    expect(extras['aio_sets']).toHaveLength(10);
  });

  it('fills defaults for everything missing', () => {
    expect(profile.output.prefix).toBe('┌─────┐\n');
    expect(profile.output.suffix).toBe('\n└─────┘');
    expect(profile.output.sendIntervalSeconds).toBe(2);
    expect(profile.osc).toEqual({ host: '127.0.0.1', port: 9000 });
    expect(profile.segments.map((s) => [s.kind, s.enabled])).toEqual([
      ['status', true],
      ['media', false],
      ['hardware', false],
    ]);
  });

  it('upgrades the old hardware template and strips {temp_icon}', () => {
    expect(profile.segments[2]?.template).toBe(
      '🎮 {gpu_name} {gpu_usage} | {gpu_temp}\n⚙️ {cpu_name} {cpu_usage} | {cpu_temp}\n' +
        'VRAM {vram_used}/{vram_total} RAM {ram_used}/{ram_total}',
    );
    expect(codes(diagnostics)).toContain('temp-icon-merged');
  });

  it('tolerates a null media_bar_custom in custom style', () => {
    const media = profile.segments[1];
    expect(media?.options).toMatchObject({
      progressBar: { start: '[', filled: '█', empty: '░', position: '', end: ']', length: 13 },
    });
  });
});

describe('dreamchatboxCodec.serialize', () => {
  it('serializes the default profile to a config that parses back equivalently', () => {
    const profile = createDefaultProfile({
      segments: [createSegment('status'), createSegment('time')],
    });
    const result = dreamchatboxCodec.serialize(profile);
    expect(result.files.map((f) => f.path)).toEqual([
      'My chatbox.dcbprofile.json',
      'config.json',
      'profiles/My chatbox.json',
    ]);
    expect(result.files.every((f) => f.content.endsWith('}\n'))).toBe(true);
    expect(codes(result.diagnostics)).toEqual(['time-in-box', 'profile-export']);
    expect(result.diagnostics[1]?.message).toContain('Options › General › Profiles › Import');
    const cfg = configOf(profile);
    expect(cfg['status_texts']).toHaveLength(20);
    expect((cfg['status_texts'] as string[])[0]).toBe('Enjoy 💖');
    expect(cfg['status_count']).toBe(1);
    expect(cfg['status_random']).toBe(false);
    expect(cfg['afk_texts']).toEqual(['💤 AFK', '💤 AFK \\n BRB – briefly away', '💤   AFK   💤']);
    expect(cfg['afk_timer']).toBe(true);
    expect(cfg['afk_detect']).toBe(false);
    expect(cfg['box_active']).toBe(true);
    expect(cfg['box_top_mode']).toBe('clock');
    expect(cfg['box_bottom_on']).toBe(false);
    expect(cfg['aio_active']).toBe(false);
    expect(cfg['interval_sec']).toBe(2);
    expect(cfg['slim_chatbox']).toBe(false);
    expect(cfg['profile_active']).toBe('My chatbox');

    const back = dreamchatboxCodec.parse(result.files).profile;
    expect(back.statuses.map((s) => [s.text, s.active])).toEqual([['Enjoy 💖', true]]);
    expect(back.afk).toEqual(profile.afk);
    expect(back.output.prefix).toBe('╔═══ {time} ═══╗\n');
    expect(back.output.suffix).toBe('');
    expect(back.output.minimalBackground).toBe(false);
    expect(back.osc).toEqual(profile.osc);
    expect(back.segments.find((s) => s.kind === 'status')?.enabled).toBe(true);
    expect(back.meta.name).toBe('My chatbox');
  });

  it('omits the 19 app-wide keys from the profile file and the export', () => {
    const profile = createDefaultProfile({
      meta: { name: 'Gaming / Music', source: null, notes: [] },
    });
    const result = dreamchatboxCodec.serialize(profile);
    expect(result.files[2]?.path).toBe('profiles/Gaming  Music.json');
    const body = fileOf(profile, 'profiles/Gaming  Music.json');
    const envelope = fileOf(profile, 'Gaming  Music.dcbprofile.json');
    expect(envelope['profile']).toEqual(body);
    for (const key of [
      'osc_ip',
      'osc_port',
      'interval_sec',
      'theme',
      'profile_active',
      'profile_save_on_exit',
      'profile_plugins_asked',
      'debug',
    ]) {
      expect(body).not.toHaveProperty(key);
    }
    expect(body).toHaveProperty('status_templates');
    expect(configOf(profile)).toHaveProperty('profile_save_on_exit', true);
  });

  it('writes the export envelope exactly as core/profiles.export_profile does', () => {
    const profile = createDefaultProfile({ meta: { name: '', source: null, notes: [] } });
    const result = dreamchatboxCodec.serialize(profile);
    expect(result.files[0]?.path).toBe('Default.dcbprofile.json');
    const envelope = fileOf(profile, 'Default.dcbprofile.json');
    expect(Object.keys(envelope)).toEqual(['format', 'version', 'name', 'profile', 'plugins']);
    expect(envelope).toMatchObject({ format: EXPORT_FORMAT, version: 1, name: 'Default' });
    expect(envelope['plugins']).toEqual({});
    expect(configOf(profile)['profile_active']).toBe('Default');
  });

  it('keeps mirrors and fixed array sizes consistent', () => {
    const statuses = Array.from({ length: 23 }, (_, i) =>
      createStatusItem(`Status ${i + 1}`, { id: `s${i}`, active: i === 0, useInCycle: true }),
    );
    const profile = createDefaultProfile({
      statuses: [...statuses, createStatusItem('Other', { id: 'o', group: 'Night' })],
      statusCycle: { enabled: true, intervalSeconds: 4, random: true },
    });
    const result = dreamchatboxCodec.serialize(profile);
    const cfg = configOf(profile);
    const templates = cfg['status_templates'] as JsonObject[];
    expect(templates).toHaveLength(10);
    expect(templates[0]?.['texts']).toEqual(cfg['status_texts']);
    expect(templates[0]?.['styles']).toEqual(cfg['status_styles']);
    expect(templates[0]?.['count']).toBe(cfg['status_count']);
    expect(cfg['status_count']).toBe(20);
    expect((templates[0]?.['texts'] as string[]).at(-1)).toBe('Status 20');
    expect(templates[1]?.['name']).toBe('Night');
    expect((templates[1]?.['texts'] as string[])[0]).toBe('Other');
    expect(cfg['status_cycle_sec']).toBe(10);
    expect(cfg['status_random']).toBe(true);
    expect(codes(result.diagnostics)).toEqual(
      expect.arrayContaining(['limit-exceeded', 'value-clamped']),
    );
    for (const key of ['aio_templates', 'aio_custom_time', 'aio_custom_sec', 'aio_heights']) {
      expect(cfg[key]).toHaveLength(10);
    }
    expect(cfg['aio_sets']).toHaveLength(10);
    expect(cfg['afk_texts']).toHaveLength(3);
  });

  it('switches to All-in-one mode for segments Dream has no app for', () => {
    const profile = createDefaultProfile({
      segments: [
        createSegment('status', { id: 's' }),
        createSegment('time', { id: 't' }),
        createSegment('vrchat', { id: 'v' }),
        createSegment('heartrate', { id: 'h' }),
        createSegment('twitch', { id: 'tw' }),
        createSegment('custom', { id: 'c', enabled: false, template: 'later {vrc_world}' }),
      ],
    });
    const result = dreamchatboxCodec.serialize(profile);
    const cfg = configOf(profile);
    expect(cfg['aio_active']).toBe(true);
    expect(cfg['aio_mode']).toBe('normal');
    const line = (cfg['aio_templates'] as string[])[0];
    expect(line).toBe(
      '{text} \\n {realtime} \\n {vrc_master}🌎 {group_world} | 👥 {player_in_world}/{vrc_instance_capacity} \\n ♥ {heartrate} bpm \\n {twitch_live} | playing {s_status} | {s_viewer} viewers',
    );
    expect((cfg['aio_templates'] as string[])[1]).toBe('later {group_world}');
    expect(cfg['aio_count']).toBe(1);
    expect(codes(result.diagnostics).filter((c) => c === 'aio-spare-slots')).toHaveLength(1);
    const set = (cfg['aio_sets'] as JsonObject[])[0];
    expect(set?.['templates']).toEqual(cfg['aio_templates']);
    expect(cfg['box_active']).toBe(false);
    const messages = result.diagnostics.map((d) => d.message);
    expect(messages.filter((m) => m.includes('was dropped'))).toEqual([]);
    expect(messages).toContain(
      'The generated template requires the Life Stats plugin (life_stats).',
    );
    expect(messages).toContain(
      'The generated template requires the World Stats plugin (world_stats).',
    );
    expect(messages).toContain(
      'The generated template requires the Stream Stats plugin (stream_stats).',
    );
  });

  it('drops segments whose placeholders no plugin provides', () => {
    const profile = createDefaultProfile({
      segments: [
        createSegment('status', { id: 's' }),
        createSegment('custom', { id: 'c', template: '{voicemod_voice} {soundpad_sound}' }),
      ],
    });
    const result = dreamchatboxCodec.serialize(profile);
    expect(result.diagnostics.map((d) => d.message)).toContain(
      'The custom segment has no equivalent in this format and was dropped.',
    );
    expect((configOf(profile)['aio_templates'] as string[])[0]).toBe('{text}');
  });

  it('writes media, lyrics and hardware apps in normal mode', () => {
    const profile = createDefaultProfile({
      output: {
        separator: ' | ',
        separateWithNewlines: true,
        prefix: '',
        suffix: '\n╰─ bye ─╯',
        minimalBackground: true,
        sendIntervalSeconds: 3.4,
      },
      segments: [
        createSegment('hardware', {
          id: 'h',
          template: 'CPU {cpu_usage} ¦ RAM {ram_used}/{ram_total}',
        }),
        createSegment('media', {
          id: 'm',
          template: '{play_icon} {artist} - {title}\n{progress_bar} {position}/{duration}',
          options: {
            kind: 'media',
            pausedTemplate: '',
            stoppedTemplate: '',
            titleMaxLength: 40,
            progressBar: { length: 8, filled: '▓', empty: '░', position: '', start: '', end: '' },
            transient: false,
            transientSeconds: 25,
          },
        }),
        createSegment('lyrics', { id: 'l', template: '🎤 {lyrics}' }),
        createSegment('status', { id: 's', enabled: false }),
      ],
    });
    const cfg = configOf(profile);
    expect(cfg['aio_active']).toBe(false);
    expect(cfg['app_order']).toEqual(['hardware', 'media', 'status']);
    expect(cfg['hw_active']).toBe(true);
    expect(cfg['hw_custom']).toBe(true);
    expect(cfg['hw_custom_template']).toBe('CPU {cpu_usage} ¦ RAM {ram_usage}');
    expect(cfg['media_active']).toBe(true);
    expect(cfg['media_custom']).toBe(true);
    expect(cfg['media_custom_template']).toBe('{md_status} {artist} - {title} \\n {bar} {time}');
    expect(cfg['media_title_max']).toBe(40);
    expect(cfg['media_idle']).toBe(false);
    expect(cfg['media_bar_style']).toBe(5);
    expect(cfg['media_bar_size']).toBe(62);
    expect(cfg['media_show_lyrics']).toBe(true);
    expect(cfg['media_lyrics_prefix']).toBe('🎤');
    expect(cfg['status_active']).toBe(false);
    expect(cfg['box_active']).toBe(true);
    expect(cfg['box_template']).toBe(3);
    expect(cfg['box_top_on']).toBe(false);
    expect(cfg['box_bottom_on']).toBe(true);
    expect(cfg['box_bottom_mode']).toBe('custom');
    expect(cfg['box_bottom_custom']).toBe('bye');
    expect(cfg['box_width_bottom']).toBe(2);
    expect(cfg['interval_sec']).toBe(3);
    expect(cfg['slim_chatbox']).toBe(true);
  });

  it('uses a custom songbar when no preset matches', () => {
    const profile = createDefaultProfile({
      segments: [
        createSegment('media', {
          id: 'm',
          options: {
            kind: 'media',
            pausedTemplate: '⏸',
            stoppedTemplate: '',
            titleMaxLength: 0,
            progressBar: {
              length: 13,
              filled: '=',
              empty: '-',
              position: 'o',
              start: '<',
              end: '>',
            },
            transient: false,
            transientSeconds: 25,
          },
        }),
      ],
    });
    const cfg = configOf(profile);
    expect(cfg['media_bar_style']).toBe(6);
    expect(cfg['media_bar_custom']).toEqual({
      prefix: '<',
      filled: '=',
      empty: '-',
      knob: 'o',
      suffix: '>',
    });
    expect(cfg['media_title_max']).toBe(64);
    expect(cfg['media_idle_text']).toBe('⏸');
    const back = dreamchatboxCodec.parse(dreamchatboxCodec.serialize(profile).files).profile;
    expect(back.segments.find((s) => s.kind === 'media')?.options).toMatchObject({
      progressBar: { length: 13, filled: '=', empty: '-', position: 'o', start: '<', end: '>' },
    });
  });
});

describe('dreamchatboxCodec serialize with disabled segments', () => {
  it('never reports or forces AIO for disabled segments', () => {
    const profile = createDefaultProfile({
      segments: createDefaultProfile().segments.map((s) =>
        s.kind === 'status' ? s : { ...s, enabled: false },
      ),
    });
    expect(profile.segments.length).toBeGreaterThan(10);
    const result = dreamchatboxCodec.serialize(profile);
    const cfg = configOf(profile);
    expect(cfg['aio_active']).toBe(false);
    expect(cfg['status_active']).toBe(true);
    expect(cfg['media_active']).toBe(false);
    expect(cfg['hw_active']).toBe(false);
    expect(codes(result.diagnostics)).toEqual(['profile-export']);
  });
});

describe('dreamchatboxCodec round trips', () => {
  it.each([
    ['full', fullFixture],
    ['aio', aioFixture],
    ['legacy', legacyFixture],
    ['export', exportFixture],
  ])('fixture → profile → config → profile keeps the model fields (%s)', (_name, fixture) => {
    const first = dreamchatboxCodec.parse(files(fixture)).profile;
    const serialized = dreamchatboxCodec.serialize(first);
    const second = dreamchatboxCodec.parse(serialized.files).profile;
    // a nameless config comes back as the "Default" profile of v1.5.7+
    const name = first.meta.name === '' ? 'Default' : first.meta.name;
    expect(modelView(second)).toEqual({ ...modelView(first), meta: { ...first.meta, name } });
  });

  it('round-trips the export alone and keeps its envelope', () => {
    const first = dreamchatboxCodec.parse(files(exportFixture, 'Gaming.dcbprofile.json')).profile;
    const serialized = dreamchatboxCodec.serialize(first);
    const exported = serialized.files.find((f) => f.path === 'Gaming.dcbprofile.json');
    expect(exported).toBeDefined();
    const envelope: unknown = JSON.parse(exported?.content ?? '{}');
    if (!isJsonObject(envelope) || !isJsonObject(envelope['profile'])) {
      throw new Error('no envelope');
    }
    expect(envelope['format']).toBe(EXPORT_FORMAT);
    expect(envelope['version']).toBe(1);
    expect(envelope['name']).toBe('Gaming');
    expect(envelope['plugins']).toEqual(exportFixture.plugins);
    const keys = Object.keys(envelope['profile']);
    expect(keys.slice(-3)).toEqual(['plugin_life_stats', 'plugin_oscleash', 'plugin_world_stats']);
    expect(envelope['profile']).toMatchObject({ plugin_oscleash: false, my_custom_key: 42 });
    expect(envelope['profile']).not.toHaveProperty('osc_port');
    // the same body is the profile file; config.json never carries the flags
    expect(JSON.parse(serialized.files[2]?.content ?? '{}')).toEqual(envelope['profile']);
    expect(configOf(first)).not.toHaveProperty('plugin_life_stats');
    const second = dreamchatboxCodec.parse([exported ?? { path: '', content: '{}' }]).profile;
    expect(modelView(second)).toEqual(modelView(first));
    const meta = (p: ChatboxProfile): unknown =>
      isJsonObject(p.extras.dreamchatbox) ? p.extras.dreamchatbox['profile'] : undefined;
    expect(meta(second)).toEqual(meta(first));
  });

  it('keeps unknown keys, styles and untouched settings through the round trip', () => {
    const first = dreamchatboxCodec.parse(files(fullFixture)).profile;
    const cfg = configOf(first);
    expect(cfg['my_custom_key']).toBe(42);
    expect(cfg['plugin_theme_extra']).toEqual({ accent: '#ff00aa' });
    expect(cfg['stt_language']).toBe('de-DE');
    expect(cfg['theme_opacity']).toBe(0.82);
    expect((cfg['status_styles'] as string[])[2]).toBe('super');
    expect(cfg['afk_timer']).toBe(true);
    expect(cfg['afk_texts']).toEqual(fullFixture.afk_texts);
    expect(cfg['box_top_mode']).toBe('clock');
    expect(cfg['box_width_top']).toBe(6);
    expect(cfg['box_bottom_custom']).toBe('OSC-DreamChatbox');
    expect(cfg['app_order']).toEqual(['media', 'status', 'hardware']);
    expect(cfg['media_custom_template']).toBe('{artist} : {title} | {time} \\n {bar}');
    expect(cfg['hw_ram_type']).toBe('DDR5');
  });

  it('keeps All-in-one mode and its second slot', () => {
    const first = dreamchatboxCodec.parse(files(aioFixture)).profile;
    const cfg = configOf(first);
    expect(cfg['aio_active']).toBe(true);
    expect(cfg['aio_count']).toBe(2);
    expect(cfg['aio_templates']).toEqual(aioFixture.aio_templates);
    expect((cfg['aio_sets'] as JsonObject[])[0]?.['templates']).toEqual(aioFixture.aio_templates);
  });
});
