import { createStatusItem, type StatusItem } from '../../model/profile';
import { DOTNET_MIN_DATE, formatDotnetDateTime, newGuid } from '../../util/dotnet';
import { asString, isJsonObject, type JsonObject, type JsonValue } from '../../util/json';
import { Reader } from './files';

export const STATUS_ID_PREFIX = 'msgid-';
export const DEFAULT_GROUP_NAME = 'Default';
const MSGID_MIN = 10;
const MSGID_MAX = 99_999_999; // exclusive, like `Random.Next(10, 99999999)`

/** The app's own defaults when StatusList.json is missing. */
export function defaultStatuses(): StatusItem[] {
  return [
    createStatusItem('Enjoy 💖', { id: `${STATUS_ID_PREFIX}default-1`, active: true }),
    createStatusItem('Below you can create your own status', {
      id: `${STATUS_ID_PREFIX}default-2`,
    }),
    createStatusItem('Activate it by clicking the power icon', {
      id: `${STATUS_ID_PREFIX}default-3`,
    }),
  ];
}

/** Accepts the v2 bundle `{Version, Groups, Items}` or the v1 bare array. */
export function parseStatusList(json: JsonValue | undefined): StatusItem[] | undefined {
  if (json === undefined) {
    return undefined;
  }
  const bundle = isJsonObject(json) ? new Reader(json) : undefined;
  const items = Array.isArray(json) ? json.filter(isJsonObject) : (bundle?.objects('Items') ?? []);
  const groupNames = new Map<string, string>();
  for (const group of bundle?.objects('Groups') ?? []) {
    const reader = new Reader(group);
    groupNames.set(reader.str('GroupId', ''), reader.str('Name', ''));
  }
  const seen = new Set<string>();
  return items.map((item, index) => {
    const reader = new Reader(item);
    const msgid = reader.raw('MSGID');
    let id =
      typeof msgid === 'number'
        ? `${STATUS_ID_PREFIX}${msgid}`
        : `${STATUS_ID_PREFIX}item-${index}`;
    if (seen.has(id)) {
      id = `${id}-${index}`;
    }
    seen.add(id);
    const groupName = groupNames.get(reader.str('GroupId', '')) ?? DEFAULT_GROUP_NAME;
    return createStatusItem(reader.str('msg', ''), {
      id,
      active: reader.bool('IsActive', false),
      useInCycle: reader.bool('UseInCycle', false),
      favorite: reader.bool('IsFavorite', false),
      group: groupName === DEFAULT_GROUP_NAME ? '' : groupName,
    });
  });
}

/** FNV-1a over the text, folded into the MSGID range, so re-exports are stable. */
export function hashMsgId(text: string): number {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return MSGID_MIN + (hash % (MSGID_MAX - MSGID_MIN));
}

function msgIdFor(item: StatusItem, taken: Set<number>): number {
  const fromId = item.id.startsWith(STATUS_ID_PREFIX)
    ? Number.parseInt(item.id.slice(STATUS_ID_PREFIX.length), 10)
    : Number.NaN;
  let candidate =
    Number.isInteger(fromId) && fromId >= MSGID_MIN && fromId < MSGID_MAX
      ? fromId
      : hashMsgId(item.text);
  while (taken.has(candidate)) {
    candidate = candidate + 1 < MSGID_MAX ? candidate + 1 : MSGID_MIN;
  }
  taken.add(candidate);
  return candidate;
}

/** Group ids from a previously imported bundle, keyed by group name, so a round trip keeps them. */
function existingGroupIds(previous: JsonValue | undefined): Map<string, string> {
  const ids = new Map<string, string>();
  if (!isJsonObject(previous)) {
    return ids;
  }
  for (const group of new Reader(previous).objects('Groups')) {
    const reader = new Reader(group);
    ids.set(reader.str('Name', ''), reader.str('GroupId', newGuid()));
  }
  return ids;
}

export function serializeStatusList(
  statuses: readonly StatusItem[],
  previous: JsonValue | undefined,
  now: Date,
): JsonObject {
  const items = statuses.length > 0 ? statuses : defaultStatuses();
  const knownIds = existingGroupIds(previous);
  const previousGroups = isJsonObject(previous) ? new Reader(previous).objects('Groups') : [];
  const groups: JsonObject[] = [];
  const groupIdByName = new Map<string, string>();
  const addGroup = (name: string): void => {
    if (groupIdByName.has(name)) {
      return;
    }
    const id = knownIds.get(name) ?? newGuid();
    const old = previousGroups.find(
      (group) => asString(new Reader(group).raw('GroupId'), '') === id,
    );
    const oldReader = new Reader(old);
    groupIdByName.set(name, id);
    groups.push({
      GroupId: id,
      Name: name,
      IsActiveForCycle: oldReader.bool('IsActiveForCycle', true),
      CreationDate: oldReader.str(
        'CreationDate',
        name === DEFAULT_GROUP_NAME ? DOTNET_MIN_DATE : formatDotnetDateTime(now),
      ),
    });
  };
  addGroup(DEFAULT_GROUP_NAME);
  for (const item of items) {
    addGroup(item.group === '' ? DEFAULT_GROUP_NAME : item.group);
  }

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.active),
  );
  const taken = new Set<number>();
  const creation = formatDotnetDateTime(now);
  return {
    Version: 2,
    Groups: groups,
    Items: items.map((item, index) => ({
      GroupId: groupIdByName.get(item.group === '' ? DEFAULT_GROUP_NAME : item.group) ?? '',
      IsSelected: false,
      UseInCycle: item.useInCycle,
      CreationDate: creation,
      editMsg: '',
      IsActive: index === activeIndex,
      IsEditing: false,
      IsFavorite: item.favorite,
      LastEdited: DOTNET_MIN_DATE,
      LastUsed: DOTNET_MIN_DATE,
      msg: item.text,
      MSGID: msgIdFor(item, taken),
    })),
  };
}
