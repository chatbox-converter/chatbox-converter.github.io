import type { Segment } from '@chatbox-converter/core';
import { Chip } from '@/components/Chip';
import { Toggle } from '@/components/Toggle';
import { cx } from '@/lib/cx';
import { integrationInfo } from '@/lib/integration-catalog';
import styles from './IntegrationCard.module.css';

interface IntegrationCardProps {
  readonly segment: Segment;
  readonly previewText: string;
  /** Rendered but hidden in the current preview mode. */
  readonly hiddenInMode: boolean;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly onPatch: (patch: Partial<Omit<Segment, 'id' | 'kind'>>) => void;
  readonly onMove: (direction: -1 | 1) => void;
  readonly onRemove: () => void;
  readonly onCustomize: () => void;
}

export function IntegrationCard({
  segment,
  previewText,
  hiddenInMode,
  isFirst,
  isLast,
  onPatch,
  onMove,
  onRemove,
  onCustomize,
}: IntegrationCardProps): React.JSX.Element {
  const info = integrationInfo(segment.kind);
  const live = segment.enabled && !hiddenInMode && previewText !== '';
  const transient = segment.options.kind === 'media' ? segment.options.transient : null;

  return (
    <article
      className={cx(styles.card, !segment.enabled && styles.off)}
      aria-label={info.title}
      data-kind={segment.kind}
    >
      <span className={cx(styles.rail, live && styles.railLive)} aria-hidden="true" />
      <div className={styles.iconFrame} aria-hidden="true">
        <img className={styles.icon} src={info.icon} alt="" width="42" height="42" />
      </div>
      <div className={styles.text}>
        <h2 className={styles.title}>
          {info.title}
          {live ? <span className={styles.pill}>{previewText}</span> : null}
        </h2>
        <p className={styles.description}>{info.description}</p>
      </div>
      <div className={styles.deck}>
        <div className={styles.deckRow}>
          {transient === null ? null : (
            <Chip
              variant="feature"
              label="TRANSIENT"
              on={transient}
              title="Show the song for a few seconds after it changes, then hide it again."
              onClick={() => {
                if (segment.options.kind === 'media') {
                  onPatch({ options: { ...segment.options, transient: !transient } });
                }
              }}
            />
          )}
          {info.vrOnly ? (
            <Chip
              variant="static"
              label="VR ONLY"
              title="This integration only appears while you're in VR. It has no desktop mode."
            />
          ) : (
            <>
              <Chip
                label="DESKTOP"
                on={segment.visibility.desktop}
                title="Show this integration while you're on desktop."
                onClick={() => {
                  onPatch({
                    visibility: { ...segment.visibility, desktop: !segment.visibility.desktop },
                  });
                }}
              />
              <Chip
                label="VR"
                on={segment.visibility.vr}
                title="Show this integration while you're in VR."
                onClick={() => {
                  onPatch({ visibility: { ...segment.visibility, vr: !segment.visibility.vr } });
                }}
              />
            </>
          )}
        </div>
        <div className={styles.deckRow}>
          <button
            type="button"
            className={styles.orderButton}
            aria-label={`Move ${info.title} up`}
            disabled={isFirst}
            onClick={() => {
              onMove(-1);
            }}
          >
            ↑
          </button>
          <button
            type="button"
            className={styles.orderButton}
            aria-label={`Move ${info.title} down`}
            disabled={isLast}
            onClick={() => {
              onMove(1);
            }}
          >
            ↓
          </button>
          <Chip
            variant="door"
            label="REMOVE"
            title="Remove this integration from the line."
            onClick={onRemove}
          />
          <Chip variant="door" label="CUSTOMIZE ›" onClick={onCustomize} />
        </div>
      </div>
      <div className={styles.switch}>
        <Toggle
          size="large"
          label={`Enable ${info.title}`}
          checked={segment.enabled}
          onChange={(enabled) => {
            onPatch({ enabled });
          }}
        />
      </div>
    </article>
  );
}
