import { describe, expect, it } from 'vitest';
import { PLACEHOLDER_NAMES } from '../model/placeholders';
import { placeholderCoverage } from './coverage';
import { PLUGIN_IDS } from './dreamchatbox/catalog';
import { BUILT_IN_VARIABLES, MODULES } from './vrcosc/catalog';

describe('placeholderCoverage', () => {
  const coverage = placeholderCoverage();

  it('lists every placeholder exactly once, in vocabulary order', () => {
    expect(coverage.map((entry) => entry.name)).toEqual([...PLACEHOLDER_NAMES]);
  });

  it('references only existing VRCOSC modules and variables', () => {
    for (const entry of coverage) {
      for (const provider of entry.providers.filter((p) => p.app === 'vrcosc')) {
        if (provider.kind === 'builtin') {
          expect(Object.hasOwn(BUILT_IN_VARIABLES, provider.detail), provider.detail).toBe(true);
          continue;
        }
        const module = MODULES.find((candidate) => candidate.title === provider.name);
        expect(module, `${entry.name}: ${provider.name}`).toBeDefined();
        expect(Object.hasOwn(module?.variables ?? {}, provider.detail)).toBe(true);
        expect(provider.repository).toBe(module?.repository);
        expect(provider.kind).toBe(module?.official === true ? 'official' : 'community');
        if (module?.mainState === undefined) {
          expect(provider.note).toContain('no ChatBox states');
        }
      }
    }
  });

  it('describes the converter-side aliases', () => {
    const byName = new Map(coverage.map((entry) => [entry.name, entry]));
    const vrc = (name: (typeof PLACEHOLDER_NAMES)[number]): readonly string[] =>
      (byName.get(name)?.providers ?? [])
        .filter((p) => p.app === 'vrcosc')
        .map((p) => `${p.name}:${p.detail}:${p.note ?? ''}`);
    expect(vrc('date').some((p) => p.startsWith('DateTime:now:') && p.includes('yyyy-MM-dd'))).toBe(
      true,
    );
    expect(vrc('timezone').some((p) => p.includes('offset only'))).toBe(true);
    expect(vrc('progress_percent').some((p) => p.includes('use_visual:false'))).toBe(true);
    expect(vrc('play_icon').some((p) => p.includes('literal ▶/⏸/⏹'))).toBe(true);
    expect(vrc('translation').some((p) => p.includes('translated app-side'))).toBe(true);
    expect(vrc('status').some((p) => p.startsWith('Built-in:text:'))).toBe(true);
  });

  it('marks DreamChatbox plugin tokens', () => {
    const fps = coverage.find((entry) => entry.name === 'fps');
    const dream = fps?.providers.filter((p) => p.app === 'dreamchatbox') ?? [];
    expect(dream).toEqual([
      {
        app: 'dreamchatbox',
        kind: 'plugin',
        name: 'world_stats',
        detail: '{fps}',
        note: 'requires the world_stats plugin',
      },
    ]);
    for (const entry of coverage) {
      for (const p of entry.providers.filter((q) => q.app === 'dreamchatbox')) {
        expect(p.detail).toMatch(/^\{[a-z_]+\}$/);
        if (p.kind === 'plugin') {
          expect((PLUGIN_IDS as readonly string[]).includes(p.name)).toBe(true);
        } else {
          expect(p.kind).toBe('builtin');
        }
      }
    }
  });

  it('uses MagicChatbox integration titles and tokens or settings keys', () => {
    const artist = coverage.find((entry) => entry.name === 'artist');
    const mcb = artist?.providers.filter((p) => p.app === 'magicchatbox') ?? [];
    expect(mcb.map((p) => `${p.name} ${p.detail}`)).toEqual([
      'Spotify {artist}',
      'MediaLink IntgrScanMediaLink',
    ]);
    const bpm = coverage.find((entry) => entry.name === 'heartrate_avg');
    expect(bpm?.providers.some((p) => p.detail === 'ShowAverageHeartRate')).toBe(true);
  });
});
