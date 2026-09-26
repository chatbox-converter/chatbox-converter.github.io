import { renderPreview, type PreviewMode } from '@chatbox-converter/core';
import { Checkbox } from '@/components/Checkbox';
import { cx } from '@/lib/cx';
import { useProfile } from '@/state/profile-context';
import styles from './Sidebar.module.css';

interface SidebarProps {
  readonly previewMode: PreviewMode;
}

export function Sidebar({ previewMode }: SidebarProps): React.JSX.Element {
  const { profile, dispatch } = useProfile();
  const preview = renderPreview(profile, previewMode);
  const groups = [...new Set(profile.statuses.map((status) => status.group))];
  const cycling = profile.statuses.filter((status) => status.useInCycle).length;

  return (
    <aside className={styles.sidebar} aria-label="Preview and quick settings">
      <div className={styles.previewHeader}>
        <span className={styles.previewTitle}>PREVIEW</span>
        <span
          className={cx(styles.counter, preview.overLimit && styles.counterOver)}
          title={`${preview.length} of ${preview.limit} characters`}
        >
          {preview.length}/{preview.limit}
        </span>
      </div>
      <div className={styles.previewBox} aria-live="polite">
        <pre className={styles.previewText}>{preview.text === '' ? ' ' : preview.text}</pre>
        <span className={styles.previewIcon} aria-hidden="true" />
      </div>

      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>STATUS SET</h3>
        <select
          className={styles.select}
          aria-label="Status set"
          value=""
          onChange={(event) => {
            const group = event.target.value;
            const first = profile.statuses.find((status) => status.group === group);
            if (first !== undefined) {
              dispatch({ type: 'status/activate', id: first.id });
            }
          }}
        >
          <option value="">Every set</option>
          {groups.map((group) => (
            <option key={group} value={group}>
              {group === '' ? 'Default' : group}
            </option>
          ))}
        </select>
        <div className={styles.panelRow}>
          <span className={styles.panelHint}>
            {cycling === 0 ? 'Nothing marked to cycle…' : `${cycling} marked to cycle`}
          </span>
          <button
            type="button"
            className={cx(styles.chip, profile.statusCycle.enabled && styles.chipOn)}
            onClick={() => {
              dispatch({
                type: 'statusCycle/update',
                patch: { enabled: !profile.statusCycle.enabled },
              });
            }}
          >
            CYCLE
          </button>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>AWAY FROM KEYBOARD</h3>
          <button
            type="button"
            className={cx(styles.chip, profile.afk.enabled && styles.chipOn)}
            onClick={() => {
              dispatch({ type: 'afk/update', patch: { enabled: !profile.afk.enabled } });
            }}
          >
            {profile.afk.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <input
          className={styles.input}
          aria-label="AFK message"
          value={profile.afk.template}
          onChange={(event) => {
            dispatch({ type: 'afk/update', patch: { template: event.target.value } });
          }}
        />
        <div className={styles.panelRow}>
          <span className={styles.panelHint}>
            Away in{' '}
            <strong>
              {Math.floor(profile.afk.timeoutSeconds / 60)}
              <sup>m</sup> {profile.afk.timeoutSeconds % 60}
              <sup>s</sup>
            </strong>
          </span>
          <input
            type="number"
            min={0}
            step={30}
            className={styles.numberInput}
            aria-label="AFK timeout in seconds"
            value={profile.afk.timeoutSeconds}
            onChange={(event) => {
              dispatch({
                type: 'afk/update',
                patch: { timeoutSeconds: Math.max(0, Number(event.target.value)) },
              });
            }}
          />
        </div>
      </section>

      <div className={styles.quick}>
        <Checkbox
          labelFirst
          label="Separate with new lines"
          checked={profile.output.separateWithNewlines}
          onChange={(checked) => {
            dispatch({ type: 'output/update', patch: { separateWithNewlines: checked } });
          }}
        />
        <Checkbox
          labelFirst
          label="Minimal background"
          checked={profile.output.minimalBackground}
          onChange={(checked) => {
            dispatch({ type: 'output/update', patch: { minimalBackground: checked } });
          }}
        />
      </div>

      <div className={styles.footer}>
        <div className={styles.versionCard}>
          <span className={styles.versionLabel}>PROFILE</span>
          <input
            className={styles.nameInput}
            aria-label="Profile name"
            value={profile.meta.name}
            onChange={(event) => {
              dispatch({ type: 'rename', name: event.target.value });
            }}
          />
          <span className={styles.versionLabel}>
            {profile.meta.source === null ? 'Created here' : `Imported from ${profile.meta.source}`}
          </span>
        </div>
      </div>
    </aside>
  );
}
