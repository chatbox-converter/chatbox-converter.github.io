import { useState } from 'react';
import { cx } from '@/lib/cx';
import {
  ALL_GROUPS,
  groupDisplayName,
  groupFromOptionValue,
  groupOptionValue,
  isSortMode,
  SORT_LABELS,
  SORT_MODES,
  type SortMode,
} from './status-helpers';
import styles from './StatusToolbar.module.css';

interface StatusToolbarProps {
  readonly sortMode: SortMode;
  readonly onSortModeChange: (mode: SortMode) => void;
  readonly descending: boolean;
  readonly onDescendingChange: (descending: boolean) => void;
  readonly groups: readonly string[];
  /** `null` = all groups. */
  readonly groupFilter: string | null;
  readonly onGroupFilterChange: (group: string | null) => void;
  readonly onCreateGroup: (name: string) => void;
  readonly cycleEnabled: boolean;
  readonly onCycleEnabledChange: (enabled: boolean) => void;
  readonly onOpenSettings: () => void;
}

export function StatusToolbar({
  sortMode,
  onSortModeChange,
  descending,
  onDescendingChange,
  groups,
  groupFilter,
  onGroupFilterChange,
  onCreateGroup,
  cycleEnabled,
  onCycleEnabledChange,
  onOpenSettings,
}: StatusToolbarProps): React.JSX.Element {
  const [newGroup, setNewGroup] = useState('');
  const trimmed = newGroup.trim();

  function submitGroup(): void {
    if (trimmed === '') {
      return;
    }
    onCreateGroup(trimmed);
    setNewGroup('');
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <select
          className={cx(styles.control, styles.sortSelect)}
          aria-label="Sort statuses"
          value={sortMode}
          onChange={(event) => {
            if (isSortMode(event.target.value)) {
              onSortModeChange(event.target.value);
            }
          }}
        >
          {SORT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {SORT_LABELS[mode]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={cx(styles.button, styles.square)}
          aria-label={descending ? 'Sort ascending' : 'Sort descending'}
          title={descending ? 'Descending' : 'Ascending'}
          onClick={() => {
            onDescendingChange(!descending);
          }}
        >
          {descending ? '↓' : '↑'}
        </button>
      </div>
      <div className={styles.centre}>
        <span className={styles.groupLabel}>Group:</span>
        <select
          className={cx(styles.control, styles.groupSelect)}
          aria-label="Filter by group"
          value={groupFilter === null ? ALL_GROUPS : groupOptionValue(groupFilter)}
          onChange={(event) => {
            onGroupFilterChange(groupFromOptionValue(event.target.value));
          }}
        >
          <option value={ALL_GROUPS}>All groups</option>
          {groups.map((group) => (
            <option key={group} value={groupOptionValue(group)}>
              {groupDisplayName(group)}
            </option>
          ))}
        </select>
        <input
          className={cx(styles.control, styles.newGroup)}
          type="text"
          aria-label="New group name"
          placeholder="New group"
          value={newGroup}
          onChange={(event) => {
            setNewGroup(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submitGroup();
            }
          }}
        />
        <button
          type="button"
          className={cx(styles.button, styles.square)}
          aria-label="Add group"
          title="Add group"
          disabled={trimmed === ''}
          onClick={submitGroup}
        >
          +
        </button>
      </div>
      <div className={styles.right}>
        <button
          type="button"
          role="switch"
          aria-checked={cycleEnabled}
          aria-label="Auto cycle"
          className={cx(styles.glowy, cycleEnabled && styles.glowyOn)}
          onClick={() => {
            onCycleEnabledChange(!cycleEnabled);
          }}
        >
          Auto <span aria-hidden="true">💛</span> cycle
        </button>
        <button
          type="button"
          className={styles.gear}
          aria-label="Status settings"
          title="Status settings"
          onClick={onOpenSettings}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.3 7.3 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.65 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
