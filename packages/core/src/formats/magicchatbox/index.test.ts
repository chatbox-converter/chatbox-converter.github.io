import { describe, expect, it } from 'vitest';
import { createDefaultProfile, createStatusItem, type ChatboxProfile } from '../../model/profile';
import { createSegment, type Segment } from '../../model/segments';
import { isJsonObject, type JsonObject } from '../../util/json';
import type { ConfigFile } from '../codec';
import afkFixture from './fixtures/AfkModuleSettings.json';
import appFixture from './fixtures/AppSettings.json';
import chatFixture from './fixtures/ChatSettings.json';
import componentStatsFixture from './fixtures/ComponentStatsSettings.json';
import componentItemsFixture from './fixtures/ComponentStatsV1.json';
import integrationEmptyFixture from './fixtures/IntegrationSettings.empty.json';
import integrationFixture from './fixtures/IntegrationSettings.json';
import mediaLinkFixture from './fixtures/MediaLinkSettings.json';
import oscFixture from './fixtures/OscSettings.json';
import pulsoidFixture from './fixtures/PulsoidModuleSettings.json';
import spotifyFixture from './fixtures/SpotifySettings.json';
import statusListFixture from './fixtures/StatusList.json';
import statusListV1Fixture from './fixtures/StatusList.v1.json';
import timeFixture from './fixtures/TimeSettings.json';
import weatherFixture from './fixtures/WeatherSettings.json';
import { magicchatboxCodec, MAGICCHATBOX_SORT_KEYS } from './index';

const FIXTURES: Readonly<Record<string, unknown>> = {
  'AfkModuleSettings.json': afkFixture,
  'AppSettings.json': appFixture,
  'ChatSettings.json': chatFixture,
  'ComponentStatsSettings.json': componentStatsFixture,
  'ComponentStatsV1.json': componentItemsFixture,
  'IntegrationSettings.json': integrationFixture,
  'MediaLinkSettings.json': mediaLinkFixture,
  'OscSettings.json': oscFixture,
  'PulsoidModuleSettings.json': pulsoidFixture,
  'SpotifySettings.json': spotifyFixture,
  'StatusList.json': statusListFixture,
  'TimeSettings.json': timeFixture,
  'WeatherSettings.json': weatherFixture,
};

function asFile(path: string, json: unknown): ConfigFile {
  return { path, content: JSON.stringify(json, null, 2) };
}

/** The realistic set as MagicChatbox keeps it, uploaded from its folder. */
function fixtureSet(): ConfigFile[] {
  return Object.entries(FIXTURES).map(([name, json]) =>
    asFile(`Vrcosc-MagicChatbox/${name}`, json),
  );
}

function fileJson(files: readonly ConfigFile[], name: string): JsonObject {
  const file = files.find((candidate) => candidate.path === name);
  expect(file, `${name} was not written`).toBeDefined();
  const json: unknown = JSON.parse(file?.content ?? '{}');
  if (!isJsonObject(json)) {
    throw new Error(`${name} is not an object`);
  }
  return json;
}

function segmentById(profile: ChatboxProfile, sortKey: string): Segment {
  const segment = profile.segments.find((candidate) => candidate.id === `mcb-${sortKey}`);
  if (segment === undefined) {
    throw new Error(`No segment for ${sortKey}`);
  }
  return segment;
}

describe('magicchatboxCodec.detect', () => {
  it('recognises known file names, case-insensitively and in folders', () => {
    expect(magicchatboxCodec.detect(fixtureSet())).toBe(1);
    expect(magicchatboxCodec.detect([{ path: 'x/appsettings.JSON', content: '{}' }])).toBe(1);
  });

  it('recognises a versioned settings object under an unknown name', () => {
    const content = '{"_schemaVersion":1,"_appVersion":"0.9.226.0","Foo":1}';
    expect(magicchatboxCodec.detect([{ path: 'whatever.json', content }])).toBe(1);
  });

  it('rejects unrelated files', () => {
    expect(magicchatboxCodec.detect([{ path: 'config.json', content: '{"a":1}' }])).toBe(0);
    expect(magicchatboxCodec.detect([{ path: 'broken.json', content: 'not json' }])).toBe(0);
    expect(magicchatboxCodec.detect([])).toBe(0);
  });
});

describe('magicchatboxCodec.parse', () => {
  const { profile, diagnostics } = magicchatboxCodec.parse(fixtureSet());

  it('follows SavedSortOrder, drops unknown keys and appends missing ones', () => {
    const order = profile.segments.map((segment) => segment.id.replace('mcb-', ''));
    expect(order.slice(0, 8)).toEqual([
      'Time',
      'Status',
      'MediaLink',
      'Spotify',
      'HeartRate',
      'Component',
      'Window',
      'Weather',
    ]);
    expect(order).toHaveLength(MAGICCHATBOX_SORT_KEYS.length);
    expect(order).not.toContain('Bogus');
    expect(order.slice(8)).toEqual([
      'Twitch',
      'TikTokLive',
      'Discord',
      'VrcRadar',
      'VrPerformance',
      'TrackerBattery',
      'Network',
      'Soundpad',
      'Voicemod',
      'Lyrics',
    ]);
  });

  it('maps master toggles and VR/desktop gates', () => {
    expect(segmentById(profile, 'Spotify')).toMatchObject({
      kind: 'media',
      enabled: true,
      visibility: { vr: true, desktop: false },
    });
    expect(segmentById(profile, 'Window')).toMatchObject({
      kind: 'window',
      enabled: true,
      visibility: { vr: false, desktop: true },
    });
    expect(segmentById(profile, 'Twitch').enabled).toBe(false);
    expect(segmentById(profile, 'TrackerBattery').visibility).toEqual({ vr: true, desktop: false });
    expect(segmentById(profile, 'Weather').enabled).toBe(true);
  });

  it('reconstructs the time segment', () => {
    expect(segmentById(profile, 'Time')).toMatchObject({
      kind: 'time',
      enabled: true,
      visibility: { vr: true, desktop: true },
      template: 'ᴹʸ ᵗⁱᵐᵉ {time} {timezone}',
      options: { kind: 'time', use24Hour: true, timezone: 'Europe/Berlin', showTimezone: true },
    });
  });

  it('reconstructs status, MediaLink and Spotify segments', () => {
    expect(segmentById(profile, 'Status').template).toBe('✨ {status}');
    expect(segmentById(profile, 'MediaLink')).toMatchObject({
      template: '{play_icon} {title} ᵇʸ {artist}\n{progress_bar}',
      options: { kind: 'media', pausedTemplate: '⏸', transient: true, transientSeconds: 40 },
    });
    expect(segmentById(profile, 'Spotify')).toMatchObject({
      template: '{play_icon} {artist} - {title} ({album})\n{progress_bar} {progress_percent}',
      options: {
        kind: 'media',
        pausedTemplate: 'Spotify paused',
        progressBar: { length: 12, filled: '━', position: '●', empty: '─' },
      },
    });
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: 'token-dropped', path: 'SpotifySettings.json' }),
    );
  });

  it('reconstructs heart rate, hardware, window and weather segments', () => {
    expect(segmentById(profile, 'HeartRate')).toMatchObject({
      template: 'Pulse: ❤️ {heartrate} ᵇᵖᵐ {heartrate_avg} ᵃᵛᵍ {heartrate_trend}',
      options: { kind: 'heartrate', provider: 'pulsoid', smoothing: true },
    });
    expect(segmentById(profile, 'Component')).toMatchObject({
      template:
        'ᶜᵖᵘ {cpu_usage} | ᵍᵖᵘ {gpu_usage} {gpu_temp} {gpu_power} | ʳᵃᵐ {ram_used}/{ram_total}',
      options: { kind: 'hardware', temperatureUnit: 'F', separator: ' | ' },
    });
    expect(segmentById(profile, 'Window')).toMatchObject({
      template: '{device_mode} ⁱⁿ {window_title}',
      options: { kind: 'window', maxTitleLength: 35, privateAppLabel: '🔒 App' },
    });
    expect(segmentById(profile, 'Weather')).toMatchObject({
      template: '{weather_emoji} {weather_temp} feels {weather_feels_like} · {weather_condition}',
      options: {
        kind: 'weather',
        temperatureUnit: 'C',
        locationMode: 'coordinates',
        city: '',
        latitude: 52.52,
        longitude: 13.405,
        updateIntervalMinutes: 15,
      },
    });
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: 'encrypted-value', path: 'WeatherSettings.json' }),
    );
  });

  it('uses built-in layouts for integrations without a settings file', () => {
    expect(segmentById(profile, 'Network').template).toBe(
      'ᴰᵒʷⁿ {net_down} | ᴺᵉᵗʷᵒʳᵏ ᵁᵗⁱˡⁱᶻᵃᵗⁱᵒⁿ {net_utilization}',
    );
    expect(segmentById(profile, 'Twitch').template).toBe(
      '{twitch_live} | ᵖˡᵃʸⁱⁿᵍ {twitch_game} | {twitch_viewers} ᵛⁱᵉʷᵉʳˢ',
    );
    expect(segmentById(profile, 'Discord').template).toBe(
      '🔊 {discord_channel} ({discord_count}) | 🎙️ {discord_speaking}',
    );
    expect(segmentById(profile, 'VrcRadar').template).toBe(
      '{vrc_master}🌎 {vrc_world} | 👥 {vrc_player_count} | {vrc_instance_type} {vrc_region}',
    );
    expect(segmentById(profile, 'VrPerformance').template).toBe(
      '{vr_fps} ᶠᵖˢ ¦ {vr_reprojection} ʳᵉᵖʳᵒʲ',
    );
    expect(segmentById(profile, 'Lyrics').template).toBe('♪ {lyrics}');
  });

  it('parses statuses with groups and the cycle settings', () => {
    expect(profile.statuses).toEqual([
      expect.objectContaining({
        id: 'msgid-48213377',
        text: 'Enjoy 💖',
        active: true,
        useInCycle: true,
        favorite: true,
        group: '',
      }),
      expect.objectContaining({
        id: 'msgid-91237',
        text: 'Below you can create your own status',
        active: false,
        group: '',
      }),
      expect.objectContaining({
        id: 'msgid-7734511',
        text: 'gaming with friends 🎮',
        group: 'Gaming',
      }),
    ]);
    expect(profile.statusCycle).toEqual({ enabled: true, intervalSeconds: 12, random: true });
  });

  it('parses AFK, output and OSC settings', () => {
    expect(profile.afk).toEqual({
      enabled: true,
      timeoutSeconds: 300,
      template: '🌙 away for {afk_duration}',
      replaceEverything: false,
    });
    expect(profile.output).toEqual({
      separator: ' ┆ ',
      separateWithNewlines: false,
      prefix: '',
      suffix: '\n~',
      minimalBackground: true,
      sendIntervalSeconds: 1.5,
    });
    expect(profile.osc).toEqual({ host: '192.168.1.20', port: 9010 });
    expect(profile.meta.source).toBe('magicchatbox');
  });

  it('uses the active custom AFK style when one is selected', () => {
    const afk = { ...afkFixture, ActiveStyleId: '1c2d3e4f-0000-4000-8000-000000000001' };
    const parsed = magicchatboxCodec.parse([asFile('AfkModuleSettings.json', afk)]);
    expect(parsed.profile.afk.template).toBe('☕ coffee run, back in {afk_duration}');
  });

  it('keeps every uploaded file in extras for the round trip', () => {
    const extras = profile.extras.magicchatbox as { files: Record<string, unknown> };
    expect(Object.keys(extras.files)).toContain('ChatSettings.json');
    expect(Object.keys(extras.files)).toContain('ComponentStatsV1.json');
  });

  it('reads a v1 bare-array StatusList', () => {
    const parsed = magicchatboxCodec.parse([asFile('StatusList.json', statusListV1Fixture)]);
    expect(parsed.profile.statuses).toEqual([
      expect.objectContaining({
        id: 'msgid-1234',
        text: 'old status one',
        active: false,
        group: '',
      }),
      expect.objectContaining({
        id: 'msgid-5678',
        text: 'old status two',
        active: true,
        favorite: true,
        useInCycle: true,
      }),
    ]);
  });

  it('falls back to the documented defaults when files are missing', () => {
    const empty = magicchatboxCodec.parse([
      asFile('IntegrationSettings.json', integrationEmptyFixture),
    ]);
    expect(empty.profile.segments.map((segment) => segment.id.replace('mcb-', ''))).toEqual([
      ...MAGICCHATBOX_SORT_KEYS,
    ]);
    const enabled = empty.profile.segments
      .filter((segment) => segment.enabled)
      .map((segment) => segment.id);
    expect(enabled).toEqual(['mcb-Status', 'mcb-Weather', 'mcb-Time', 'mcb-MediaLink']);
    expect(empty.profile.statuses.map((status) => status.text)).toEqual([
      'Enjoy 💖',
      'Below you can create your own status',
      'Activate it by clicking the power icon',
    ]);
    expect(empty.profile.statuses[0]?.active).toBe(true);
    expect(empty.profile.output).toMatchObject({
      separator: ' ┆ ',
      separateWithNewlines: true,
      sendIntervalSeconds: 1,
    });
    expect(empty.profile.osc).toEqual({ host: '127.0.0.1', port: 9000 });
    expect(empty.profile.afk.template).toBe('💤 ᶜᵘʳʳᵉⁿᵗˡʸ AFK ᶠᵒʳ {afk_duration}');
    expect(segmentById(empty.profile, 'Time')).toMatchObject({
      template: '{time}',
      options: { use24Hour: false, timezone: 'UTC', showTimezone: false },
    });
    expect(segmentById(empty.profile, 'MediaLink').template).toBe(
      '{play_icon} {title} ᵇʸ {artist} {position}/{duration}',
    );
    expect(segmentById(empty.profile, 'Component').template).toBe(
      'ᶜᵖᵘ {cpu_usage} ¦ ᵍᵖᵘ {gpu_usage} {gpu_power} ¦ ʳᵃᵐ {ram_used}/{ram_total} ¦ ᵛʳᵃᵐ {vram_used}/{vram_total}',
    );
    expect(empty.diagnostics).toContainEqual(expect.objectContaining({ code: 'defaults-used' }));
  });
});

describe('magicchatboxCodec.serialize', () => {
  const EXPECTED_FILES = [
    'AppSettings.json',
    'OscSettings.json',
    'IntegrationSettings.json',
    'StatusList.json',
    'AfkModuleSettings.json',
    'TimeSettings.json',
    'MediaLinkSettings.json',
    'SpotifySettings.json',
    'ComponentStatsSettings.json',
    'ComponentStatsV1.json',
    'PulsoidModuleSettings.json',
    'WeatherSettings.json',
    'NetworkStatsSettings.json',
    'WindowActivitySettings.json',
    'VrcLogSettings.json',
    'TrackerBatterySettings.json',
    'VrPerformanceSettings.json',
    'TwitchSettings.json',
    'TikTokLiveSettings.json',
    'DiscordSettings.json',
    'LyricsSettings.json',
  ];

  it('writes the complete file set for the default profile', () => {
    const { files, diagnostics } = magicchatboxCodec.serialize(createDefaultProfile());
    const names = files.map((file) => file.path);
    for (const expected of EXPECTED_FILES) {
      expect(names).toContain(expected);
    }
    expect(names).toHaveLength(EXPECTED_FILES.length);
    expect(magicchatboxCodec.expectedFiles).toEqual(expect.arrayContaining(EXPECTED_FILES));

    const intgr = fileJson(files, 'IntegrationSettings.json');
    expect(intgr).toMatchObject({
      _schemaVersion: 1,
      _appVersion: '0.9.226.0',
      _migratedAt: null,
      IntgrStatus: true,
      IntgrScanWindowTime: true,
      IntgrScanMediaLink: false,
      IntgrSpotify: false,
      IntgrHeartRate: false,
      IntgrStatus_VR: true,
      IntgrStatus_DESKTOP: true,
      IntgrCurrentTime_VR: true,
      IntgrCurrentTime_DESKTOP: true,
    });
    expect(intgr['SavedSortOrder']).toEqual([
      'Status',
      'Time',
      'Window',
      'Twitch',
      'TikTokLive',
      'Discord',
      'Spotify',
      'VrcRadar',
      'HeartRate',
      'Component',
      'VrPerformance',
      'TrackerBattery',
      'Network',
      'Weather',
      'Soundpad',
      'Voicemod',
      'MediaLink',
      'Lyrics',
    ]);
    expect(Object.keys(intgr).slice(0, 3)).toEqual([
      '_schemaVersion',
      '_appVersion',
      '_migratedAt',
    ]);
    expect(fileJson(files, 'WeatherSettings.json')['ShowWeatherInTime']).toBe(false);
    expect(fileJson(files, 'ComponentStatsSettings.json')['_schemaVersion']).toBe(2);
    expect(fileJson(files, 'TikTokLiveSettings.json')['_schemaVersion']).toBe(3);
    expect(fileJson(files, 'AfkModuleSettings.json')).not.toHaveProperty('_schemaVersion');
    expect(fileJson(files, 'TimeSettings.json')).toMatchObject({
      Time24H: true,
      SelectedTimeZone: 0,
      PrefixTime: false,
    });
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'timezone-unmapped' }));
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'install-instructions' }));

    const items: unknown = JSON.parse(
      files.find((file) => file.path === 'ComponentStatsV1.json')?.content ?? '',
    );
    expect(Array.isArray(items) && items.length).toBe(4);
    expect(files.find((file) => file.path === 'ComponentStatsV1.json')?.content).not.toContain(
      '\n',
    );
    expect(files.find((file) => file.path === 'AppSettings.json')?.content).toContain(
      '\n  "ScanningInterval": 1.5',
    );
  });

  it('keeps the StatusList invariants', () => {
    const profile = createDefaultProfile({
      statuses: [
        createStatusItem('one', { id: 'a', group: 'Fun' }),
        createStatusItem('two', { id: 'b', active: true }),
        createStatusItem('three', { id: 'c', active: true, group: 'Fun' }),
        createStatusItem('one', { id: 'd' }),
      ],
    });
    const list = fileJson(magicchatboxCodec.serialize(profile).files, 'StatusList.json');
    const groups = list['Groups'] as JsonObject[];
    const items = list['Items'] as JsonObject[];
    expect(list['Version']).toBe(2);
    expect(groups.map((group) => group['Name'])).toEqual(['Default', 'Fun']);
    expect(groups[0]?.['CreationDate']).toBe('0001-01-01T00:00:00');
    for (const group of groups) {
      expect(group['GroupId']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u,
      );
    }
    expect(items.filter((item) => item['IsActive'] === true).map((item) => item['msg'])).toEqual([
      'two',
    ]);
    const ids = items.map((item) => item['MSGID'] as number);
    expect(new Set(ids).size).toBe(4);
    for (const id of ids) {
      expect(Number.isInteger(id) && id >= 10 && id < 99_999_999).toBe(true);
    }
    expect(items[0]?.['GroupId']).toBe(groups[1]?.['GroupId']);
    expect(items[1]).toMatchObject({
      editMsg: '',
      IsEditing: false,
      IsSelected: false,
      LastEdited: '0001-01-01T00:00:00',
      LastUsed: '0001-01-01T00:00:00',
    });
    expect(Object.keys(items[0] ?? {})).toEqual([
      'GroupId',
      'IsSelected',
      'UseInCycle',
      'CreationDate',
      'editMsg',
      'IsActive',
      'IsEditing',
      'IsFavorite',
      'LastEdited',
      'LastUsed',
      'msg',
      'MSGID',
    ]);
  });

  it('round-trips the fixture set, preserving untouched keys and reproducing the mapping', () => {
    const first = magicchatboxCodec.parse(fixtureSet());
    const { files, diagnostics } = magicchatboxCodec.serialize(first.profile);
    const second = magicchatboxCodec.parse(files);

    const chat = fileJson(files, 'ChatSettings.json');
    expect(chat).toMatchObject({ ChatAddSmallDelayTIME: 2.5, HideOpenAITools: true });
    expect(fileJson(files, 'SpotifySettings.json')).toMatchObject({
      AccessTokenEncrypted: 'AQAAANCMnd8BFdERjHoAwE/Cl+sBAAAAopaque==',
      ClientId: 'abc123',
      MediaLinkCoexistence: 2,
      OutputTemplate: '{play_icon} {artist} - {title} ({album})\\n{seekbar} {percent}',
      ShowAlbum: true,
      ProgressDisplayMode: 3,
      ProgressBarLength: 12,
    });
    expect(fileJson(files, 'IntegrationSettings.json')).toMatchObject({
      _migratedAt: '2025-05-01T12:00:00Z',
      IntgrSpotify: true,
      IntgrSpotify_DESKTOP: false,
      IntgrScanWindowActivity: true,
      IntgrTwitch: false,
      IntgrHeartRate: true,
      IntgrComponentStats_DESKTOP: true,
      HiddenTiles: ['TikTokLive'],
      SavedSortOrder: [
        'Time',
        'Status',
        'MediaLink',
        'Spotify',
        'HeartRate',
        'Component',
        'Window',
        'Weather',
        'Twitch',
        'TikTokLive',
        'Discord',
        'VrcRadar',
        'VrPerformance',
        'TrackerBattery',
        'Network',
        'Soundpad',
        'Voicemod',
        'Lyrics',
      ],
    });
    const app = fileJson(files, 'AppSettings.json');
    expect(app).toMatchObject({
      ScanningInterval: 1.5,
      SeperateWithENTERS: false,
      OscMessageSuffix: '\\n~',
      BlankEgg: true,
      CycleStatus: true,
      SwitchStatusInterval: 12,
      IsRandomCycling: true,
      PrefixIconStatus: true,
      EmojiCollection: ['✨', '💫'],
      AcceptedTosVersion: '2025.03.22',
      WindowTop: 'NaN',
    });
    expect(app).not.toHaveProperty('JoinedAlphaChannel');
    expect(fileJson(files, 'TimeSettings.json')).toMatchObject({
      Time24H: true,
      PrefixTime: true,
      TimeShowTimeZone: true,
      SelectedTimeZone: 8,
    });
    expect(fileJson(files, 'MediaLinkSettings.json')).toMatchObject({
      IconPlay: '🎧',
      Separator: ' ᵇʸ ',
      TimeSeekStyle: 1,
      IconPause: '⏸',
      PauseIconMusic: true,
      ShowOnlyOnChange: true,
      TransientDuration: 40,
    });
    expect(fileJson(files, 'PulsoidModuleSettings.json')).toMatchObject({
      HeartRateTitle: true,
      CurrentHeartRateTitle: 'Pulse',
      ShowBPMSuffix: true,
      ShowAverageHeartRate: true,
      ShowMaximumHeartRate: false,
      ShowHeartRateTrendIndicator: true,
      AccessTokenOAuthEncrypted: 'AQAAANCMnd8BFdERjHoAwE/Cl+sBAAAApulsoid==',
    });
    expect(fileJson(files, 'WeatherSettings.json')).toMatchObject({
      WeatherTemplate: '{emoji} {temp} feels {feels} · {condition}',
      ShowWeatherFeelsLike: true,
      ShowWeatherHumidity: false,
      WeatherLocationMode: 1,
      WeatherLocationLatitude: 52.52,
      WeatherUnitOverride: 1,
      WeatherLocationCityEncrypted: 'AQAAANCMnd8BFdERjHoAwE/Cl+sBAAAAcity==',
    });
    expect(fileJson(files, 'AfkModuleSettings.json')).toMatchObject({
      AfkTimeout: 300,
      ShowPrefixIcon: true,
      AfkPrefix: '🌙',
      ShowAFKTime: true,
      AfkMessageForTimeStamp: 'away for ',
    });
    expect(fileJson(files, 'OscSettings.json')).toMatchObject({
      OscIP: '192.168.1.20',
      OscPortOut: 9010,
    });
    const items = JSON.parse(
      files.find((file) => file.path === 'ComponentStatsV1.json')?.content ?? '',
    ) as JsonObject[];
    expect(
      items.map((item) => [
        item['SystemMainName'],
        item['IsEnabled'],
        item['ShowTemperature'],
        item['ShowWattage'],
        item['DDRVersion'],
      ]),
    ).toEqual([
      ['CPU', true, false, false, null],
      ['GPU', true, true, true, null],
      ['RAM', true, false, false, 'DDR5'],
      ['VRAM', false, false, false, null],
    ]);
    expect(fileJson(files, 'ComponentStatsSettings.json')).toMatchObject({
      StatsSeparator: ' | ',
      TemperatureCelsius: false,
      TemperatureFahrenheit: true,
    });

    const list = fileJson(files, 'StatusList.json');
    expect((list['Items'] as JsonObject[]).map((item) => item['MSGID'])).toEqual([
      48213377, 91237, 7734511,
    ]);
    expect((list['Groups'] as JsonObject[]).map((group) => group['GroupId'])).toEqual([
      '3b1c2f4e-8a7d-4c1e-9f0a-1234567890ab',
      '9d8e7f6a-5b4c-4d3e-8f2a-0987654321ba',
    ]);

    const strip = (profile: ChatboxProfile): unknown[] =>
      profile.segments.map(({ id, kind, enabled, visibility, template, options }) => ({
        id,
        kind,
        enabled,
        visibility,
        template,
        options,
      }));
    expect(strip(second.profile)).toEqual(strip(first.profile));
    expect(second.profile.statuses).toEqual(first.profile.statuses);
    expect(second.profile.afk).toEqual(first.profile.afk);
    expect(second.profile.output).toEqual(first.profile.output);
    expect(second.profile.osc).toEqual(first.profile.osc);
    expect(second.profile.statusCycle).toEqual(first.profile.statusCycle);
    expect(diagnostics.filter((d) => d.level === 'error')).toEqual([]);
  });

  it('maps segments to integrations and reports what MagicChatbox lacks', () => {
    const profile = createDefaultProfile({
      segments: [
        createSegment('custom', { id: 'c', template: '{timer}' }),
        createSegment('speech', { id: 'sp' }),
        createSegment('status', { id: 's1' }),
        createSegment('status', { id: 's2' }),
        createSegment('media', { id: 'm1', template: '▶ {artist} - {title} {album}' }),
        createSegment('media', { id: 'm2', template: '🎵 {title} by {artist}' }),
        createSegment('time', {
          id: 't',
          template: '{time}',
          options: {
            kind: 'time',
            use24Hour: false,
            showSeconds: false,
            timezone: 'Europe/Paris',
            showTimezone: false,
          },
        }),
        createSegment('hardware', {
          id: 'h',
          template: 'CPU {cpu_usage} ¦ GPU {gpu_temp} ¦ RAM {ram_usage}',
        }),
        createSegment('vr_battery', { id: 'b', enabled: false }),
      ],
    });
    const { files, diagnostics } = magicchatboxCodec.serialize(profile);
    const messages = diagnostics
      .filter((d) => d.code === 'unsupported-feature')
      .map((d) => d.message);
    expect(messages).toContainEqual(expect.stringContaining('The custom segment'));
    expect(messages).toContainEqual(expect.stringContaining('The speech segment'));
    expect(messages).toContainEqual(expect.stringContaining('A second status segment'));
    expect(messages).toContainEqual(expect.stringContaining('{ram_usage}'));

    const intgr = fileJson(files, 'IntegrationSettings.json');
    expect(intgr).toMatchObject({
      IntgrSpotify: true,
      IntgrScanMediaLink: true,
      IntgrComponentStats: true,
      IntgrTrackerBattery: false,
      IntgrStatus: true,
    });
    expect((intgr['SavedSortOrder'] as string[]).slice(0, 6)).toEqual([
      'Status',
      'Spotify',
      'MediaLink',
      'Time',
      'Component',
      'TrackerBattery',
    ]);
    expect(fileJson(files, 'SpotifySettings.json')['OutputTemplate']).toBe(
      '▶ {artist} - {title} {album}',
    );
    expect(fileJson(files, 'MediaLinkSettings.json')).toMatchObject({
      Separator: ' by ',
      TimeSeekStyle: 2,
    });
    expect(fileJson(files, 'AppSettings.json')['PrefixIconMusic']).toBe(false);
    expect(fileJson(files, 'TimeSettings.json')['SelectedTimeZone']).toBe(8);
    const items = JSON.parse(
      files.find((file) => file.path === 'ComponentStatsV1.json')?.content ?? '',
    ) as JsonObject[];
    expect(
      items.map((item) => [item['IsEnabled'], item['ShowTemperature'], item['ShowWattage']]),
    ).toEqual([
      [true, false, false],
      [true, true, false],
      [true, false, false],
      [false, false, false],
    ]);
  });

  it('writes AFK settings without a duration and keeps encrypted values blank when unknown', () => {
    const profile = createDefaultProfile({
      afk: { enabled: false, timeoutSeconds: 60, template: 'brb', replaceEverything: true },
    });
    const { files, diagnostics } = magicchatboxCodec.serialize(profile);
    expect(fileJson(files, 'AfkModuleSettings.json')).toMatchObject({
      EnableAfkDetection: false,
      AfkTimeout: 60,
      ShowPrefixIcon: false,
      ShowAFKTime: false,
      AfkMessageWithoutTimeStamp: 'brb',
      ActiveStyleId: '',
    });
    expect(fileJson(files, 'AfkModuleSettings.json')).not.toHaveProperty('Styles');
    expect(fileJson(files, 'SpotifySettings.json')['AccessTokenEncrypted']).toBe('');
    expect(fileJson(files, 'WeatherSettings.json')['WeatherLocationCityEncrypted']).toBe('');
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: 'approximated', path: 'AfkModuleSettings.json' }),
    );
  });

  it('warns when a weather city cannot be written', () => {
    const segment = createSegment('weather', {
      id: 'w',
      options: {
        kind: 'weather',
        temperatureUnit: 'F',
        locationMode: 'city',
        city: 'Berlin',
        latitude: 0,
        longitude: 0,
        updateIntervalMinutes: 5,
      },
    });
    const { files, diagnostics } = magicchatboxCodec.serialize(
      createDefaultProfile({ segments: [segment] }),
    );
    expect(fileJson(files, 'WeatherSettings.json')).toMatchObject({
      WeatherUnitOverride: 2,
      WeatherLocationMode: 0,
      WeatherUpdateIntervalMinutes: 5,
      WeatherTemplate: '{emoji} {temp}',
      ShowWeatherInTime: true,
    });
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ level: 'warning', code: 'encrypted-value' }),
    );
  });
});
