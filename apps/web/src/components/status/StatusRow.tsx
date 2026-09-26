import type { StatusItem } from '@chatbox-converter/core';
import { useState } from 'react';
import { cx } from '@/lib/cx';
import { groupDisplayName } from './status-helpers';
import styles from './StatusRow.module.css';

interface StatusRowProps {
  readonly item: StatusItem;
  readonly groups: readonly string[];
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onActivate: () => void;
  readonly onRemove: () => void;
  readonly onPatch: (patch: Partial<Omit<StatusItem, 'id'>>) => void;
}

export function StatusRow({
  item,
  groups,
  selected,
  onSelect,
  onActivate,
  onRemove,
  onPatch,
}: StatusRowProps): React.JSX.Element {
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;

  function commit(): void {
    if (draft !== null) {
      const text = draft.trim();
      if (text !== '' && text !== item.text) {
        onPatch({ text });
      }
    }
    setDraft(null);
  }

  return (
    <li
      className={cx(styles.card, selected && styles.selected, item.active && styles.active)}
      aria-label={item.text}
      aria-current={item.active ? 'true' : undefined}
      onClick={onSelect}
    >
      <button
        type="button"
        className={cx(styles.activate, item.active && styles.activated)}
        aria-label={item.active ? `Active: ${item.text}` : `Activate ${item.text}`}
        aria-pressed={item.active}
        title={item.active ? 'This status is shown right now' : 'Show this status'}
        onClick={onActivate}
      >
        <img
          src={item.active ? '/icons/ActivatedStatus_ico.png' : '/icons/ActivateStatus_ico.png'}
          alt=""
          width="22"
          height="22"
        />
      </button>
      <button
        type="button"
        className={styles.delete}
        aria-label={`Delete ${item.text}`}
        title="Delete"
        onClick={onRemove}
      >
        <img src="/icons/Delete_ico.png" alt="" width="20" height="20" />
      </button>
      <div className={styles.textCell}>
        {editing ? (
          <>
            <input
              className={styles.editInput}
              type="text"
              aria-label="Edit status text"
              value={draft}
              autoFocus
              onChange={(event) => {
                setDraft(event.target.value);
              }}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commit();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  setDraft(null);
                }
              }}
            />
            <button
              type="button"
              className={styles.cancel}
              aria-label="Cancel editing"
              title="Cancel"
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                setDraft(null);
              }}
            >
              ✕
            </button>
          </>
        ) : (
          <span className={styles.text}>{item.text}</span>
        )}
      </div>
      <button
        type="button"
        className={cx(styles.edit, editing && styles.editOn)}
        aria-label={editing ? `Stop editing ${item.text}` : `Edit ${item.text}`}
        aria-pressed={editing}
        title="Edit"
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={() => {
          if (editing) {
            commit();
          } else {
            setDraft(item.text);
          }
        }}
      >
        <img src="/icons/Edit_ico.png" alt="" width="15" height="15" />
      </button>
      <select
        className={styles.group}
        aria-label={`Group of ${item.text}`}
        value={item.group}
        onChange={(event) => {
          onPatch({ group: event.target.value });
        }}
      >
        {groups.map((group) => (
          <option key={group} value={group}>
            {groupDisplayName(group)}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={styles.fav}
        aria-label={
          item.useInCycle ? `Remove ${item.text} from cycle` : `Add ${item.text} to cycle`
        }
        aria-pressed={item.useInCycle}
        title={item.useInCycle ? 'Marked for Auto cycle' : 'Mark for Auto cycle'}
        onClick={() => {
          onPatch({ useInCycle: !item.useInCycle });
        }}
      >
        <img
          src={item.useInCycle ? '/icons/Unfavorite_ico.png' : '/icons/Favorite_ico.png'}
          alt=""
          width="22"
          height="22"
        />
      </button>
    </li>
  );
}
