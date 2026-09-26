import { event, state, variable, type VrcoscModule, type VrcoscVariable } from './catalog-types';

/**
 * Bluscream/VRCOSC-Modules `2026.0926.3` (branch `stable`): the modules added
 * for MagicChatbox parity. The older Bluscream modules stay in
 * `modules-community.ts`; this file only exists to keep both under the size
 * limit. Enum-based ids are the C# member names lower-cased
 * (`Heartrate_Min` → `heartrate_min`); string lookups keep their spelling.
 */
export const BLUSCREAM = 'bluscream.vrcosc.modules';
export const BLUSCREAM_REPO = 'Bluscream/VRCOSC-Modules';

export function community(
  packageId: string,
  repository: string,
  shortId: string,
  title: string,
  body: Omit<VrcoscModule, 'fullId' | 'packageId' | 'title' | 'repository' | 'official'>,
): VrcoscModule {
  return {
    fullId: `${packageId}.${shortId}`,
    packageId,
    title,
    repository,
    official: false,
    ...body,
  };
}

export function bluscreamModuleId(shortId: string): string {
  return `${BLUSCREAM}.${shortId}`;
}

function bluscream(
  shortId: string,
  title: string,
  body: Omit<VrcoscModule, 'fullId' | 'packageId' | 'title' | 'repository' | 'official'>,
): VrcoscModule {
  return community(BLUSCREAM, BLUSCREAM_REPO, shortId, title, body);
}

/** `DiscordVoiceVariable` enum members (no canonical counterpart). */
const DISCORD_ENUM_VARIABLES: Readonly<Record<string, VrcoscVariable>> = {
  guildcount: variable('int', 'Guild Count'),
  channelcount: variable('int', 'Channel Count'),
  selectedvoicechannelid: variable('int', 'Voice Channel Id'),
  inputvolume: variable('float', 'Input Volume'),
  outputvolume: variable('float', 'Output Volume'),
  channelusercount: variable('int', 'Channel User Count'),
  channeltype: variable('int', 'Channel Type'),
  ready: variable('bool', 'Ready'),
  lasterrorcode: variable('int', 'Error Code'),
  voiceconnectionstate: variable('int', 'Voice Connection State'),
  eventguildid: variable('int', 'Event Guild Id'),
  eventchannelid: variable('int', 'Event Channel Id'),
  eventuserid: variable('int', 'Event User Id'),
  eventmessageid: variable('int', 'Event Message Id'),
  lasteventcode: variable('int', 'Last Event Code'),
};

const DISCORD_EVENTS = {
  readyevent: event('Ready', 'RPC Ready', ['ready']),
  errorevent: event('Error', 'Error code {0}', ['lasterrorcode']),
  guildstatusevent: event('Guild Status', 'Guild {0}', ['eventguildid']),
  guildcreateevent: event('Guild Created', 'Guild {0}', ['eventguildid']),
  channelcreateevent: event('Channel Created', 'Channel {0}', ['eventchannelid']),
  voicestatecreateevent: event('Voice Join', 'User {0}', ['eventuserid']),
  voicestateupdateevent: event('Voice Update', 'User {0}', ['eventuserid']),
  voicestatedeleteevent: event('Voice Leave', 'User {0}', ['eventuserid']),
  voicesettingsevent: event('Voice Settings', 'Input {0}%', ['inputvolume']),
  speakingstartevent: event('Speaking Start', 'User {0}', ['eventuserid']),
  speakingstopevent: event('Speaking Stop', 'User {0}', ['eventuserid']),
  messagecreateevent: event('Message Created', 'Msg {0}', ['eventmessageid']),
  messageupdateevent: event('Message Updated', 'Msg {0}', ['eventmessageid']),
  messagedeleteevent: event('Message Deleted', 'Msg {0}', ['eventmessageid']),
  notificationevent: event('Notification', 'Channel {0}', ['eventchannelid']),
  activityjoinevent: event('Activity Join', 'Join'),
  activityspectateevent: event('Activity Spectate', 'Spectate'),
  activityjoinrequestevent: event('Join Request', 'User {0}', ['eventuserid']),
} as const;

/** `StatusListModuleSetting` row (`StatusEntry` `[JsonProperty]` names). */
export interface StatusEntryJson {
  readonly text: string;
  readonly group: string;
  readonly cycle: boolean;
}

export const BLUSCREAM_MODULES: readonly VrcoscModule[] = [
  bluscream('statusmodule', 'Status', {
    mainState: 'default',
    states: {
      default: state('Default', '{0}', ['status']),
      idle: state('No status', ''),
    },
    events: { changed: event('Status changed', '{0}', ['status']) },
    variables: {
      status: variable('string', 'Status (with icon)', 'status'),
      text: variable('string', 'Status text', 'status'),
      icon: variable('string', 'Icon'),
      index: variable('int', 'Index'),
      count: variable('int', 'Count'),
      group: variable('string', 'Group'),
    },
    settings: {
      statuses: [],
      cycle: false,
      interval: 30,
      random: false,
      disabledgroups: [],
      overridegroup: '',
      prefixicon: true,
      icons: ['💬'],
      shuffleicons: false,
    },
  }),
  bluscream('streamstatsmodule', 'Stream Stats', {
    mainState: 'live',
    states: {
      live: state('Live', 'Live on {0} | {1} viewers', ['stream_platform', 'stream_viewers']),
      offline: state('Offline', 'Offline'),
      unauthenticated: state('Unauthenticated', ''),
    },
    events: {
      wentlive: event('Twitch went live', '{0} went live: {1}', ['twitch_channel', 'twitch_game']),
      wentoffline: event('Twitch went offline', '{0} went offline', ['twitch_channel']),
      follow: event('TikTok new follower(s)', '👥 New follower! {0} followers', [
        'tiktok_followers',
      ]),
      like: event('TikTok new like(s)', '❤ {0} likes', ['tiktok_likes']),
    },
    // String lookups: ids are exactly the MagicChatbox placeholder keys.
    variables: {
      stream_live: variable('bool', 'Live (any platform)'),
      stream_viewers: variable('int', 'Viewers (all platforms)'),
      stream_platform: variable('string', 'Live platform(s)'),
      twitch_live: variable('bool', 'Twitch Live', 'twitch_live'),
      twitch_channel: variable('string', 'Twitch Channel (display name)', 'twitch_channel'),
      twitch_game: variable('string', 'Twitch Game', 'twitch_game'),
      twitch_title: variable('string', 'Twitch Title', 'twitch_title'),
      twitch_viewers: variable('int', 'Twitch Viewers', 'twitch_viewers'),
      twitch_followers: variable('int', 'Twitch Followers', 'twitch_followers'),
      twitch_uptime: variable('string', 'Twitch Uptime (h:mm)'),
      tiktok_host: variable('string', 'TikTok Host', 'tiktok_host'),
      tiktok_viewers: variable('int', 'TikTok Viewers', 'tiktok_viewers'),
      tiktok_likes: variable('int', 'TikTok Likes', 'tiktok_likes'),
      tiktok_followers: variable('int', 'TikTok Followers', 'tiktok_followers'),
      tiktok_live: variable('bool', 'TikTok Live'),
    },
    settings: {
      twitchenabled: true,
      channel: '',
      pollinterval: 60,
      clientid: '6y51jdzkdtlwv56akwerab47wwov1w',
      manualtoken: '',
      forgettoken: false,
      tiktokenabled: true,
      host: '',
      livepollseconds: 15,
      offlinepollseconds: 60,
      followersrefreshminutes: 5,
      maxbackoffseconds: 300,
    },
  }),
  bluscream('discordvoicemodule', 'Discord Voice', {
    mainState: 'invoice',
    states: {
      invoice: state('In Voice', '🔊 {0} ({3})\n{1}\n{2}', [
        'discord_channel',
        'discord_speaking',
        'discord_mute_state',
        'discord_users',
      ]),
      notinvoice: state('Not In Voice', ''),
      disconnected: state('Disconnected', ''),
    },
    events: DISCORD_EVENTS,
    variables: {
      ...DISCORD_ENUM_VARIABLES,
      discord_channel: variable('string', 'Voice Channel', 'discord_channel'),
      discord_speaking: variable('string', 'Speaking', 'discord_speaking'),
      discord_mute_state: variable('string', 'Mute State', 'discord_mute_state'),
      discord_muted: variable('bool', 'Muted'),
      discord_deafened: variable('bool', 'Deafened'),
      discord_users: variable('int', 'Users In Channel', 'discord_count'),
    },
    settings: {
      clientid: '',
      clientsecret: '',
      defaultguildid: '',
      defaultchannelid: '',
      autoupdatedefaults: false,
      maxspeakingnames: 3,
      speakingholdms: 300,
      voicesource: 0,
      orbolayport: 6888,
      devcompanionport: 8486,
      ipcbridgeport: 6890,
    },
  }),
  bluscream('heartratestatsmodule', 'Heartrate Stats', {
    mainState: 'connected',
    states: {
      connected: state('Connected', '❤ {0} {3} ({1}-{2})', [
        'heartrate',
        'heartrate_min',
        'heartrate_max',
        'heartrate_trend',
      ]),
      disconnected: state('Disconnected', ''),
    },
    events: {
      connected: event('Connected', '❤ Heartrate connected'),
      disconnected: event('Disconnected', '❤ Heartrate disconnected'),
    },
    variables: {
      heartrate: variable('int', 'Heartrate', 'heartrate'),
      heartrate_min: variable('int', 'Session Min', 'heartrate_min'),
      heartrate_max: variable('int', 'Session Max', 'heartrate_max'),
      heartrate_trend: variable('string', 'Trend Arrow', 'heartrate_trend'),
      heartrate_average: variable('int', 'Average', 'heartrate_avg'),
      heartrate_connected: variable('bool', 'Connected'),
    },
    settings: {
      // `HeartrateProvider`: 0 Pulsoid, 1 HypeRate, 2 Osc.
      provider: 0,
      pulsoidtoken: '',
      hyperateid: '',
      hyperateapikey: '',
      oscaddress: 'VRCOSC/HeartrateStats/Input',
      trendwindowseconds: 30,
      trendthreshold: 3,
      averageperiodseconds: 10,
      resetnow: false,
      normalisedlowerbound: 0,
      normalisedupperbound: 240,
      beatmode: false,
    },
  }),
  bluscream('linuxaudiofxmodule', 'Linux Audio FX', {
    // `idle` still carries the voice preset, so both states render a segment.
    mainState: 'idle',
    states: {
      playing: state('Playing', '🔊 {0} ({1})\n🎙 {2}', [
        'soundpad_sound',
        'soundpad_app',
        'voicemod_voice',
      ]),
      idle: state('Idle', '🎙 {0}', ['voicemod_voice']),
    },
    events: { soundstarted: event('Sound started', '🔊 {0}', ['soundpad_sound']) },
    // `AudioFxVariable` members are already spelled lower-case.
    variables: {
      soundpad_sound: variable('string', 'Soundboard sound (soundpad_sound)', 'soundpad_sound'),
      soundpad_app: variable('string', 'Soundboard app (soundpad_app)'),
      voicemod_voice: variable('string', 'Voice preset (voicemod_voice)', 'voicemod_voice'),
      voicemod_sound: variable('string', 'Last sound, held (voicemod_sound)', 'voicemod_sound'),
    },
    settings: {
      pollintervalms: 1000,
      soundboardapps: 'Soundux|Kenku|Sound Board|Soundboard|Ducky|Zedd',
      matchrolehint: true,
      holdseconds: 5,
    },
  }),
  bluscream('vrcextrasmodule', 'VRChat Extras', {
    mainState: 'ininstance',
    states: {
      ininstance: state('In Instance', '{0}\n{1} · {2} · {3} players', [
        'world',
        'instancetype',
        'region',
        'playercount',
      ]),
      notininstance: state('Not In Instance', ''),
    },
    events: { worldchanged: event('World Changed', 'Now in {0}', ['world']) },
    // `mastericon` keeps its original key; `vrc_master` is its alias (same value).
    variables: {
      world: variable('string', 'World Name', 'vrc_world'),
      worldid: variable('string', 'World ID'),
      instancetype: variable('string', 'Instance Type', 'vrc_instance_type'),
      region: variable('string', 'Instance Region', 'vrc_region'),
      playercount: variable('int', 'Player Count', 'vrc_player_count'),
      instanceid: variable('string', 'Instance ID'),
      instanceowner: variable('string', 'Instance Owner ID'),
      agegated: variable('bool', 'Age Gated'),
      hasqueue: variable('bool', 'Has Queue'),
      mastericon: variable('string', 'Master Icon', 'vrc_master'),
      vrc_master: variable('string', 'Master Icon (MagicChatbox key)', 'vrc_master'),
      vrc_instance_capacity: variable(
        'int',
        'Instance Capacity (world capacity)',
        'vrc_instance_capacity',
      ),
    },
    settings: { mastericon: '👑', vrchatlogdirectory: '' },
  }),
  bluscream('openmeteoweathermodule', 'Open-Meteo Weather', {
    mainState: 'default',
    states: {
      default: state('Default', '{0} {1}\n{2}C (feels {3}C)\n{4}', [
        'emoji',
        'condition',
        'tempc',
        'feelslikec',
        'wind',
      ]),
      unavailable: state('Unavailable', 'Weather unavailable'),
    },
    events: {},
    variables: {
      emoji: variable('string', 'Emoji', 'weather_emoji'),
      condition: variable('string', 'Condition', 'weather_condition'),
      tempc: variable('float', 'Temp C', 'weather_temp'),
      tempf: variable('float', 'Temp F', 'weather_temp'),
      feelslikec: variable('float', 'Feels Like C', 'weather_feels_like'),
      feelslikef: variable('float', 'Feels Like F', 'weather_feels_like'),
      humidity: variable('int', 'Humidity (%)', 'weather_humidity'),
      wind: variable('string', 'Wind (speed + direction)', 'weather_wind'),
      windkph: variable('float', 'Wind km/h'),
      windmph: variable('float', 'Wind mph'),
      winddirection: variable('string', 'Wind Direction'),
      locationname: variable('string', 'Location Name'),
    },
    settings: { location: '' },
  }),
  bluscream('mcbparitymodule', 'MagicChatbox Parity', {
    mainState: 'default',
    states: {
      default: state('Default', 'Reproj {0}% · Dropped {1}/min', [
        'vr_reprojection',
        'vr_dropped_frames',
      ]),
    },
    events: {},
    // `MCBParityVariable` members are spelled like the MagicChatbox keys.
    variables: {
      vr_reprojection: variable(
        'int',
        'VR Reprojection (% of frames, last second)',
        'vr_reprojection',
      ),
      vr_dropped_frames: variable('int', 'VR Dropped Frames (per minute)', 'vr_dropped_frames'),
      timezone: variable('string', 'Timezone Abbreviation (e.g. CEST)', 'timezone'),
      timezone_offset: variable('string', 'Timezone Offset (e.g. +02:00)'),
    },
    settings: { vrframestats: true, timezoneoverride: '' },
  }),
  bluscream('translationpatchesmodule', 'Speech Translation', {
    // Starts in `idle`; `speaking` holds the text for `SpeakingSeconds` after the last result.
    mainState: 'speaking',
    states: {
      speaking: state('Speaking', '{0}\n{1}', ['speech_text', 'translation']),
      idle: state('Idle', ''),
    },
    events: {
      spoken: event('Spoken', '{0}', ['speech_text'], { showTyping: true, length: 10 }),
      translated: event('Translated', '{0}', ['translation'], { showTyping: true, length: 10 }),
      twoway: event('Two-way Translated', '{0}', ['twoway_output'], { length: 10 }),
    },
    // `TranslationVariable` members are spelled like the MagicChatbox keys.
    variables: {
      speech_text: variable('string', 'Speech Text (as spoken)', 'speech_text'),
      translation: variable('string', 'Translation', 'translation'),
      translation_language: variable('string', 'Translation Language'),
      twoway_input: variable('string', 'Two-way Input (others, as spoken)'),
      twoway_output: variable('string', 'Two-way Output (others, translated)'),
    },
    settings: {
      targetlanguage: 'en',
      speakingseconds: 10,
      twowayenabled: false,
      twowaydevice: 'Monitor',
      twowaylanguage: 'en',
    },
  }),
];
