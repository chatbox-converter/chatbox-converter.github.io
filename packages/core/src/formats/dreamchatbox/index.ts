import type { FormatCodec } from '../codec';

// Stub replaced by the real implementation.
export const dreamchatboxCodec: FormatCodec = {
  id: 'dreamchatbox',
  name: 'dreamchatbox',
  configLocation: '',
  expectedFiles: [],
  detect: () => 0,
  parse: () => {
    throw new Error('Not implemented.');
  },
  serialize: () => {
    throw new Error('Not implemented.');
  },
};
