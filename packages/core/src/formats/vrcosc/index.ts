import type { FormatCodec } from '../codec';
import { isChatboxDocument } from './document';
import { findChatboxFile, findModuleFiles, parseVrcosc } from './parse';
import { serializeVrcosc } from './serialize';
import { parseVJson } from './vjson';

export { MODULES, BUILT_IN_VARIABLES, CANONICAL_SOURCES, findModule } from './catalog';
export type { VrcoscModule, VrcoscVariable, VrcoscState } from './catalog';
export {
  ALIASED_SOURCES,
  ALIAS_NOTES,
  PLAY_ICONS,
  STATUS_BUILTIN_NOTE,
  STATUS_BUILTIN_VARIABLE,
  playIconNote,
} from './aliases';
export type { VrcoscExtras } from './parse';

/**
 * VRCOSC (VolcanicArts) ChatBox timelines: `profiles/<guid>/chatbox.json` plus
 * the per-module settings files. See MAPPING.md next to this file.
 */
export const vrcoscCodec: FormatCodec = {
  id: 'vrcosc',
  name: 'VRCOSC',
  configLocation: '%APPDATA%\\VRCOSC\\profiles\\<profile-guid>\\chatbox.json (+ modules\\*.json)',
  expectedFiles: ['chatbox.json', 'modules/*.json', 'configuration/settings.json'],

  detect(files) {
    const chatbox = findChatboxFile(files);
    if (chatbox !== undefined) {
      try {
        const json = parseVJson(chatbox.content, chatbox.path);
        if (isChatboxDocument(json)) {
          return /chatbox\.json$/i.test(chatbox.path) ? 1 : 0.9;
        }
      } catch {
        return 0;
      }
      return 0;
    }
    return findModuleFiles(files).size > 0 ? 0.3 : 0;
  },

  parse: parseVrcosc,
  serialize: serializeVrcosc,
};
