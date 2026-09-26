import { describe, expect, it } from 'vitest';
import { createDefaultProfile } from '../../model/profile';
import { createSegment } from '../../model/segments';
import { ConfigParseError } from '../codec';
import { nativeCodec } from './index';

describe('nativeCodec', () => {
  it('round-trips a profile exactly', () => {
    const profile = createDefaultProfile({
      segments: [createSegment('media', { id: 'm' }), createSegment('custom', { id: 'c' })],
    });
    const { files } = nativeCodec.serialize(profile);
    expect(files).toHaveLength(1);
    expect(nativeCodec.detect(files)).toBe(1);
    expect(nativeCodec.parse(files).profile).toEqual(profile);
  });

  it('rejects invalid profiles with a path', () => {
    const files = [
      { path: 'chatbox-profile.json', content: '{"version":1,"segments":[],"statuses":[]}' },
    ];
    expect(() => nativeCodec.parse(files)).toThrow(ConfigParseError);
    expect(nativeCodec.detect([{ path: 'x.json', content: '{"a":1}' }])).toBe(0);
    expect(nativeCodec.detect([{ path: 'x.json', content: 'not json' }])).toBe(0);
  });
});
