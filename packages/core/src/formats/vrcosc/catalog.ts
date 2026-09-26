import type { PlaceholderName } from '../../model/placeholders';
import { variable, type VrcoscModule, type VrcoscVariable } from './catalog-types';
import { COMMUNITY_MODULES } from './modules-community';
import { OFFICIAL_MODULES, OFFICIAL_PACKAGE_ID } from './modules-official';

export * from './catalog-types';

/**
 * Catalog of VRCOSC modules that contribute ChatBox states/events/variables.
 * Everything here is plain data so community packages can be appended without
 * touching the codec. IDs are exactly as VRCOSC persists them (see
 * `.references/notes/vrcosc-format.md` §3 and `ecosystem-plugins.md` §0).
 */
/** Built-in ChatBox variables (`module_id: null`), ids from `BuiltInVariables`. */
export const BUILT_IN_VARIABLES: Readonly<Record<string, VrcoscVariable>> = {
  text: variable('string', 'Custom Text'),
  focusedwindow: variable('string', 'Focused Window', 'window_title'),
  timer: variable('timespan', 'Timer', 'timer'),
  filereader: variable('string', 'File Reader', 'file_text'),
  routerchatboxinput: variable('string', 'Router ChatBox Input'),
};

export const MODULES: readonly VrcoscModule[] = [...OFFICIAL_MODULES, ...COMMUNITY_MODULES];

const MODULE_INDEX = new Map(MODULES.map((module) => [module.fullId, module]));

export function findModule(fullId: string): VrcoscModule | undefined {
  return MODULE_INDEX.get(fullId);
}

/** A module variable (or a built-in when `moduleId` is null). */
export function findVariable(
  moduleId: string | null,
  variableId: string,
): VrcoscVariable | undefined {
  if (moduleId === null) {
    return BUILT_IN_VARIABLES[variableId];
  }
  return findModule(moduleId)?.variables[variableId];
}

/** Where a canonical placeholder can come from. `moduleId: null` = built-in. */
export interface VariableSource {
  readonly moduleId: string | null;
  readonly variableId: string;
  readonly official: boolean;
}

function buildSources(): ReadonlyMap<PlaceholderName, readonly VariableSource[]> {
  const sources = new Map<PlaceholderName, VariableSource[]>();
  const add = (name: PlaceholderName, source: VariableSource): void => {
    const list = sources.get(name) ?? [];
    list.push(source);
    sources.set(name, list);
  };
  for (const [variableId, definition] of Object.entries(BUILT_IN_VARIABLES)) {
    if (definition.canonical !== undefined) {
      add(definition.canonical, { moduleId: null, variableId, official: true });
    }
  }
  for (const module of MODULES) {
    for (const [variableId, definition] of Object.entries(module.variables)) {
      if (definition.canonical !== undefined) {
        add(definition.canonical, {
          moduleId: module.fullId,
          variableId,
          official: module.official,
        });
      }
    }
  }
  return sources;
}

/**
 * Reverse index canonical placeholder → providers, built-ins and official
 * modules first, community modules after, each in catalog order.
 */
export const CANONICAL_SOURCES: ReadonlyMap<PlaceholderName, readonly VariableSource[]> =
  buildSources();

export function sourcesFor(name: PlaceholderName): readonly VariableSource[] {
  return CANONICAL_SOURCES.get(name) ?? [];
}

export function officialModuleId(shortId: string): string {
  return `${OFFICIAL_PACKAGE_ID}.${shortId}`;
}

export { OFFICIAL_PACKAGE_ID };
