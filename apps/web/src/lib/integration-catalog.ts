import type { SegmentKind } from '@chatbox-converter/core';

export interface IntegrationInfo {
  readonly kind: SegmentKind;
  readonly title: string;
  readonly description: string;
  /** Icon file under /icons (MagicChatbox's own icon art, used with permission). */
  readonly icon: string;
  /** Only shown while in VR; no desktop/VR route chips. */
  readonly vrOnly: boolean;
  /** Several segments of this kind make sense (e.g. two custom lines). */
  readonly allowMultiple: boolean;
  /** Which Options section the CUSTOMIZE › door opens. */
  readonly optionsSection: string;
}

/** Card copy follows MagicChatbox 0.9.226; kinds it lacks get their own wording. */
export const INTEGRATIONS: readonly IntegrationInfo[] = [
  {
    kind: 'status',
    title: 'Personal status',
    description:
      'Say whatever you want. Save a pile of messages, cycle them, and drop to AFK when you wander off.',
    icon: '/icons/PersonalMsg_ico.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'status',
  },
  {
    kind: 'window',
    title: 'Window activity',
    description:
      'VR or desktop, and what you’re buried in. Mark any app private and it stays your business.',
    icon: '/icons/WindowActivity_ico.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'window',
  },
  {
    kind: 'twitch',
    title: 'Twitch',
    description:
      'Live status, viewers and category, plus shoutouts and announcements you can fire off without leaving VR.',
    icon: '/icons/Twitch_ico.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'twitch',
  },
  {
    kind: 'tiktok',
    title: 'TikTok',
    description:
      'Follower counts on their own, or go LIVE for follows and gifts landing in real time. Run either, or both.',
    icon: '/icons/TikTok_ico.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'tiktok',
  },
  {
    kind: 'discord',
    title: 'Discord',
    description:
      'Who’s talking in your voice channel, and your VRChat world on your Discord profile if you want it.',
    icon: '/icons/Discord_ico.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'discord',
  },
  {
    kind: 'media',
    title: 'Music',
    description:
      'Whatever’s playing on your PC: Spotify, YouTube, a browser tab. Title, artist, progress and a bar if you like.',
    icon: '/icons/MediaLink_ico.png',
    vrOnly: false,
    allowMultiple: true,
    optionsSection: 'media',
  },
  {
    kind: 'lyrics',
    title: 'Lyrics',
    description: 'The lyric line as it is sung, riding along with whatever music you are showing.',
    icon: '/icons/spotify_ico.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'lyrics',
  },
  {
    kind: 'vrchat',
    title: 'VRChat Radar',
    description:
      'Reads VRChat’s own log: where you are, who came and went, and every photo you took.',
    icon: '/icons/VRCRadar_ico.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'vrchat',
  },
  {
    kind: 'heartrate',
    title: 'Heart Rate',
    description:
      'Your pulse, live in the chatbox. Pulsoid, HypeRate or a Bluetooth strap, depending on the app.',
    icon: '/icons/HeartRate_ico.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'heartrate',
  },
  {
    kind: 'hardware',
    title: 'Component stats',
    description:
      'Load, temps, wattage and clocks for your CPU, GPU, RAM and VRAM. Settle the specs question for good.',
    icon: '/icons/ComponentStats_ico.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'hardware',
  },
  {
    kind: 'vr_performance',
    title: 'VR performance',
    description:
      'Frames, reprojection and headroom from SteamVR. Stays quiet until something actually goes wrong.',
    icon: '/icons/vr-performance.png',
    vrOnly: true,
    allowMultiple: false,
    optionsSection: 'vr_performance',
  },
  {
    kind: 'vr_battery',
    title: 'VR gear battery',
    description:
      'Headset, controllers and trackers. Catch the one that’s about to die before it takes your legs with it.',
    icon: '/icons/VR_bat_ico.png',
    vrOnly: true,
    allowMultiple: false,
    optionsSection: 'vr_battery',
  },
  {
    kind: 'network',
    title: 'Network stats',
    description:
      'Live up and down speeds, session peaks and totals. Proof it’s the world lagging, not you.',
    icon: '/icons/NetworkStats_ico.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'network',
  },
  {
    kind: 'weather',
    title: 'Weather',
    description:
      'Conditions where you actually are: temperature, feels-like, wind and humidity, tucked in beside your clock.',
    icon: '/icons/Weather_ico.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'weather',
  },
  {
    kind: 'time',
    title: 'Time',
    description:
      'Your local time and zone. Ends the “wait, what time is it for you?” question forever.',
    icon: '/icons/SystemTime_ico.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'time',
  },
  {
    kind: 'soundpad',
    title: 'Soundpad',
    description:
      'Shows the clip you just played, so the room knows exactly who did that. Quiet when nothing’s playing.',
    icon: '/icons/Soundpad.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'soundpad',
  },
  {
    kind: 'voicemod',
    title: 'Voicemod',
    description:
      'Every voice and sound in Voicemod, driven from here. Pin the ones you use and they stay one click away.',
    icon: '/icons/Voicemod.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'voicemod',
  },
  {
    kind: 'speech',
    title: 'Speech to text',
    description: 'What you say, typed out for the room, with a translation if the app can do one.',
    icon: '/icons/SpeechToText.png',
    vrOnly: false,
    allowMultiple: false,
    optionsSection: 'speech',
  },
  {
    kind: 'custom',
    title: 'Custom line',
    description:
      'Free text with any placeholder you like. Handy for a timer, a file, or a mix nothing else covers.',
    icon: '/icons/Wand_ico.png',
    vrOnly: false,
    allowMultiple: true,
    optionsSection: 'custom',
  },
];

const BY_KIND = new Map(INTEGRATIONS.map((info) => [info.kind, info]));

export function integrationInfo(kind: SegmentKind): IntegrationInfo {
  const info = BY_KIND.get(kind);
  if (info === undefined) {
    throw new Error(`No integration card defined for segment kind "${kind}".`);
  }
  return info;
}
