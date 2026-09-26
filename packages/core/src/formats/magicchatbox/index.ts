import { isJsonObject, parseJsonFile } from '../../util/json';
import type { ConfigFile, FormatCodec } from '../codec';
import { FILES, KNOWN_FILE_NAMES } from './catalog';
import { canonicalFileName } from './files';
import { parseMagicchatbox } from './parse';
import { serializeMagicchatbox } from './serialize';

export { EXTRAS_KEY, normalizeSortOrder, type MagicchatboxExtras } from './parse';
export { hashMsgId, STATUS_ID_PREFIX } from './statuses';
export {
  CANONICAL_TO_MCB,
  INTEGRATION_TITLES as MAGICCHATBOX_INTEGRATION_TITLES,
  LAYOUT_FLAGS as MAGICCHATBOX_LAYOUT_FLAGS,
  type McbProvider,
} from './canonical';
export {
  FILES as MAGICCHATBOX_FILES,
  SORT_KEYS as MAGICCHATBOX_SORT_KEYS,
  TIMEZONES as MAGICCHATBOX_TIMEZONES,
} from './catalog';

function looksVersioned(file: ConfigFile): boolean {
  try {
    const json = parseJsonFile(file.content, file.path);
    return isJsonObject(json) && '_schemaVersion' in json && '_appVersion' in json;
  } catch {
    return false;
  }
}

/**
 * MagicChatbox (BoiHanny/vrcosc-magicchatbox) keeps ~35 JSON files in
 * `%APPDATA%\Vrcosc-MagicChatbox\`; a user uploads the folder or a selection.
 */
export const magicchatboxCodec: FormatCodec = {
  id: 'magicchatbox',
  name: 'MagicChatbox',
  configLocation: '%APPDATA%\\Vrcosc-MagicChatbox\\ (all *.json files)',
  expectedFiles: Object.values(FILES),

  detect(files) {
    const known = new Set(KNOWN_FILE_NAMES.map((name) => name.toLowerCase()));
    const byName = files.some((file) => known.has(canonicalFileName(file.path).toLowerCase()));
    return byName || files.some(looksVersioned) ? 1 : 0;
  },

  parse: parseMagicchatbox,
  serialize: serializeMagicchatbox,
};
