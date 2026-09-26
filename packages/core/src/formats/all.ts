import { dreamchatboxCodec } from './dreamchatbox';
import { magicchatboxCodec } from './magicchatbox';
import { nativeCodec } from './native';
import { CodecRegistry } from './registry';
import { vrcoscCodec } from './vrcosc';

export const ALL_CODECS = [magicchatboxCodec, vrcoscCodec, dreamchatboxCodec, nativeCodec] as const;

export function createDefaultRegistry(): CodecRegistry {
  return new CodecRegistry(ALL_CODECS);
}
