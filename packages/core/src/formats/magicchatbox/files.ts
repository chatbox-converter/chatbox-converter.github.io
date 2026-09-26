import {
  asBoolean,
  asNumber,
  asString,
  getCaseInsensitive,
  isJsonObject,
  parseJsonFile,
  type JsonObject,
  type JsonValue,
} from '../../util/json';
import type { ConfigFile } from '../codec';
import {
  APP_VERSION,
  COMPACT_FILES,
  KNOWN_FILE_NAMES,
  LEGACY_KEYS,
  SCHEMA_VERSIONS,
} from './catalog';

export function basename(path: string): string {
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return cut >= 0 ? path.slice(cut + 1) : path;
}

/** The canonical spelling of a known file name, or the basename as given. */
export function canonicalFileName(path: string): string {
  const name = basename(path);
  const lower = name.toLowerCase();
  return KNOWN_FILE_NAMES.find((known) => known.toLowerCase() === lower) ?? name;
}

/** Uploaded files keyed by canonical basename; unparsable files throw ConfigParseError. */
export class FileSet {
  private readonly entries = new Map<string, JsonValue>();

  constructor(files: readonly ConfigFile[]) {
    for (const file of files) {
      if (!file.path.toLowerCase().endsWith('.json')) {
        continue;
      }
      const text = file.content.trim().replace(/\0+$/u, '');
      if (text === '' || text === 'null') {
        continue; // the app treats these as "use defaults" without quarantine
      }
      this.entries.set(
        canonicalFileName(file.path).toLowerCase(),
        parseJsonFile(file.content, file.path),
      );
    }
  }

  raw(name: string): JsonValue | undefined {
    return this.entries.get(name.toLowerCase());
  }

  object(name: string): JsonObject | undefined {
    const value = this.raw(name);
    return isJsonObject(value) ? value : undefined;
  }

  has(name: string): boolean {
    return this.entries.has(name.toLowerCase());
  }

  /** Every parsed file by canonical name, for `extras`. */
  all(): Record<string, JsonValue> {
    const out: Record<string, JsonValue> = {};
    for (const [lower, value] of this.entries) {
      out[canonicalFileName(lower)] = value;
    }
    return out;
  }
}

/** Case-insensitive typed access to one settings object (missing object = all defaults). */
export class Reader {
  constructor(private readonly object: JsonObject | undefined) {}

  get present(): boolean {
    return this.object !== undefined;
  }

  raw(key: string): JsonValue | undefined {
    return this.object === undefined ? undefined : getCaseInsensitive(this.object, key);
  }

  str(key: string, fallback: string): string {
    return asString(this.raw(key), fallback);
  }

  num(key: string, fallback: number): number {
    return asNumber(this.raw(key), fallback);
  }

  bool(key: string, fallback: boolean): boolean {
    return asBoolean(this.raw(key), fallback);
  }

  strings(key: string): string[] | undefined {
    const value = this.raw(key);
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : undefined;
  }

  objects(key: string): JsonObject[] {
    const value = this.raw(key);
    return Array.isArray(value) ? value.filter(isJsonObject) : [];
  }
}

/** Set a key, replacing any existing spelling that differs only in case. */
export function setKey(target: JsonObject, key: string, value: JsonValue): void {
  const lower = key.toLowerCase();
  for (const existing of Object.keys(target)) {
    if (existing !== key && existing.toLowerCase() === lower) {
      Reflect.deleteProperty(target, existing);
    }
  }
  target[key] = value;
}

/**
 * Defaults overlaid with a previously imported file: keys the defaults know are
 * normalised to their canonical spelling, everything else is carried verbatim.
 */
export function mergeDefaults(defaults: JsonObject, extra: JsonValue | undefined): JsonObject {
  const out: JsonObject = { ...defaults };
  if (!isJsonObject(extra)) {
    return out;
  }
  const canonical = new Map(Object.keys(defaults).map((key) => [key.toLowerCase(), key]));
  for (const [key, value] of Object.entries(extra)) {
    setKey(out, canonical.get(key.toLowerCase()) ?? key, value);
  }
  return out;
}

/** Drop legacy read-only keys and, for versioned files, move the metadata keys to the front. */
export function finalizeFile(name: string, object: JsonObject, versioned: boolean): JsonObject {
  const body: JsonObject = { ...object };
  for (const legacy of LEGACY_KEYS[name] ?? []) {
    setKey(body, legacy, null);
    Reflect.deleteProperty(body, legacy);
  }
  if (!versioned) {
    return body;
  }
  const migratedAt = getCaseInsensitive(body, '_migratedAt') ?? null;
  for (const meta of ['_schemaVersion', '_appVersion', '_migratedAt']) {
    setKey(body, meta, null);
    Reflect.deleteProperty(body, meta);
  }
  return {
    _schemaVersion: SCHEMA_VERSIONS[name] ?? 1,
    _appVersion: APP_VERSION,
    _migratedAt: typeof migratedAt === 'string' ? migratedAt : null,
    ...body,
  };
}

/** JSON exactly as MagicChatbox writes it: 2-space indent, or compact for the list files. */
export function stringifyFile(name: string, value: JsonValue): string {
  return COMPACT_FILES.includes(name) ? JSON.stringify(value) : JSON.stringify(value, null, 2);
}

/** Literal `\n` in prefix/suffix/templates is expanded by the app. */
export function expandNewlines(text: string): string {
  return text.replaceAll('\\n', '\n');
}

export function escapeNewlines(text: string): string {
  return text.replaceAll('\n', '\\n');
}
