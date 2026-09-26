import type { PlaceholderName } from '../../model/placeholders';
import type { VJson } from './vjson';

/**
 * Types and constructors for the VRCOSC module catalog (see `catalog.ts`).
 * Kept separate so the data files can import them without a cycle.
 */
export type VrcoscVariableType =
  'string' | 'int' | 'float' | 'bool' | 'timespan' | 'datetime' | 'progress';

export interface VrcoscVariable {
  readonly type: VrcoscVariableType;
  readonly displayName: string;
  /** Canonical placeholder this variable feeds, when one exists. */
  readonly canonical?: PlaceholderName;
}

export interface VrcoscState {
  readonly displayName: string;
  readonly defaultFormat: string;
  readonly defaultVariables: readonly string[];
}

export interface VrcoscEvent {
  readonly displayName: string;
  readonly defaultFormat: string;
  readonly defaultVariables: readonly string[];
  readonly showTyping?: boolean;
  readonly length?: number;
}

export interface VrcoscModule {
  /** `<package_id>.<class name lower-cased>` */
  readonly fullId: string;
  readonly packageId: string;
  readonly title: string;
  /** GitHub `owner/repo` of the package, for the install hint. */
  readonly repository: string;
  readonly official: boolean;
  /** The state a converted clip lives in (`playing`, `connected`, `default`, ...). Absent for stateless modules. */
  readonly mainState?: string;
  readonly states: Readonly<Record<string, VrcoscState>>;
  readonly events: Readonly<Record<string, VrcoscEvent>>;
  readonly variables: Readonly<Record<string, VrcoscVariable>>;
  /** Setting keys with their defaults (only the ones the converter reads or writes). */
  readonly settings: Readonly<Record<string, VJson>>;
}

/** Compact variable constructor for the data files. */
export function variable(
  type: VrcoscVariableType,
  displayName: string,
  canonical?: PlaceholderName,
): VrcoscVariable {
  return canonical === undefined ? { type, displayName } : { type, displayName, canonical };
}

export function state(
  displayName: string,
  defaultFormat: string,
  defaultVariables: readonly string[] = [],
): VrcoscState {
  return { displayName, defaultFormat, defaultVariables };
}

export function event(
  displayName: string,
  defaultFormat: string,
  defaultVariables: readonly string[] = [],
  extra: Partial<Pick<VrcoscEvent, 'showTyping' | 'length'>> = {},
): VrcoscEvent {
  return { displayName, defaultFormat, defaultVariables, ...extra };
}
