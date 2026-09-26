/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDefaultProfile, type FormatId } from '../model/profile';
import { ALL_CODECS, createDefaultRegistry } from './all';
import type { ConfigFile } from './codec';

const here = new URL('.', import.meta.url).pathname;

function filesUnder(dir: string): ConfigFile[] {
  const out: ConfigFile[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(
        ...filesUnder(full).map((f) => ({ path: `${entry}/${f.path}`, content: f.content })),
      );
    } else if (entry.endsWith('.json')) {
      out.push({ path: relative(dir, full), content: readFileSync(full, 'utf8') });
    }
  }
  return out;
}

/** Every fixture set of every codec, as a user would upload it. */
const FIXTURE_SETS: readonly {
  readonly format: FormatId;
  readonly name: string;
  readonly files: ConfigFile[];
}[] = [
  {
    format: 'magicchatbox',
    name: 'folder',
    files: filesUnder(join(here, 'magicchatbox/fixtures')).filter(
      (f) => !f.path.includes('.v1.') && !f.path.includes('.empty.'),
    ),
  },
  ...filesUnder(join(here, 'dreamchatbox/fixtures')).map((f) => ({
    format: 'dreamchatbox' as const,
    name: f.path,
    files: [{ ...f, path: 'config.json' }],
  })),
  {
    format: 'vrcosc',
    name: 'two-clips',
    files: [
      {
        path: 'chatbox.json',
        content: readFileSync(join(here, 'vrcosc/fixtures/two-clips.json'), 'utf8'),
      },
    ],
  },
  {
    format: 'vrcosc',
    name: 'compound+modules',
    files: [
      {
        path: 'chatbox.json',
        content: readFileSync(join(here, 'vrcosc/fixtures/compound.json'), 'utf8'),
      },
      ...filesUnder(join(here, 'vrcosc/fixtures/modules')).map((f) => ({
        ...f,
        path: `modules/${f.path}`,
      })),
    ],
  },
];

describe('cross-format conversion', () => {
  const registry = createDefaultRegistry();

  for (const set of FIXTURE_SETS) {
    it(`detects ${set.format}/${set.name}`, () => {
      expect(registry.detect(set.files)[0]?.codec.id).toBe(set.format);
    });

    for (const target of ALL_CODECS) {
      it(`converts ${set.format}/${set.name} → ${target.id}`, () => {
        const result = registry.convert(set.files, target.id, set.format);
        expect(result.files.length).toBeGreaterThan(0);
        for (const file of result.files) {
          expect(file.content.length).toBeGreaterThan(2);
          expect(() => {
            JSON.parse(file.content);
          }).not.toThrow();
        }
        expect(result.diagnostics.some((d) => d.level === 'error')).toBe(false);
        // Whatever we wrote must be readable by the same codec again.
        const reparsed = target.parse(result.files);
        expect(reparsed.profile.segments.length).toBeGreaterThanOrEqual(0);
      });
    }
  }

  it('round-trips the default profile through every format without errors', () => {
    const profile = createDefaultProfile();
    for (const codec of ALL_CODECS) {
      const out = codec.serialize(profile);
      expect(out.diagnostics.some((d) => d.level === 'error')).toBe(false);
      const back = codec.parse(out.files).profile;
      expect(back.segments.length).toBeGreaterThan(0);
    }
  });
});
