import { createStatusItem } from '@chatbox-converter/core';
import { useState } from 'react';
import {
  distinctGroups,
  messageBarText,
  sortStatuses,
  type SortMode,
} from '@/components/status/status-helpers';
import { StatusComposer } from '@/components/status/StatusComposer';
import { StatusRow } from '@/components/status/StatusRow';
import { StatusToolbar } from '@/components/status/StatusToolbar';
import { useProfile } from '@/state/profile-context';
import styles from './StatusPage.module.css';

export function StatusPage(): React.JSX.Element {
  const { profile, dispatch } = useProfile();
  const [sortMode, setSortMode] = useState<SortMode>('created');
  const [descending, setDescending] = useState(true);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  /** A group typed in the toolbar that no status uses yet; new statuses go there. */
  const [pendingGroup, setPendingGroup] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerText, setComposerText] = useState('');

  const groups = distinctGroups(profile.statuses, [pendingGroup]);
  const visible = sortStatuses(
    groupFilter === null
      ? profile.statuses
      : profile.statuses.filter((item) => item.group === groupFilter),
    sortMode,
    descending,
  );
  const composerGroup = groupFilter ?? pendingGroup;
  const selected = profile.statuses.find((item) => item.id === selectedId);

  function createGroup(name: string): void {
    if (selected === undefined) {
      setPendingGroup(name);
    } else {
      dispatch({ type: 'status/update', id: selected.id, patch: { group: name } });
    }
    setGroupFilter(name);
  }

  return (
    <div className={styles.page}>
      <StatusToolbar
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        descending={descending}
        onDescendingChange={setDescending}
        groups={groups}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        onCreateGroup={createGroup}
        cycleEnabled={profile.statusCycle.enabled}
        onCycleEnabledChange={(enabled) => {
          dispatch({ type: 'statusCycle/update', patch: { enabled } });
        }}
        onOpenSettings={() => {
          window.location.hash = '/options?section=status';
        }}
      />
      <ul className={styles.list} aria-label="Statuses">
        {visible.map((item) => (
          <StatusRow
            key={item.id}
            item={item}
            groups={groups}
            selected={item.id === selectedId}
            onSelect={() => {
              setSelectedId(item.id);
            }}
            onActivate={() => {
              dispatch({ type: 'status/activate', id: item.id });
            }}
            onRemove={() => {
              dispatch({ type: 'status/remove', id: item.id });
            }}
            onPatch={(patch) => {
              dispatch({ type: 'status/update', id: item.id, patch });
            }}
          />
        ))}
      </ul>
      {visible.length === 0 ? (
        <p className={styles.empty}>
          {profile.statuses.length === 0
            ? 'No statuses yet. Create one below.'
            : 'No statuses in this group yet. Create one below and it lands here.'}
        </p>
      ) : null}
      <div className={styles.messageBar} role="status">
        {messageBarText(composerText.length, profile.statuses, profile.statusCycle)}
      </div>
      <StatusComposer
        text={composerText}
        onTextChange={setComposerText}
        onCreate={(text) => {
          dispatch({ type: 'status/add', item: createStatusItem(text, { group: composerGroup }) });
        }}
      />
    </div>
  );
}
