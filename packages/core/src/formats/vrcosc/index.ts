import type { FormatCodec } from '../codec';

// Stub replaced by the real implementation.
export const vrcoscCodec: FormatCodec = {
  id: 'vrcosc',
  name: 'vrcosc',
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
