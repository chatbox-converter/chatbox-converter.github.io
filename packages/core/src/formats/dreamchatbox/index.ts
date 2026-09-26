import type { FormatCodec } from '../codec';
import { detectDream, parseDream } from './parse';
import { serializeDream } from './serialize';

/**
 * OSC-DreamChatbox (`config.json` + `profiles/<name>.json`). The format
 * reference is `.references/notes/dreamchatbox-format.md`; the model ↔ key
 * mapping is documented in `MAPPING.md` next to this file.
 */
export const dreamchatboxCodec: FormatCodec = {
  id: 'dreamchatbox',
  name: 'OSC-DreamChatbox',
  configLocation:
    'Linux: ~/.config/OSC-DreamChatbox/config.json · Windows: %APPDATA%\\OSC-DreamChatbox\\config.json (profiles in profiles/<name>.json next to it)',
  expectedFiles: ['config.json', 'profiles/*.json'],
  detect: detectDream,
  parse: parseDream,
  serialize: serializeDream,
};
