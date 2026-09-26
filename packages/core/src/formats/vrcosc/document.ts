import { ConfigParseError } from '../codec';
import {
  isVObject,
  vArray,
  vBoolean,
  vNumber,
  vObject,
  vString,
  vStringArray,
  type VJson,
  type VObject,
} from './vjson';

/**
 * Typed view of `chatbox.json` (`SerialisableChatBox` in VRCOSC). Field order
 * equals the key order VRCOSC writes, so `documentToJson` can rely on object
 * literal insertion order.
 */
export interface VrcVariable {
  readonly module_id: string | null;
  readonly variable_id: string;
  readonly options: VObject;
}

export interface VrcState {
  readonly enabled: boolean;
  readonly format: string;
  readonly show_typing: boolean;
  readonly use_minimal_background: boolean;
  readonly variables: readonly VrcVariable[];
  /** `null` is the built-in text state of a clip without linked modules. */
  readonly states: Readonly<Record<string, string>> | null;
}

export interface VrcEvent {
  readonly enabled: boolean;
  readonly format: string;
  readonly show_typing: boolean;
  readonly use_minimal_background: boolean;
  readonly variables: readonly VrcVariable[];
  readonly module_id: string;
  readonly event_id: string;
  readonly length: number;
  readonly behaviour: number;
}

export interface VrcClip {
  readonly layer: number;
  readonly enabled: boolean;
  readonly name: string;
  readonly start: number;
  readonly end: number;
  readonly linked_modules: readonly string[];
  readonly states: readonly VrcState[];
  readonly events: readonly VrcEvent[];
}

export interface VrcDocument {
  readonly version: 1;
  readonly timeline: {
    readonly length: number;
    readonly clips: readonly VrcClip[];
  };
}

export const DEFAULT_TIMELINE_LENGTH = 60;
export const MAX_TIMELINE_LENGTH = 240;

function readVariable(json: VJson): VrcVariable {
  const object = vObject(json);
  const moduleId = object['module_id'];
  return {
    module_id: typeof moduleId === 'string' ? moduleId : null,
    variable_id: vString(object['variable_id'], ''),
    options: vObject(object['options']),
  };
}

function readStatesDictionary(json: VJson | undefined): Record<string, string> | null {
  if (!isVObject(json)) {
    return null;
  }
  const dictionary: Record<string, string> = {};
  for (const [moduleId, stateId] of Object.entries(json)) {
    if (typeof stateId === 'string') {
      dictionary[moduleId] = stateId;
    }
  }
  return dictionary;
}

function readState(json: VJson): VrcState {
  const object = vObject(json);
  return {
    enabled: vBoolean(object['enabled'], false),
    format: vString(object['format'], ''),
    show_typing: vBoolean(object['show_typing'], false),
    use_minimal_background: vBoolean(object['use_minimal_background'], false),
    variables: vArray(object['variables']).map(readVariable),
    states: readStatesDictionary(object['states']),
  };
}

function readEvent(json: VJson): VrcEvent {
  const object = vObject(json);
  return {
    enabled: vBoolean(object['enabled'], false),
    format: vString(object['format'], ''),
    show_typing: vBoolean(object['show_typing'], false),
    use_minimal_background: vBoolean(object['use_minimal_background'], false),
    variables: vArray(object['variables']).map(readVariable),
    module_id: vString(object['module_id'], ''),
    event_id: vString(object['event_id'], ''),
    length: vNumber(object['length'], 5),
    behaviour: vNumber(object['behaviour'], 0),
  };
}

function readClip(json: VJson): VrcClip {
  const object = vObject(json);
  return {
    layer: vNumber(object['layer'], 0),
    enabled: vBoolean(object['enabled'], true),
    name: vString(object['name'], 'New Clip'),
    start: vNumber(object['start'], 0),
    end: vNumber(object['end'], DEFAULT_TIMELINE_LENGTH),
    linked_modules: vStringArray(object['linked_modules']),
    states: vArray(object['states']).map(readState),
    events: vArray(object['events']).map(readEvent),
  };
}

/** Tolerant reader: missing keys fall back to VRCOSC's defaults, `version` must be 1. */
export function readDocument(json: VJson, path: string): VrcDocument {
  if (!isVObject(json)) {
    throw new ConfigParseError(`${path} does not contain a JSON object.`, path);
  }
  const version = vNumber(json['version'], 0);
  if (version !== 1) {
    throw new ConfigParseError(
      `${path} has "version": ${version}; only VRCOSC ChatBox version 1 is supported.`,
      path,
    );
  }
  const timeline = vObject(json['timeline']);
  return {
    version: 1,
    timeline: {
      length: vNumber(timeline['length'], DEFAULT_TIMELINE_LENGTH),
      clips: vArray(timeline['clips']).map(readClip),
    },
  };
}

export function isChatboxDocument(json: VJson): boolean {
  return isVObject(json) && isVObject(json['timeline']) && 'clips' in json['timeline'];
}

function variableToJson(variable: VrcVariable): VObject {
  return {
    module_id: variable.module_id,
    variable_id: variable.variable_id,
    options: variable.options,
  };
}

function stateToJson(state: VrcState): VObject {
  return {
    enabled: state.enabled,
    format: state.format,
    show_typing: state.show_typing,
    use_minimal_background: state.use_minimal_background,
    variables: state.variables.map(variableToJson),
    states: state.states === null ? null : { ...state.states },
  };
}

function eventToJson(event: VrcEvent): VObject {
  return {
    enabled: event.enabled,
    format: event.format,
    show_typing: event.show_typing,
    use_minimal_background: event.use_minimal_background,
    variables: event.variables.map(variableToJson),
    module_id: event.module_id,
    event_id: event.event_id,
    length: event.length,
    behaviour: event.behaviour,
  };
}

function clipToJson(clip: VrcClip): VObject {
  return {
    layer: clip.layer,
    enabled: clip.enabled,
    name: clip.name,
    start: clip.start,
    end: clip.end,
    linked_modules: [...clip.linked_modules],
    states: clip.states.map(stateToJson),
    events: clip.events.map(eventToJson),
  };
}

/** Serialise with VRCOSC's key order (`version` first). */
export function documentToJson(document: VrcDocument): VObject {
  return {
    version: 1,
    timeline: {
      length: document.timeline.length,
      clips: document.timeline.clips.map(clipToJson),
    },
  };
}
