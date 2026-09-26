import {
  createSegment,
  isSegmentVisible,
  renderPreview,
  type PreviewMode,
  type SegmentKind,
} from '@chatbox-converter/core';
import { IntegrationCard } from '@/components/IntegrationCard';
import { cx } from '@/lib/cx';
import { INTEGRATIONS, integrationInfo } from '@/lib/integration-catalog';
import { useProfile } from '@/state/profile-context';
import styles from './IntegrationsPage.module.css';

interface IntegrationsPageProps {
  readonly previewMode: PreviewMode;
}

export function IntegrationsPage({ previewMode }: IntegrationsPageProps): React.JSX.Element {
  const { profile, dispatch } = useProfile();
  const preview = renderPreview(profile, previewMode);
  const hiddenNames = profile.segments
    .filter((segment) => segment.enabled && !isSegmentVisible(segment, previewMode))
    .map((segment) => integrationInfo(segment.kind).title);
  const presentKinds = new Set(profile.segments.map((segment) => segment.kind));
  const addable = INTEGRATIONS.filter((info) => info.allowMultiple || !presentKinds.has(info.kind));

  function addSegment(kind: SegmentKind): void {
    dispatch({ type: 'segment/add', segment: createSegment(kind) });
  }

  return (
    <div className={styles.page}>
      {hiddenNames.length > 0 ? (
        <div className={styles.hint} role="status">
          <span aria-hidden="true">👁</span> Enabled but not shown in{' '}
          {previewMode === 'vr' ? 'VR' : 'Desktop'} mode: {hiddenNames.join(', ')}. Turn on their{' '}
          {previewMode === 'vr' ? 'VR' : 'Desktop'} switch to see them.
        </div>
      ) : null}
      {preview.overLimit ? (
        <div className={cx(styles.hint, styles.hintTrim)} role="status">
          <span aria-hidden="true">✂</span> No room in the {preview.limit} characters: the line is{' '}
          {preview.length - preview.limit} over. VRChat drops lines that are too long.
        </div>
      ) : null}
      <div className={styles.list}>
        {profile.segments.map((segment, index) => {
          const rendered = preview.segments.find((entry) => entry.segment.id === segment.id);
          return (
            <IntegrationCard
              key={segment.id}
              segment={segment}
              previewText={rendered?.text ?? ''}
              hiddenInMode={!isSegmentVisible(segment, previewMode)}
              isFirst={index === 0}
              isLast={index === profile.segments.length - 1}
              onPatch={(patch) => {
                dispatch({ type: 'segment/update', id: segment.id, patch });
              }}
              onMove={(direction) => {
                dispatch({ type: 'segment/move', id: segment.id, toIndex: index + direction });
              }}
              onRemove={() => {
                dispatch({ type: 'segment/remove', id: segment.id });
              }}
              onCustomize={() => {
                window.location.hash = `/options?section=${integrationInfo(segment.kind).optionsSection}&segment=${segment.id}`;
              }}
            />
          );
        })}
      </div>
      <section className={styles.addStrip} aria-label="Add an integration">
        <span className={styles.addLabel}>Add to the line</span>
        <div className={styles.addChips}>
          {addable.map((info) => (
            <button
              key={info.kind}
              type="button"
              className={styles.addChip}
              onClick={() => {
                addSegment(info.kind);
              }}
            >
              <img src={info.icon} alt="" width="16" height="16" /> {info.title}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
