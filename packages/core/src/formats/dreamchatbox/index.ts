import type { FormatCodec } from '../codec';
import { detectDream, parseDream } from './parse';
import { serializeDream } from './serialize';

/**
 * OSC-DreamChatbox: `config.json`, `profiles/<name>.json` and the v1.5.7+
 * single-file export `<name>.dcbprofile.json` (Options › General › Profiles).
 * The format reference is `.references/notes/dreamchatbox-format.md`; the
 * model ↔ key mapping is documented in `MAPPING.md` next to this file.
 */
export const dreamchatboxCodec: FormatCodec = {
  id: 'dreamchatbox',
  name: 'OSC-DreamChatbox',
  configLocation:
    'Options › General › Profiles › Export (<name>.dcbprofile.json) · or Linux: ~/.config/OSC-DreamChatbox/config.json · Windows: %APPDATA%\\OSC-DreamChatbox\\config.json (profiles in profiles/<name>.json next to it)',
  expectedFiles: ['*.dcbprofile.json', 'config.json', 'profiles/*.json'],
  detect: detectDream,
  parse: parseDream,
  serialize: serializeDream,
};
