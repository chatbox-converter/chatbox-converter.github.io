import { event, state, variable, type VrcoscModule } from './catalog-types';
import { BLUSCREAM, BLUSCREAM_MODULES, BLUSCREAM_REPO, community } from './modules-bluscream';
import {
  HARDWARE_VARIABLES,
  HEARTRATE_SETTINGS,
  HEARTRATE_STATES,
  HEARTRATE_VARIABLES,
  MEDIA_EVENTS,
  MEDIA_STATES,
} from './modules-official';

/**
 * Community packages that register ChatBox items
 * (`.references/notes/ecosystem-plugins.md` Part A). Package ids keep their
 * original case; variable ids created from raw string lookups (Yeusepe's
 * modules) keep their PascalCase. The Bluscream modules added in `2026.0926.2`
 * live in `modules-bluscream.ts`.
 */
const YEUSEPE = 'YUCP.VIRA.yeusepesmodules';
const YEUSEPE_REPO = 'Yeusepe/Yeusepes-Modules';

const SPOTIOSC_STATE_PREFIXES: Readonly<Record<string, string>> = {
  Playing_Jam_Explicit_Shuffle: 'State: In a Jam! (Explicit, Shuffle)\n',
  Playing_Jam_Explicit_NoShuffle: 'State: In a Jam! (Explicit)\n',
  Playing_Jam_Clean_Shuffle: 'State: In a Jam! (Shuffle)\n',
  Playing_Jam_Clean_NoShuffle: 'State: In a Jam!\n',
  Paused_Jam: 'State: In a Jam!: Paused Music\n',
  Playing_Explicit_Shuffle: 'State: Playing (Explicit, Shuffle)\n',
  Playing_Explicit_NoShuffle: 'State: Playing (Explicit)\n',
  Playing_Clean_Shuffle: 'State: Playing (Shuffle)\n',
  Playing_Clean_NoShuffle: 'State: Playing\n',
  Paused_Normal: 'State: Paused Music\n',
};

/** SpotiOSC registers ten states sharing one body (`SpotiOSC.cs:546-558`). */
function spotioscStates(): Record<string, ReturnType<typeof state>> {
  const body =
    'Track: {0} - {1}\nAlbum: {2}\nDevice: {3} ({4}%)\nPlayback: Shuffle: {5}, Repeat: {6}\n';
  const variables = [
    'TrackName',
    'TrackArtist',
    'AlbumName',
    'DeviceName',
    'VolumePercent',
    'ShuffleState',
    'RepeatState',
  ];
  return Object.fromEntries(
    Object.entries(SPOTIOSC_STATE_PREFIXES).map(([id, prefix]) => [
      id,
      state(id.replaceAll('_', ' '), prefix + body, variables),
    ]),
  );
}

export const COMMUNITY_MODULES: readonly VrcoscModule[] = [
  community(
    'art.djdavid98.bluetoothheartrate',
    'WentTheFox/VRCOSC-BluetoothHeartrate',
    'bluetoothheartratemodule',
    'Bluetooth Heartrate',
    {
      mainState: 'connected',
      states: HEARTRATE_STATES,
      events: {},
      variables: { ...HEARTRATE_VARIABLES, devicename: variable('string', 'Device Name') },
      settings: {
        ...HEARTRATE_SETTINGS,
        websocketserverenabled: false,
        websocketserverhost: '127.0.0.1',
        websocketserverport: 36210,
      },
    },
  ),
  community(BLUSCREAM, BLUSCREAM_REPO, 'linuxhardwarestatsmodule', 'Linux Hardware Stats', {
    mainState: 'default',
    states: {
      default: state('Default', 'CPU: {0}% | GPU: {1}%\nRAM: {2}GB/{3}GB\n↓{4} ↑{5}', [
        'cpuusage',
        'gpuusage',
        'ramused',
        'ramtotal',
        'networkdownload',
        'networkupload',
      ]),
    },
    events: {},
    variables: {
      ...HARDWARE_VARIABLES,
      cpumanufacturer: variable('string', 'CPU Manufacturer'),
      cpumodel: variable('string', 'CPU Model'),
      gpumanufacturer: variable('string', 'GPU Manufacturer'),
      gpumodel: variable('string', 'GPU Model'),
      networkdownload: variable('string', 'Network Download', 'net_down'),
      networkupload: variable('string', 'Network Upload', 'net_up'),
      networkrxtotal: variable('string', 'Network Received Total', 'net_total_down'),
      networktxtotal: variable('string', 'Network Sent Total', 'net_total_up'),
      networkmaxdown: variable('float', 'Network Max Download (Mbps, session)', 'net_max_down'),
      networkmaxup: variable('float', 'Network Max Upload (Mbps, session)', 'net_max_up'),
      networkutilization: variable('int', 'Network Utilization (%)', 'net_utilization'),
      networklinkspeed: variable('int', 'Network Link Speed (Mbps)'),
      systemtemp: variable('int', 'System Temp (C)'),
      maxtemp: variable('int', 'Max Temp (C)'),
      windowtitle: variable('string', 'Active Window Title', 'window_title'),
      processname: variable('string', 'Active Process Name', 'window_app'),
      windowfps: variable('int', 'Active Window FPS', 'fps'),
      vrmode: variable('string', 'VR Mode', 'device_mode'),
      osname: variable('string', 'OS Name'),
      osversion: variable('string', 'OS Version'),
      oskernel: variable('string', 'OS Kernel'),
      osprettyname: variable('string', 'OS Pretty Name'),
      osvariant: variable('string', 'OS Variant'),
    },
    settings: {
      selectedcpu: 0,
      selectedgpu: 0,
      networkinterface: '',
      redactedwindowtitlepattern: '',
      redactedprocessnamepattern: '',
      redactedtext: '[REDACTED]',
    },
  }),
  community(BLUSCREAM, BLUSCREAM_REPO, 'linuxmediamodule', 'Linux Media', {
    mainState: 'playing',
    states: MEDIA_STATES,
    events: MEDIA_EVENTS,
    variables: {
      title: variable('string', 'Title', 'title'),
      artist: variable('string', 'Artist', 'artist'),
      artisttitle: variable('string', 'Artist + Title'),
      time: variable('timespan', 'Current Time', 'position'),
      timeremaining: variable('timespan', 'Time Remaining', 'remaining'),
      duration: variable('timespan', 'Duration', 'duration'),
      progressvisual: variable('progress', 'Progress Visual', 'progress_bar'),
      progresspercent: variable('int', 'Progress (%)', 'progress_percent'),
      playicon: variable('string', 'Play Icon', 'play_icon'),
      lyrics: variable('string', 'Lyrics (current line)', 'lyrics'),
      volume: variable('int', 'Volume', 'volume'),
    },
    settings: { lyrics: false },
  }),
  community(BLUSCREAM, BLUSCREAM_REPO, 'openxrstatisticsmodule', 'OpenXR Stats', {
    mainState: 'default',
    states: {
      default: state('Default', 'HMD: {0}\nLHand: {1}\nRHand: {2}', [
        'hmd_battery',
        'lhand_battery',
        'rhand_battery',
      ]),
      noruntime: state('No Runtime', 'OpenXR runtime not available'),
    },
    events: {},
    variables: {
      fps: variable('float', 'FPS', 'vr_fps'),
      targethz: variable('int', 'Target Hz (headset refresh rate)', 'vr_target_hz'),
      dashboardvisible: variable('bool', 'Dashboard Visible'),
      runtimename: variable('string', 'Runtime Name'),
      systemname: variable('string', 'System Name'),
      sessionstate: variable('string', 'Session State'),
      hmd_battery: variable('int', 'HMD Battery (%)', 'hmd_battery'),
      hmd_charging: variable('bool', 'HMD Charging'),
      lhand_battery: variable('int', 'Left Hand Battery (%)', 'left_controller_battery'),
      lhand_charging: variable('bool', 'Left Hand Charging'),
      rhand_battery: variable('int', 'Right Hand Battery (%)', 'right_controller_battery'),
      rhand_charging: variable('bool', 'Right Hand Charging'),
    },
    settings: { overlaysession: true },
  }),
  community(BLUSCREAM, BLUSCREAM_REPO, 'desktopfpsmodule', 'Desktop FPS', {
    // Registers no states: a clip linked to it can never evaluate (see MAPPING.md).
    states: {},
    events: {},
    variables: { fps: variable('int', 'FPS', 'fps') },
    settings: {},
  }),
  community(BLUSCREAM, BLUSCREAM_REPO, 'httpmodule', 'HTTP', {
    mainState: 'idle',
    states: {
      idle: state('Idle', 'HTTP Ready'),
      requesting: state('Requesting', 'Requesting: {0}', ['lasturl']),
      success: state('Success', 'HTTP {1}\n{0}', ['lasturl', 'laststatuscode']),
      failed: state('Failed', 'HTTP {1}\n{0}', ['lasturl', 'laststatuscode']),
    },
    events: {
      onsuccess: event('On Success', 'Success: {0} ({1})', ['lasturl', 'laststatuscode']),
      onfailed: event('On Failed', 'Failed: {0} ({1})', ['lasturl', 'laststatuscode']),
    },
    variables: {
      lasturl: variable('string', 'Last URL'),
      laststatuscode: variable('int', 'Last Status Code'),
      lastresponse: variable('string', 'Last Response'),
      requestscount: variable('int', 'Requests Count'),
    },
    settings: { logrequests: false, timeout: 30000 },
  }),
  community(BLUSCREAM, BLUSCREAM_REPO, 'notificationsmodule', 'Notifications', {
    mainState: 'idle',
    states: { idle: state('Idle', ''), sending: state('Sending', '') },
    events: {
      onnotificationsent: event('On Notification Sent', ''),
      onnotificationfailed: event('On Notification Failed', ''),
    },
    variables: {
      lasttitle: variable('string', 'Last Title'),
      lastmessage: variable('string', 'Last Message'),
      notificationcount: variable('int', 'Notification Count'),
      lasttarget: variable('string', 'Last Target'),
    },
    settings: {},
  }),
  community(BLUSCREAM, BLUSCREAM_REPO, 'ircbridgemodule', 'IRC Bridge', {
    mainState: 'joined',
    states: {
      disconnected: state('Disconnected', 'IRC Bridge: Disconnected'),
      connecting: state('Connecting', 'IRC Bridge: Connecting'),
      connected: state('Connected', 'IRC Bridge: Connected\nServer: {0}', ['serverstatus']),
      joining: state('Joining', 'IRC Bridge: Joining'),
      joined: state('Joined', 'IRC Bridge: Joined\nChannel: {0}', ['channelname']),
      error: state('Error', 'IRC Bridge: Error\n{0}', ['serverstatus']),
    },
    events: {},
    variables: {
      serverstatus: variable('string', 'Server Status'),
      channelname: variable('string', 'Channel Name'),
      nickname: variable('string', 'Nickname'),
      lastmessage: variable('string', 'Last Message'),
      lastmessageuser: variable('string', 'Last Message User'),
      lastjoineduser: variable('string', 'Last Joined User'),
      lastleftuser: variable('string', 'Last Left User'),
      usercount: variable('int', 'User Count'),
      lasteventtime: variable('string', 'Last Event Time'),
    },
    settings: {},
  }),
  community(BLUSCREAM, BLUSCREAM_REPO, 'vrcxbridgemodule', 'VRCX Bridge', {
    mainState: 'default',
    // Variables/states/events are pushed by VRCX at runtime (`vrcx_<name>`).
    states: { default: state('Default', '') },
    events: {},
    variables: {},
    settings: {},
  }),
  ...BLUSCREAM_MODULES,
  community(YEUSEPE, YEUSEPE_REPO, 'spotiosc', 'SpotiOSC', {
    mainState: 'Playing_Clean_NoShuffle',
    states: spotioscStates(),
    events: {
      TrackChangedEvent: event('Track Changed', 'Now playing: {0}', ['TrackName']),
    },
    variables: {
      TrackName: variable('string', 'Track Name', 'title'),
      TrackArtist: variable('string', 'Track Artist', 'artist'),
      AlbumName: variable('string', 'Album Name', 'album'),
      DeviceName: variable('string', 'Device Name', 'player'),
      VolumePercent: variable('int', 'Volume Percent', 'volume'),
      ShuffleState: variable('bool', 'Shuffle State'),
      RepeatState: variable('string', 'Repeat State'),
      ProgressMs: variable('int', 'Progress (ms)'),
      TrackDurationMs: variable('int', 'Track Duration (ms)'),
    },
    settings: {},
  }),
  community(YEUSEPE, YEUSEPE_REPO, 'vrchatapi', 'VRChat API Interactor', {
    // Registers variables and events only, no states (see MAPPING.md).
    states: {},
    events: {},
    variables: {
      DisplayName: variable('string', 'Display Name'),
      UserStatus: variable('string', 'User Status'),
      WorldName: variable('string', 'World Name', 'vrc_world'),
      WorldId: variable('string', 'World Id'),
      WorldAuthorName: variable('string', 'World Author'),
      WorldCapacity: variable('int', 'World Capacity'),
      WorldOccupants: variable('int', 'World Occupants'),
      InstanceType: variable('string', 'Instance Type', 'vrc_instance_type'),
      InstanceOwner: variable('string', 'Instance Owner'),
      InstanceCapacity: variable('int', 'Instance Capacity', 'vrc_instance_capacity'),
      InstanceOccupants: variable('int', 'Instance Occupants', 'vrc_player_count'),
    },
    settings: {},
  }),
  community(YEUSEPE, YEUSEPE_REPO, 'discordosc', 'DiscordOSC', {
    mainState: 'VoiceState',
    states: {
      VoiceState: state('Voice Connection State', 'State: {0}', ['VoiceConnectionState']),
    },
    events: {},
    variables: {
      GuildCount: variable('int', 'Guild Count'),
      ChannelCount: variable('int', 'Channel Count'),
      ChannelUserCount: variable('int', 'Channel User Count', 'discord_count'),
      VoiceConnectionState: variable('int', 'Voice Connection State'),
      InputVolume: variable('float', 'Input Volume'),
      OutputVolume: variable('float', 'Output Volume'),
    },
    settings: {},
  }),
  community(YEUSEPE, YEUSEPE_REPO, 'shazamosc', 'ShazamOSC', {
    states: {},
    events: {},
    variables: { RecognizedSong: variable('string', 'Recognized Song') },
    settings: {},
  }),
];
