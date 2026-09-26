import { describe, expect, it } from 'vitest';
import { isPlaceholderName, PLACEHOLDER_NAMES } from '../../model/placeholders';
import { placeholdersIn, unknownPlaceholdersIn } from '../../model/template';
import { matchBoxLine, renderBoxLine } from './box';
import {
  BOX_CUSTOM_TEMPLATE,
  BOX_PRESETS,
  CANONICAL_TO_DREAM,
  DREAM_TO_CANONICAL,
  PLUGIN_TOKENS,
} from './catalog';
import { canonicalToDream, dreamToCanonical, stripStyles } from './tokens';

const ctx = { lyricsPrefix: '♪', ramType: 'DDR5' };

describe('token catalog', () => {
  it('maps every Dream snippet onto canonical placeholders only', () => {
    for (const [token, snippet] of Object.entries(DREAM_TO_CANONICAL)) {
      expect(unknownPlaceholdersIn(snippet), token).toEqual([]);
      expect(token).toBe(token.toLowerCase());
    }
  });

  it('maps canonical names onto Dream tokens that convert back to the same category', () => {
    for (const [name, target] of Object.entries(CANONICAL_TO_DREAM)) {
      expect(isPlaceholderName(name)).toBe(true);
      const back = DREAM_TO_CANONICAL[target.token];
      expect(back, `${name} → ${target.token}`).toBeDefined();
    }
    expect(PLACEHOLDER_NAMES.filter((n) => CANONICAL_TO_DREAM[n] === undefined)).toEqual([
      'vr_target_hz',
      'vr_reprojection',
      'vr_dropped_frames',
      'soundpad_sound',
      'voicemod_voice',
      'voicemod_sound',
    ]);
  });

  it('has the documented alias table', () => {
    const cases: [string, string][] = [
      ['{text}', '{status}'],
      ['{text_3}', '{status}'],
      ['{text_t2_4}', '{status}'],
      ['{Text_Template3}', '{status}'],
      ['{Song}', '{title}'],
      ['{time}', '{position}/{duration}'],
      ['{time_status}/{length}', '{position}/{duration}'],
      ['{songbar}', '{progress_bar}'],
      ['{liedtext}', '{lyrics}'],
      ['{lyrics_prefix} {lyrics}', '♪ {lyrics}'],
      ['{icon_sound}', '🎵'],
      ['{gpu_watts}', '{gpu_power}'],
      ['{vram}', '{vram_used}/{vram_total}'],
      ['{vram_pct}', '{vram_usage}'],
      ['{ram} {ram_type}', '{ram_used}/{ram_total} DDR5'],
      ['{ram_pct}', '{ram_usage}'],
      ['{cpu_temperature} {temp_icon}', '{cpu_temp}'],
      ['{icon_flame}', '🔥'],
      ['{stt_input} -> {stt_output}', '{speech_text} -> {translation}'],
      ['{2wayin}', '{2wayin}'],
      ['{box_clock}', '{time}'],
      ['{afk_time}', '{afk_duration}'],
      ['{player_in_world} {players}', '{vrc_player_count} {vrc_player_count}'],
      ['{world} {group_world}', '{vrc_world} {vrc_world}'],
      ['{instance}', '{vrc_instance_type}'],
      ['{realtime} {clock} {life_stats_realtime}', '{time} {time} {time}'],
      ['{realdate}', '{date}'],
      ['{album} {remaining} {progress_percent}', '{album} {remaining} {progress_percent}'],
      [
        '{weather} {heartrate_trend} {file_text_2}',
        '{weather_emoji} {weather_temp} {heartrate_trend} {file_text}',
      ],
      ['{vrc_region} {vrc_master} {hmd_battery_bar}', '{vrc_region} {vrc_master} {hmd_battery}'],
      [
        '{net_utilization} {twitch_live} {discord_count}',
        '{net_utilization} {twitch_live} {discord_count}',
      ],
      ['{fps} {world_stats_fps}', '{fps} {fps}'],
      ['{hmd_battery}', '{hmd_battery}'],
      ['{controller_battery}', 'L {left_controller_battery} R {right_controller_battery}'],
      ['{tracker_battery}', '{tracker_lowest_battery}'],
      ['{hw_cpu_usage} {hw_gpu_temp} {hw_ram_used}', '{cpu_usage} {gpu_temp} {ram_used}'],
      ['{hw_net_rx}/{hw_net_tx}', '{net_down}/{net_up}'],
      ['{hw_window} {hw_vr_mode}', '{window_title} {device_mode}'],
      ['{md_title} {md_artist} {md_progress}', '{title} {artist} {progress_bar}'],
      ['{xr_mode}', '{device_mode}'],
      ['{s_name} {s_viewer} {s_status}', '{twitch_channel} {twitch_viewers} {twitch_title}'],
      [
        '{sm_discord} {sm_guild} {sm_channel}',
        '{discord_channel} {discord_channel} {discord_channel}',
      ],
      ['{sm_tiktok}', '{tiktok_host}'],
      ['{gg-fps}', '{fps}'],
      ['a \\n b', 'a\nb'],
    ];
    for (const [dream, canonical] of cases) {
      expect(dreamToCanonical(dream, ctx).template, dream).toBe(canonical);
    }
  });

  it('reports unknown tokens and stripped styles', () => {
    const result = dreamToCanonical('{sup}{gpu_usage}{/sup} {super/"vram"} _"raw"_ {mystery}', ctx);
    expect(result.template).toBe('{gpu_usage} vram raw {mystery}');
    expect(result.unknown).toEqual(['mystery']);
    expect(result.strippedStyles).toBe(true);
    expect(stripStyles('{subscript/{cpu_temp}}')).toBe('{cpu_temp}');
  });

  it('converts canonical templates to Dream tokens and reports plugins/losses', () => {
    const result = canonicalToDream(
      '{status}\n{artist} - {title} {position}/{duration} {ram_used}/{ram_total} {vram_used} {fps} {heartrate} {voicemod_voice} {twitch_viewers}',
    );
    expect(result.template).toBe(
      '{text} \\n {artist} - {title} {time} {ram_usage} {hw_vram_used} {fps} {heartrate} {s_viewer}',
    );
    expect([...result.plugins]).toEqual([
      'vrcosc_modules',
      'world_stats',
      'life_stats',
      'stream_stats',
    ]);
    expect(result.dropped).toEqual(['voicemod_voice']);
    expect(canonicalToDream('{time} {date} {album}').template).toBe(
      '{realtime} {realdate} {album}',
    );
    expect([...canonicalToDream('{time}').plugins]).toEqual(['life_stats']);
    expect(
      canonicalToDream('L {left_controller_battery} R {right_controller_battery}').template,
    ).toBe('{controller_battery}');
  });

  it('round-trips every plugin token through canonical and back to a Dream token', () => {
    for (const table of Object.values(PLUGIN_TOKENS)) {
      for (const snippet of Object.values(table)) {
        const back = canonicalToDream(snippet);
        for (const name of placeholdersIn(snippet)) {
          expect(CANONICAL_TO_DREAM[name], name).toBeDefined();
        }
        expect(back.dropped).toEqual([]);
      }
    }
  });
});

describe('box frames', () => {
  const double = BOX_PRESETS[2];
  const rule = BOX_PRESETS[6];
  const custom = { tl: '‹', tf: '·', tr: '›', bl: '‹', bf: '·', br: '›' };

  it('renders like core/boxstyle.build_line', () => {
    expect(double).toBeDefined();
    expect(rule).toBeDefined();
    if (double === undefined || rule === undefined) {
      return;
    }
    expect(renderBoxLine(double, 'top', 7, '')).toBe('╔═══════╗');
    expect(renderBoxLine(double, 'top', 6, '18:01')).toBe('╔═══ 18:01 ═══╗');
    expect(renderBoxLine(double, 'bottom', 3, 'OSC-DreamChatbox')).toBe('╚═ OSC-DreamChatbox ═╝');
    expect(renderBoxLine(rule, 'top', 4, '')).toBe('▔▔▔▔');
    expect(renderBoxLine(rule, 'bottom', 2, 'x')).toBe('▁ x ▁');
    expect(renderBoxLine(custom, 'top', 0, 'hi')).toBe('‹ hi ›');
  });

  it('recognises rendered lines again', () => {
    expect(matchBoxLine('╔═══ {time} ═══╗', 'top', custom)).toEqual({
      template: 2,
      frame: double,
      width: 6,
      middle: '{time}',
    });
    expect(matchBoxLine('└───┘', 'bottom', custom)).toMatchObject({
      template: 0,
      width: 3,
      middle: '',
    });
    expect(matchBoxLine('▔▔▔▔', 'top', custom)).toMatchObject({ template: 6, width: 4 });
    expect(matchBoxLine('‹·· hi ··›', 'top', custom)).toMatchObject({
      template: BOX_CUSTOM_TEMPLATE,
      width: 4,
      middle: 'hi',
    });
    expect(matchBoxLine('just text', 'top', custom)).toBeUndefined();
    expect(matchBoxLine('', 'top', custom)).toBeUndefined();
  });
});
