import { event, state, variable, type VrcoscModule, type VrcoscVariable } from './catalog-types';

/** Package id of VolcanicArts/VRCOSC-Modules. */
export const OFFICIAL_PACKAGE_ID = 'volcanicarts.vrcosc.officialmodules';
const REPO = 'VolcanicArts/VRCOSC-Modules';

function official(
  shortId: string,
  title: string,
  body: Omit<VrcoscModule, 'fullId' | 'packageId' | 'title' | 'repository' | 'official'>,
): VrcoscModule {
  return {
    fullId: `${OFFICIAL_PACKAGE_ID}.${shortId}`,
    packageId: OFFICIAL_PACKAGE_ID,
    title,
    repository: REPO,
    official: true,
    ...body,
  };
}

/** Shared by Pulsoid, HypeRate and the community Bluetooth module (`HeartrateModule<T>`). */
export const HEARTRATE_VARIABLES: Readonly<Record<string, VrcoscVariable>> = {
  current: variable('int', 'Current', 'heartrate'),
  average: variable('int', 'Average', 'heartrate_avg'),
};

export const HEARTRATE_STATES = {
  connected: state('Connected', 'Heartrate: {0}', ['current']),
  disconnected: state('Disconnected', ''),
} as const;

export const HEARTRATE_SETTINGS = {
  smoothvalue: true,
  smoothvaluelength: 1000,
  averageperiod: 10000,
  smoothaverage: true,
  smoothaveragelength: 1000,
  normalisedlowerbound: 0,
  normalisedupperbound: 240,
  beatmode: false,
} as const;

export const HARDWARE_VARIABLES: Readonly<Record<string, VrcoscVariable>> = {
  cpuname: variable('string', 'CPU Name', 'cpu_name'),
  cpuusage: variable('int', 'CPU Usage (%)', 'cpu_usage'),
  cpupower: variable('int', 'CPU Power (W)', 'cpu_power'),
  cputemp: variable('int', 'CPU Temp (C)', 'cpu_temp'),
  gpuname: variable('string', 'GPU Name', 'gpu_name'),
  gpuusage: variable('int', 'GPU Usage (%)', 'gpu_usage'),
  gpupower: variable('int', 'GPU Power (W)', 'gpu_power'),
  gputemp: variable('int', 'GPU Temp (C)', 'gpu_temp'),
  ramusage: variable('float', 'RAM Usage (%)', 'ram_usage'),
  ramtotal: variable('float', 'RAM Total (GB)', 'ram_total'),
  ramused: variable('float', 'RAM Used (GB)', 'ram_used'),
  ramfree: variable('float', 'RAM Free (GB)'),
  vramusage: variable('float', 'VRAM Usage (%)', 'vram_usage'),
  vramtotal: variable('float', 'VRAM Total (GB)', 'vram_total'),
  vramused: variable('float', 'VRAM Used (GB)', 'vram_used'),
  vramfree: variable('float', 'VRAM Free (GB)'),
};

export const MEDIA_STATES = {
  playing: state('Playing', '[{0}/{1}]\n{2} - {3}\n{4}', [
    'time',
    'duration',
    'artist',
    'title',
    'progressvisual',
  ]),
  paused: state('Paused', '[Paused]\n{0} - {1}', ['artist', 'title']),
  stopped: state('Stopped', '[No Source]'),
} as const;

export const MEDIA_EVENTS = {
  ontrackchange: event('On Track Change', 'Now Playing\n{0} - {1}', ['artist', 'title'], {
    showTyping: true,
  }),
  onplay: event('On Play', '[Playing]\n{0} - {1}', ['artist', 'title']),
  onpause: event('On Pause', '[Paused]\n{0} - {1}', ['artist', 'title']),
} as const;

const STEAMVR_ROLES = [
  ['hmd', 'HMD'],
  ['lhand', 'Left Hand'],
  ['rhand', 'Right Hand'],
  ['lelbow', 'Left Elbow'],
  ['relbow', 'Right Elbow'],
  ['lfoot', 'Left Foot'],
  ['rfoot', 'Right Foot'],
  ['lknee', 'Left Knee'],
  ['rknee', 'Right Knee'],
  ['waist', 'Waist'],
  ['chest', 'Chest'],
] as const;

function steamVrVariables(): Record<string, VrcoscVariable> {
  const variables: Record<string, VrcoscVariable> = {
    fps: variable('float', 'FPS', 'vr_fps'),
    dashboardvisible: variable('bool', 'Dashboard Visible'),
  };
  const canonicalBattery: Partial<Record<string, VrcoscVariable['canonical']>> = {
    hmd: 'hmd_battery',
    lhand: 'left_controller_battery',
    rhand: 'right_controller_battery',
  };
  for (const [role, display] of STEAMVR_ROLES) {
    variables[`${role}_charging`] = variable('bool', `${display} Charging`);
    variables[`${role}_battery`] = variable(
      'int',
      `${display} Battery (%)`,
      canonicalBattery[role],
    );
  }
  variables['trackeraveragebattery'] = variable(
    'int',
    'Average Tracker Battery (%)',
    'tracker_average_battery',
  );
  variables['trackerlowestrole'] = variable('string', 'Lowest Tracker Role', 'tracker_lowest_name');
  variables['trackerlowestbattery'] = variable(
    'int',
    'Lowest Tracker Battery (%)',
    'tracker_lowest_battery',
  );
  return variables;
}

/** Official modules that register ChatBox states/events/variables (`vrcosc-format.md` §6). */
export const OFFICIAL_MODULES: readonly VrcoscModule[] = [
  official('mediamodule', 'Media', {
    mainState: 'playing',
    states: MEDIA_STATES,
    events: MEDIA_EVENTS,
    variables: {
      title: variable('string', 'Title', 'title'),
      subtitle: variable('string', 'Subtitle'),
      genres: variable('string', 'Genres'),
      artist: variable('string', 'Artist', 'artist'),
      artisttitle: variable('string', 'Artist + Title'),
      time: variable('timespan', 'Current Time', 'position'),
      timeremaining: variable('timespan', 'Time Remaining', 'remaining'),
      duration: variable('timespan', 'Duration', 'duration'),
      volume: variable('int', 'Volume', 'volume'),
      tracknumber: variable('int', 'Track Number'),
      albumtitle: variable('string', 'Album Title', 'album'),
      albumartist: variable('string', 'Album Artist'),
      albumtrackcount: variable('int', 'Album Track Count'),
      progressvisual: variable('progress', 'Progress Visual', 'progress_bar'),
    },
    settings: { playoninstancetransfer: false },
  }),
  official('datetimemodule', 'DateTime', {
    mainState: 'default',
    states: { default: state('Default', '{0}', ['now']) },
    events: {},
    variables: { now: variable('datetime', 'Now', 'time') },
    settings: {
      smoothsecond: true,
      smoothminute: true,
      smoothhour: true,
      mode: false,
      timezone: '',
    },
  }),
  official('hardwarestatsmodule', 'Hardware Stats', {
    mainState: 'default',
    states: {
      default: state('Default', 'CPU: {0}% | GPU: {1}%\nRAM: {2}GB/{3}GB', [
        'cpuusage',
        'gpuusage',
        'ramused',
        'ramtotal',
      ]),
    },
    events: {},
    variables: HARDWARE_VARIABLES,
    settings: { selectedcpu: 0, selectedgpu: 0 },
  }),
  official('pulsoidmodule', 'Pulsoid', {
    mainState: 'connected',
    states: HEARTRATE_STATES,
    events: {},
    variables: HEARTRATE_VARIABLES,
    settings: { ...HEARTRATE_SETTINGS, accesstoken: '' },
  }),
  official('hyperatemodule', 'HypeRate', {
    mainState: 'connected',
    states: HEARTRATE_STATES,
    events: {},
    variables: HEARTRATE_VARIABLES,
    settings: { ...HEARTRATE_SETTINGS, id: '' },
  }),
  official('weathermodule', 'Weather', {
    mainState: 'default',
    states: {
      default: state('Default', 'Local Weather\n{0}\n{1}C - {2}F', ['condition', 'tempc', 'tempf']),
    },
    events: {},
    variables: {
      tempc: variable('float', 'Temp C', 'weather_temp'),
      tempf: variable('float', 'Temp F', 'weather_temp'),
      humidity: variable('int', 'Humidity', 'weather_humidity'),
      condition: variable('string', 'Condition', 'weather_condition'),
    },
    settings: { location: '' },
  }),
  official('afkdetectionmodule', 'AFK Detection', {
    mainState: 'notafk',
    states: {
      notafk: state('Not AFK', ''),
      afk: state('AFK', 'AFK for {0}', ['duration']),
    },
    events: {
      afkstopped: event('AFK Stopped', 'AFK has ended'),
      afkstarted: event('AFK Started', 'AFK has begun'),
    },
    variables: {
      duration: variable('timespan', 'Duration', 'afk_duration'),
      starttime: variable('datetime', 'Start Time'),
    },
    settings: { source: 0, managevrchatwindow: false },
  }),
  official('clientinfomodule', 'Client Info', {
    mainState: 'default',
    states: { default: state('Default', 'FPS: {0}', ['fps']) },
    events: {},
    variables: {
      instancecount: variable('int', 'Instance Count', 'vrc_player_count'),
      fps: variable('int', 'FPS', 'fps'),
    },
    settings: {},
  }),
  official('steamvrstatisticsmodule', 'SteamVR Stats', {
    mainState: 'default',
    states: {
      default: state('Default', 'HMD: {0}\nLHand: {1}\nRHand: {2}\nTrackers: {3}', [
        'hmd_battery',
        'lhand_battery',
        'rhand_battery',
        'trackeraveragebattery',
      ]),
    },
    events: {},
    variables: steamVrVariables(),
    settings: {},
  }),
  official('speechtotextmodule', 'Speech To Text', {
    mainState: 'default',
    states: { default: state('Default', '') },
    events: {
      result: event('On Speech Result', '{0}', ['text'], { showTyping: true, length: 10 }),
    },
    variables: { text: variable('string', 'Text', 'speech_text') },
    settings: { listencriteria: 0 },
  }),
  official('stopwatchmodule', 'Stopwatch', {
    mainState: 'started',
    states: {
      started: state('Started', '{0}', ['currenttime']),
      paused: state('Paused', '{0}', ['currenttime']),
      stopped: state('Stopped', ''),
    },
    events: {},
    variables: { currenttime: variable('timespan', 'Current Time', 'timer') },
    settings: { smoothsecond: true, smoothminute: true },
  }),
  official('countermodule', 'Counter', {
    mainState: 'default',
    states: { default: state('Default', '') },
    // Variables and events are created per counter at runtime (`{guid}_value`, ...).
    events: {},
    variables: {},
    settings: {},
  }),
];
