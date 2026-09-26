import { isInteger, isSafeNumber, parse, stringify } from 'lossless-json';
import { ConfigParseError } from '../codec';

/**
 * JSON as VRCOSC writes it, with one twist: integers that do not fit into a
 * double (.NET ticks such as `638990490000000000`) are kept as `bigint` so a
 * round trip never rounds them. Everything else is a plain JSON value.
 */
export type VJson = string | number | bigint | boolean | null | VJson[] | { [key: string]: VJson };
export type VObject = Record<string, VJson>;

function parseNumber(text: string): number | bigint {
  if (isSafeNumber(text)) {
    return Number(text);
  }
  return isInteger(text) ? BigInt(text) : Number(text);
}

/** Parse with lossless-json, tolerating a BOM and reporting the file path on failure. */
export function parseVJson(content: string, path: string): VJson {
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  try {
    // lossless-json only ever produces the primitive/array/object shapes of VJson
    // given our number parser.
    return parse(text, null, parseNumber) as VJson;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ConfigParseError(`${path} is not valid JSON: ${reason}`, path);
  }
}

/** Newtonsoft `Formatting.Indented` look-alike: 2 spaces, bigints written as digits. */
export function stringifyVJson(value: VJson): string {
  return `${stringify(value, null, 2) ?? 'null'}\n`;
}

export function isVObject(value: VJson | undefined): value is VObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isVArray(value: VJson | undefined): value is VJson[] {
  return Array.isArray(value);
}

export function vString(value: VJson | undefined, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function vBoolean(value: VJson | undefined, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Numbers and safely representable bigints; anything else falls back. */
export function vNumber(value: VJson | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : fallback;
  }
  return fallback;
}

/** Integers of any size as bigint (for .NET ticks). */
export function vBigInt(value: VJson | undefined): bigint | undefined {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return BigInt(value);
  }
  return undefined;
}

export function vObject(value: VJson | undefined): VObject {
  return isVObject(value) ? value : {};
}

export function vArray(value: VJson | undefined): VJson[] {
  return isVArray(value) ? value : [];
}

export function vStringArray(value: VJson | undefined): string[] {
  return vArray(value).filter((item): item is string => typeof item === 'string');
}

/** Short human-readable rendering for diagnostics. */
export function describeVJson(value: VJson): string {
  if (typeof value === 'object') {
    return stringify(value) ?? 'null';
  }
  return typeof value === 'string' ? value : value.toString();
}

/** Structural equality that treats `5` and `5n` as the same number. */
export function vEqual(a: VJson | undefined, b: VJson | undefined): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  if (typeof a === 'bigint' || typeof b === 'bigint') {
    if (typeof a !== 'bigint' && typeof a !== 'number') {
      return false;
    }
    if (typeof b !== 'bigint' && typeof b !== 'number') {
      return false;
    }
    return a.toString() === b.toString();
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => vEqual(item, b[index]))
    );
  }
  if (isVObject(a) || isVObject(b)) {
    if (!isVObject(a) || !isVObject(b)) {
      return false;
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((key) => vEqual(a[key], b[key]));
  }
  return a === b;
}
