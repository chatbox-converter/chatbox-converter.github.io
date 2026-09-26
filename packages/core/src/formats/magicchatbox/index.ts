import type { FormatCodec } from '../codec';

// Stub replaced by the real implementation.
export const magicchatboxCodec: FormatCodec = {
  id: 'magicchatbox',
  name: 'magicchatbox',
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
