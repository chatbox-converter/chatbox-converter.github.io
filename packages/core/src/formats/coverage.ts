import {
  PLACEHOLDERS,
  PLACEHOLDER_NAMES,
  type PlaceholderCategory,
  type PlaceholderName,
  type PlaceholderValueType,
} from '../model/placeholders';
import type { FormatId } from '../model/profile';
import { CANONICAL_TO_DREAM } from './dreamchatbox/catalog';
import { CANONICAL_TO_MCB } from './magicchatbox/canonical';
import {
  ALIASED_SOURCES,
  ALIAS_NOTES,
  STATUS_BUILTIN_NOTE,
  STATUS_BUILTIN_VARIABLE,
  playIconNote,
} from './vrcosc/aliases';
import {
  BUILT_IN_VARIABLES,
  CANONICAL_SOURCES,
  findModule,
  type VariableSource,
} from './vrcosc/catalog';

/**
 * Reference data for the Catalog page: every canonical placeholder with what
 * provides it in each supported app, derived from the codecs' own tables so
 * the page cannot drift from what the converter actually writes.
 */
export type ProviderKind = 'builtin' | 'official' | 'community' | 'plugin' | 'integration';

export interface ProviderRef {
  readonly app: FormatId;
  readonly kind: ProviderKind;
  /** Module title / plugin id / MagicChatbox integration. */
  readonly name: string;
  /** Variable id / token / settings key. */
  readonly detail: string;
  /** e.g. "offset only", "literal per state", "requires package X". */
  readonly note?: string;
  readonly repository?: string;
}

export interface PlaceholderCoverage {
  readonly name: PlaceholderName;
  readonly label: string;
  readonly category: PlaceholderCategory;
  readonly type: PlaceholderValueType;
  readonly sample: string;
  readonly providers: readonly ProviderRef[];
}

const STATELESS_NOTE = 'module registers no ChatBox states';
const BUILT_IN = 'Built-in';

function withNote(ref: ProviderRef, note: string | undefined): ProviderRef {
  return note === undefined ? ref : { ...ref, note };
}

function vrcoscRef(source: VariableSource, note?: string): ProviderRef {
  if (source.moduleId === null) {
    return withNote(
      { app: 'vrcosc', kind: 'builtin', name: BUILT_IN, detail: source.variableId },
      note,
    );
  }
  const module = findModule(source.moduleId);
  const base: ProviderRef = {
    app: 'vrcosc',
    kind: module?.official === true ? 'official' : 'community',
    name: module?.title ?? source.moduleId,
    detail: source.variableId,
    ...(module === undefined ? {} : { repository: module.repository }),
  };
  const stateless = module !== undefined && module.mainState === undefined;
  const notes = [note, stateless ? STATELESS_NOTE : undefined].filter(
    (part): part is string => part !== undefined,
  );
  return withNote(base, notes.length === 0 ? undefined : notes.join('; '));
}

function vrcoscProviders(name: PlaceholderName): ProviderRef[] {
  const direct = (CANONICAL_SOURCES.get(name) ?? []).map((source) => vrcoscRef(source));
  const alias = ALIASED_SOURCES[name];
  const aliased =
    alias === undefined
      ? []
      : (CANONICAL_SOURCES.get(alias) ?? []).map((source) => vrcoscRef(source, ALIAS_NOTES[name]));
  const extras: ProviderRef[] = [];
  if (name === 'status' && STATUS_BUILTIN_VARIABLE in BUILT_IN_VARIABLES) {
    extras.push({
      app: 'vrcosc',
      kind: 'builtin',
      name: BUILT_IN,
      detail: STATUS_BUILTIN_VARIABLE,
      note: STATUS_BUILTIN_NOTE,
    });
  }
  if (name === 'play_icon') {
    extras.push({
      app: 'vrcosc',
      kind: 'builtin',
      name: BUILT_IN,
      detail: 'text',
      note: playIconNote(),
    });
  }
  return [...extras, ...direct, ...aliased];
}

function dreamProviders(name: PlaceholderName): ProviderRef[] {
  const target = CANONICAL_TO_DREAM[name];
  if (target === undefined) {
    return [];
  }
  const detail = `{${target.token}}`;
  if (target.plugin === undefined) {
    return [{ app: 'dreamchatbox', kind: 'builtin', name: BUILT_IN, detail }];
  }
  return [
    {
      app: 'dreamchatbox',
      kind: 'plugin',
      name: target.plugin,
      detail,
      note: `requires the ${target.plugin} plugin`,
    },
  ];
}

function magicchatboxProviders(name: PlaceholderName): ProviderRef[] {
  return (CANONICAL_TO_MCB.get(name) ?? []).map((provider) =>
    withNote(
      { app: 'magicchatbox', kind: 'integration', name: provider.name, detail: provider.detail },
      provider.note,
    ),
  );
}

/** Every canonical placeholder, in vocabulary order, with its providers per app. */
export function placeholderCoverage(): readonly PlaceholderCoverage[] {
  return PLACEHOLDER_NAMES.map((name) => {
    const definition = PLACEHOLDERS[name];
    return {
      name,
      label: definition.label,
      category: definition.category,
      type: definition.type,
      sample: definition.sample,
      providers: [
        ...magicchatboxProviders(name),
        ...vrcoscProviders(name),
        ...dreamProviders(name),
      ],
    };
  });
}
