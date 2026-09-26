import type { ChatboxProfile } from '../../model/profile';
import { isJsonObject, parseJsonFile, stringifyPretty, type JsonValue } from '../../util/json';
import { ConfigParseError, DiagnosticCollector, type ConfigFile, type FormatCodec } from '../codec';
import { profileSchema } from './schema';

export const NATIVE_FILE_NAME = 'chatbox-profile.json';

/**
 * The converter's own save format: the neutral model as JSON, validated with
 * zod so a hand-edited file fails loudly instead of producing a broken UI.
 */
export const nativeCodec: FormatCodec = {
  id: 'native',
  name: 'Chatbox Converter profile',
  configLocation: 'Downloaded from this site',
  expectedFiles: [NATIVE_FILE_NAME],

  detect(files) {
    const file = files.find((candidate) => candidate.path.endsWith('.json'));
    if (file === undefined) {
      return 0;
    }
    try {
      const json = parseJsonFile(file.content, file.path);
      return isJsonObject(json) && json['version'] === 1 && 'segments' in json && 'statuses' in json
        ? 1
        : 0;
    } catch {
      return 0;
    }
  },

  parse(files) {
    const file = files.find((candidate) => candidate.path.endsWith('.json')) ?? files[0];
    if (file === undefined) {
      throw new ConfigParseError('No profile file was provided.');
    }
    const json = parseJsonFile(file.content, file.path);
    const result = profileSchema.safeParse(json);
    if (!result.success) {
      const first = result.error.issues[0];
      const where = first === undefined ? '' : ` at ${first.path.join('.')}: ${first.message}`;
      throw new ConfigParseError(`${file.path} is not a valid profile${where}.`, file.path);
    }
    return { profile: result.data, diagnostics: new DiagnosticCollector().all() };
  },

  serialize(profile: ChatboxProfile) {
    const file: ConfigFile = {
      path: NATIVE_FILE_NAME,
      // The profile only holds JSON-compatible values; extras are opaque JSON from other codecs.
      content: stringifyPretty(profile as unknown as JsonValue),
    };
    return { files: [file], diagnostics: [] };
  },
};
