import { describe, expect, it } from 'vitest';
import { createDefaultProfile } from '../model/profile';
import { nativeCodec } from './native';
import { CodecRegistry, UnknownFormatError } from './registry';

describe('CodecRegistry', () => {
  const registry = new CodecRegistry([nativeCodec]);

  it('detects and converts', () => {
    const files = nativeCodec.serialize(createDefaultProfile()).files;
    expect(registry.detect(files)[0]?.codec.id).toBe('native');
    const result = registry.convert(files, 'native');
    expect(result.source).toBe('native');
    expect(result.files[0]?.content).toBe(files[0]?.content);
  });

  it('throws for unknown input', () => {
    expect(() => registry.parse([{ path: 'a.txt', content: 'hello' }])).toThrow(UnknownFormatError);
  });
});
