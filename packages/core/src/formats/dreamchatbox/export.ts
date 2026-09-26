import { isJsonObject, type JsonObject, type JsonValue } from '../../util/json';
import type { ConfigFile } from '../codec';
import { APP_WIDE_KEYS } from './defaults';

/**
 * The single-file profile export of OSC-DreamChatbox v1.5.7+
 * (`core/profiles.py:302-359`, format notes §7):
 *
 *     {"format": "osc-dreamchatbox-profile", "version": 1, "name": "Gaming",
 *      "profile": {...profile file, plugin_<id> flags included...},
 *      "plugins": {"<id>": {...plugins/<id>/configs/config.json minus enabled/chat...}}}
 *
 * written as `<name>.dcbprofile.json`. A plain profile `.json` imports too.
 */
export const EXPORT_FORMAT = 'osc-dreamchatbox-profile';
export const EXPORT_VERSION = 1;
export const EXPORT_SUFFIX = '.dcbprofile.json';
/** The profile a fresh v1.5.7+ install starts with (`core/profiles.py:48`). */
export const DEFAULT_PROFILE_NAME = 'Default';
/** `plugin_<id>: true/false` at the end of a profile file (`core/profiles.py:75`). */
export const PLUGIN_KEY_PREFIX = 'plugin_';

/** The part of a profile file that is not config: which plugins it uses and their settings. */
export interface DreamProfileMeta {
  /** `{plugin id: on/off}` from the `plugin_<id>` keys. */
  readonly plugins: Readonly<Record<string, boolean>>;
  /** `profiles/plugins/<name>.json` / the export's `plugins` object. */
  readonly pluginSettings: Readonly<Record<string, JsonObject>>;
}

/** What `profile.extras.dreamchatbox` holds. */
export interface DreamExtras {
  readonly config: JsonObject;
  readonly profile: DreamProfileMeta;
}

export interface DreamInput {
  /** The stored config object without the `plugin_<id>` flags. */
  readonly stored: JsonObject;
  /** Envelope `name`, else the file name; empty when neither says. */
  readonly name: string;
  readonly meta: DreamProfileMeta;
  readonly envelope: boolean;
}

const emptyMeta = (): DreamProfileMeta => ({ plugins: {}, pluginSettings: {} });

/** `core/profiles.py:702-712`: only boolean `plugin_<id>` keys are flags. */
export function splitPluginFlags(stored: JsonObject): {
  rest: JsonObject;
  flags: Record<string, boolean>;
} {
  const rest: JsonObject = {};
  const flags: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(stored)) {
    const pid = key.startsWith(PLUGIN_KEY_PREFIX)
      ? key.slice(PLUGIN_KEY_PREFIX.length).trim().toLowerCase()
      : '';
    if (pid !== '' && typeof value === 'boolean') {
      flags[pid] = value;
    } else {
      rest[key] = value;
    }
  }
  return { rest, flags };
}

function pluginSettingsOf(value: JsonValue | undefined): Record<string, JsonObject> {
  const out: Record<string, JsonObject> = {};
  if (!isJsonObject(value)) {
    return out;
  }
  for (const [pid, settings] of Object.entries(value)) {
    if (isJsonObject(settings)) {
      out[pid.toLowerCase()] = settings;
    }
  }
  return out;
}

/** `core/profiles.py:823-848`: the name a file would be imported under. */
export function nameFromPath(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? '';
  const lower = base.toLowerCase();
  if (lower.endsWith(EXPORT_SUFFIX)) {
    return base.slice(0, -EXPORT_SUFFIX.length);
  }
  return lower.endsWith('.json') ? base.slice(0, -'.json'.length) : base;
}

/** True when the object is a v1.5.7+ export envelope. */
export function isExportEnvelope(json: JsonObject): boolean {
  return json['format'] === EXPORT_FORMAT;
}

/** Unwrap an export envelope, a profile file or config.json into the stored config. */
export function readDreamInput(json: JsonObject, path: string): DreamInput | undefined {
  if (isExportEnvelope(json)) {
    const profile = json['profile'];
    if (!isJsonObject(profile)) {
      return undefined;
    }
    const { rest, flags } = splitPluginFlags(profile);
    const name = typeof json['name'] === 'string' ? json['name'] : '';
    return {
      stored: rest,
      name: name !== '' ? name : nameFromPath(path),
      meta: { plugins: flags, pluginSettings: pluginSettingsOf(json['plugins']) },
      envelope: true,
    };
  }
  const { rest, flags } = splitPluginFlags(json);
  const match = /(?:^|[\\/])profiles[\\/][^\\/]+\.json$/i.exec(path);
  return {
    stored: rest,
    name: match === null ? '' : nameFromPath(path),
    meta: { plugins: flags, pluginSettings: {} },
    envelope: false,
  };
}

/** config.json first (it alone carries the app-wide keys), then an export, then any profile. */
export function pickInputFile(files: readonly ConfigFile[]): ConfigFile | undefined {
  const json = files.filter((f) => f.path.toLowerCase().endsWith('.json'));
  const byName = (test: (lower: string) => boolean): ConfigFile | undefined =>
    json.find((f) => test(f.path.toLowerCase().split(/[\\/]/).pop() ?? ''));
  return (
    byName((n) => n === 'config.json') ??
    byName((n) => n.endsWith(EXPORT_SUFFIX)) ??
    json[0] ??
    files[0]
  );
}

/** Read `profile.extras.dreamchatbox`, accepting the pre-v1.5.7 flat config shape too. */
export function readDreamExtras(value: unknown): DreamExtras {
  if (!isJsonObject(value)) {
    return { config: {}, profile: emptyMeta() };
  }
  const config = value['config'];
  if (!isJsonObject(config)) {
    return { config: value, profile: emptyMeta() };
  }
  const meta = value['profile'];
  if (!isJsonObject(meta)) {
    return { config, profile: emptyMeta() };
  }
  const plugins: Record<string, boolean> = {};
  if (isJsonObject(meta['plugins'])) {
    for (const [pid, on] of Object.entries(meta['plugins'])) {
      if (typeof on === 'boolean') {
        plugins[pid] = on;
      }
    }
  }
  return { config, profile: { plugins, pluginSettings: pluginSettingsOf(meta['pluginSettings']) } };
}

export function toExtras(extras: DreamExtras): JsonObject {
  return {
    config: extras.config,
    profile: {
      plugins: { ...extras.profile.plugins },
      pluginSettings: { ...extras.profile.pluginSettings },
    },
  };
}

/** `core/profiles.py:659-663,715-733`: the profile file body, plugin flags sorted at the end. */
export function profileFileBody(cfg: JsonObject, meta: DreamProfileMeta): JsonObject {
  const body: JsonObject = {};
  for (const [key, value] of Object.entries(cfg)) {
    if (!APP_WIDE_KEYS.includes(key) && !key.startsWith(PLUGIN_KEY_PREFIX)) {
      body[key] = value;
    }
  }
  for (const pid of Object.keys(meta.plugins).sort()) {
    body[`${PLUGIN_KEY_PREFIX}${pid}`] = meta.plugins[pid] ?? false;
  }
  return body;
}

/** `core/profiles.py:803-820`: the `<name>.dcbprofile.json` envelope. */
export function exportEnvelope(name: string, body: JsonObject, meta: DreamProfileMeta): JsonObject {
  const plugins: JsonObject = {};
  for (const pid of Object.keys(meta.pluginSettings).sort()) {
    plugins[pid] = meta.pluginSettings[pid] ?? {};
  }
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    name,
    profile: body,
    plugins,
  };
}
