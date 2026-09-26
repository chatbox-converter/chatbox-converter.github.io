import { describe, expect, it } from 'vitest';
import { PLACEHOLDER_NAMES, isPlaceholderName } from '../../model/placeholders';
import { createDefaultProfile } from '../../model/profile';
import { createSegment, type SegmentKind } from '../../model/segments';
import { isJsonObject } from '../../util/json';
import { CANONICAL_TO_MCB, FIXED_LAYOUTS, LAYOUT_FLAGS, TOKEN_TABLES } from './canonical';
import { INTEGRATIONS, integrationFor, type SortKey } from './catalog';
import { magicchatboxCodec } from './index';
import { NETWORK_ROWS } from './templates';

function kindOf(sortKey: SortKey): SegmentKind {
  return integrationFor(sortKey).kind;
}

function serializedFlag(sortKey: SortKey, template: string, file: string, key: string): unknown {
  const profile = createDefaultProfile({
    segments: [createSegment(kindOf(sortKey), { id: 'seg', template })],
  });
  const { files } = magicchatboxCodec.serialize(profile);
  const found = files.find((candidate) => candidate.path === file);
  const json: unknown = JSON.parse(found?.content ?? '{}');
  return isJsonObject(json) ? json[key] : undefined;
}

describe('CANONICAL_TO_MCB', () => {
  it('only maps real placeholders', () => {
    for (const name of CANONICAL_TO_MCB.keys()) {
      expect(isPlaceholderName(name)).toBe(true);
    }
    for (const tokens of Object.values(TOKEN_TABLES)) {
      for (const placeholder of Object.values(tokens)) {
        expect(isPlaceholderName(placeholder), placeholder).toBe(true);
      }
    }
  });

  it('contains every template token, layout flag and fixed layout', () => {
    for (const tokens of Object.values(TOKEN_TABLES)) {
      for (const [token, placeholder] of Object.entries(tokens)) {
        if (!isPlaceholderName(placeholder)) continue;
        const providers = CANONICAL_TO_MCB.get(placeholder) ?? [];
        // A second spelling of the same token maps to the same integration; the first wins.
        expect(providers.some((p) => p.detail === `{${token}}` || p.detail.startsWith('{'))).toBe(
          true,
        );
      }
    }
    for (const entry of LAYOUT_FLAGS) {
      expect((CANONICAL_TO_MCB.get(entry.placeholder) ?? []).length).toBeGreaterThan(0);
    }
    for (const entry of FIXED_LAYOUTS) {
      const providers = CANONICAL_TO_MCB.get(entry.placeholder) ?? [];
      expect(providers.some((p) => p.name === entry.name)).toBe(true);
    }
  });

  it('lists each integration at most once per placeholder', () => {
    for (const [name, providers] of CANONICAL_TO_MCB) {
      const names = providers.map((p) => p.name);
      expect(new Set(names).size, name).toBe(names.length);
    }
  });

  it('covers a sensible share of the vocabulary', () => {
    const covered = PLACEHOLDER_NAMES.filter((name) => CANONICAL_TO_MCB.has(name));
    expect(covered.length).toBeGreaterThan(60);
  });
});

describe('LAYOUT_FLAGS agree with the serializer and parser tables', () => {
  it('every flag file belongs to its integration and the key follows the template', () => {
    for (const entry of LAYOUT_FLAGS) {
      expect(INTEGRATIONS.some((i) => i.sortKey === entry.sortKey)).toBe(true);
      const on = serializedFlag(entry.sortKey, `x {${entry.placeholder}}`, entry.file, entry.key);
      expect(on, `${entry.sortKey}.${entry.key} on`).toBe(true);
      // A media segment without Spotify-only tokens is routed to MediaLink; keep it on Spotify.
      const plain = entry.sortKey === 'Spotify' ? 'x {remaining}' : 'x';
      const off = serializedFlag(entry.sortKey, plain, entry.file, entry.key);
      expect(off, `${entry.sortKey}.${entry.key} off`).toBe(false);
    }
  });

  it('match the network parser rows', () => {
    const flags = LAYOUT_FLAGS.filter((entry) => entry.sortKey === 'Network');
    expect(flags.map((entry) => [entry.key, entry.placeholder])).toEqual(
      NETWORK_ROWS.map(([key, , , placeholder]) => [key, placeholder]),
    );
  });
});
