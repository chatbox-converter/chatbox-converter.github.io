import { ConfigParseError } from '../formats/codec';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse JSON, tolerating a UTF-8 BOM and reporting the file path on failure. */
export function parseJsonFile(content: string, path: string): JsonValue {
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  try {
    return JSON.parse(text) as JsonValue;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ConfigParseError(`${path} is not valid JSON: ${reason}`, path);
  }
}

/**
 * Case-insensitive property lookup, matching Newtonsoft's default behaviour
 * so that hand-edited MagicChatbox files still load.
 */
export function getCaseInsensitive(object: JsonObject, key: string): JsonValue | undefined {
  if (Object.hasOwn(object, key)) {
    return object[key];
  }
  const lower = key.toLowerCase();
  for (const [candidate, value] of Object.entries(object)) {
    if (candidate.toLowerCase() === lower) {
      return value;
    }
  }
  return undefined;
}

export function asString(value: JsonValue | undefined, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: JsonValue | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asBoolean(value: JsonValue | undefined, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function asStringArray(value: JsonValue | undefined, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

/** Serialize with 2-space indentation and a trailing newline, UTF-8 friendly. */
export function stringifyPretty(value: JsonValue): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
