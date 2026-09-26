import { createSegment } from '@chatbox-converter/core';
import { describe, expect, it } from 'vitest';
import { groupSegments, parseOptionsHash, sectionKeyForTarget } from './options-layout';

describe('parseOptionsHash', () => {
  it('reads section and segment from the query part of the hash', () => {
    expect(parseOptionsHash('#/options?section=media&segment=abc')).toEqual({
      section: 'media',
      segment: 'abc',
    });
    expect(parseOptionsHash('#/options?section=status')).toEqual({
      section: 'status',
      segment: null,
    });
  });

  it('returns null without a section', () => {
    expect(parseOptionsHash('#/options')).toBeNull();
    expect(parseOptionsHash('#/options?section=')).toBeNull();
  });
});

describe('sectionKeyForTarget', () => {
  const media1 = createSegment('media', { id: 'm1' });
  const media2 = createSegment('media', { id: 'm2' });

  it('prefers the named segment, then the first of that kind', () => {
    expect(sectionKeyForTarget({ section: 'media', segment: 'm2' }, [media1, media2])).toBe(
      'segment:m2',
    );
    expect(sectionKeyForTarget({ section: 'media', segment: null }, [media1, media2])).toBe(
      'segment:m1',
    );
    expect(sectionKeyForTarget({ section: 'time', segment: null }, [media1])).toBeNull();
  });

  it('maps the fixed sections onto themselves', () => {
    expect(sectionKeyForTarget({ section: 'status', segment: null }, [])).toBe('status');
    expect(sectionKeyForTarget({ section: 'osc', segment: null }, [])).toBe('osc');
  });
});

describe('groupSegments', () => {
  it('keeps MagicChatbox group order and drops empty groups and the status segment', () => {
    const groups = groupSegments([
      createSegment('status'),
      createSegment('custom'),
      createSegment('time'),
    ]);
    expect(groups.map((group) => group.title)).toEqual(['On screen', 'Voice and more']);
  });
});
