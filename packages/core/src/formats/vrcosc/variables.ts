import { findVariable } from './catalog';
import type { CompiledVariable } from './compile';
import type { VrcVariable } from './document';
import { builtInDefaults, classDefaults, fullOptions, optionValue, ticksToIso } from './options';
import { vBigInt, vEqual, type VObject } from './vjson';

/** Defaults of a variable's option class, for the all-or-nothing `options` rule. */
export function optionDefaultsFor(variable: VrcVariable): VObject {
  if (variable.module_id === null) {
    return builtInDefaults(variable.variable_id);
  }
  const type = findVariable(variable.module_id, variable.variable_id)?.type ?? 'string';
  return classDefaults(type);
}

/** `{}` when every option is default, otherwise the full option set like VRCOSC writes it. */
export function finalizeVariable(variable: CompiledVariable): VrcVariable {
  const defaults = optionDefaultsFor(variable);
  const isDefault = Object.entries(variable.options).every(([key, value]) =>
    vEqual(defaults[key], value),
  );
  const options = isDefault ? {} : fullOptions(defaults, variable.options);
  return { module_id: variable.module_id, variable_id: variable.variable_id, options };
}

function sameTicks(a: VObject[string] | undefined, b: VObject[string] | undefined): boolean {
  const left = vBigInt(a);
  const right = vBigInt(b);
  return left !== undefined && right !== undefined && ticksToIso(left) === ticksToIso(right);
}

/**
 * Apply the options the model can express on top of a variable's original
 * options, leaving everything else (scroll, case, tick precision) untouched.
 */
export function overlayOptions(original: VObject, desired: VObject, defaults: VObject): VObject {
  const result: VObject = { ...original };
  let changed = false;
  for (const [key, value] of Object.entries(desired)) {
    const current = optionValue(original, defaults, key);
    if (key === 'datetime' && sameTicks(current, value)) {
      continue;
    }
    if (!vEqual(current, value)) {
      result[key] = value;
      changed = true;
    }
  }
  if (!changed) {
    return original;
  }
  return Object.keys(original).length === 0 ? fullOptions(defaults, result) : result;
}

function sameId(a: VrcVariable, b: VrcVariable): boolean {
  return a.module_id === b.module_id && a.variable_id === b.variable_id;
}

export interface Reconciled {
  readonly format: string;
  readonly variables: readonly VrcVariable[];
}

/**
 * Fit freshly compiled variables onto a state's original `variables` array:
 * when both use the same set of variables the original order and options are
 * kept and the `{n}` references are renumbered; otherwise the compiled order
 * wins and options are inherited where the ids match.
 */
export function reconcileVariables(
  original: readonly VrcVariable[],
  compiled: readonly CompiledVariable[],
  format: string,
): Reconciled {
  const taken = new Set<number>();
  /** Index into `original` of each compiled variable's match, or -1. */
  const positions = compiled.map((variable) => {
    const index = original.findIndex(
      (candidate, candidateIndex) => !taken.has(candidateIndex) && sameId(candidate, variable),
    );
    if (index >= 0) {
      taken.add(index);
    }
    return index;
  });
  const merged: VrcVariable[] = compiled.map((variable, index) => {
    const match = original[positions[index] ?? -1];
    if (match === undefined) {
      return finalizeVariable(variable);
    }
    return {
      ...match,
      options: overlayOptions(match.options, variable.options, optionDefaultsFor(variable)),
    };
  });
  const sameSet = taken.size === original.length && positions.every((position) => position >= 0);
  if (!sameSet) {
    return { format, variables: merged };
  }
  // Keep the original order: compiled variable i goes back to its original position.
  const variables: VrcVariable[] = [...original];
  merged.forEach((variable, index) => {
    variables[positions[index] ?? 0] = variable;
  });
  const renumbered = format.replace(/\{(\d+)\}/g, (raw, digits: string) => {
    const position = positions[Number(digits)];
    return position === undefined ? raw : `{${position}}`;
  });
  return { format: renumbered, variables };
}
