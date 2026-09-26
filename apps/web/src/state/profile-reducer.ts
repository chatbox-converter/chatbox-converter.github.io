import {
  createDefaultProfile,
  type AfkSettings,
  type ChatboxProfile,
  type OscSettings,
  type OutputSettings,
  type Segment,
  type StatusCycle,
  type StatusItem,
} from '@chatbox-converter/core';

export type ProfileAction =
  | { type: 'replace'; profile: ChatboxProfile }
  | { type: 'reset' }
  | { type: 'rename'; name: string }
  | { type: 'segment/update'; id: string; patch: Partial<Omit<Segment, 'id' | 'kind'>> }
  | { type: 'segment/add'; segment: Segment; index?: number }
  | { type: 'segment/remove'; id: string }
  | { type: 'segment/move'; id: string; toIndex: number }
  | { type: 'segments/reorder'; ids: readonly string[] }
  | { type: 'status/add'; item: StatusItem }
  | { type: 'status/update'; id: string; patch: Partial<Omit<StatusItem, 'id'>> }
  | { type: 'status/remove'; id: string }
  | { type: 'status/activate'; id: string }
  | { type: 'statusCycle/update'; patch: Partial<StatusCycle> }
  | { type: 'afk/update'; patch: Partial<AfkSettings> }
  | { type: 'output/update'; patch: Partial<OutputSettings> }
  | { type: 'osc/update'; patch: Partial<OscSettings> };

export function profileReducer(state: ChatboxProfile, action: ProfileAction): ChatboxProfile {
  switch (action.type) {
    case 'replace':
      return action.profile;
    case 'reset':
      return createDefaultProfile();
    case 'rename':
      return { ...state, meta: { ...state.meta, name: action.name } };
    case 'segment/update':
      return {
        ...state,
        segments: state.segments.map((segment) =>
          segment.id === action.id ? { ...segment, ...action.patch } : segment,
        ),
      };
    case 'segment/add': {
      const segments = [...state.segments];
      segments.splice(action.index ?? segments.length, 0, action.segment);
      return { ...state, segments };
    }
    case 'segment/remove':
      return { ...state, segments: state.segments.filter((segment) => segment.id !== action.id) };
    case 'segment/move': {
      const from = state.segments.findIndex((segment) => segment.id === action.id);
      if (from === -1) {
        return state;
      }
      const segments = [...state.segments];
      const [moved] = segments.splice(from, 1);
      if (moved === undefined) {
        return state;
      }
      segments.splice(Math.max(0, Math.min(action.toIndex, segments.length)), 0, moved);
      return { ...state, segments };
    }
    case 'segments/reorder': {
      const byId = new Map(state.segments.map((segment) => [segment.id, segment]));
      const ordered = action.ids.flatMap((id) => {
        const segment = byId.get(id);
        return segment === undefined ? [] : [segment];
      });
      const rest = state.segments.filter((segment) => !action.ids.includes(segment.id));
      return { ...state, segments: [...ordered, ...rest] };
    }
    case 'status/add':
      return { ...state, statuses: [...state.statuses, action.item] };
    case 'status/update':
      return {
        ...state,
        statuses: state.statuses.map((item) =>
          item.id === action.id ? { ...item, ...action.patch } : item,
        ),
      };
    case 'status/remove':
      return { ...state, statuses: state.statuses.filter((item) => item.id !== action.id) };
    case 'status/activate':
      return {
        ...state,
        statuses: state.statuses.map((item) => ({ ...item, active: item.id === action.id })),
      };
    case 'statusCycle/update':
      return { ...state, statusCycle: { ...state.statusCycle, ...action.patch } };
    case 'afk/update':
      return { ...state, afk: { ...state.afk, ...action.patch } };
    case 'output/update':
      return { ...state, output: { ...state.output, ...action.patch } };
    case 'osc/update':
      return { ...state, osc: { ...state.osc, ...action.patch } };
  }
}
