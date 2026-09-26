import { CHATBOX_CHAR_LIMIT } from '@chatbox-converter/core';
import { cx } from '@/lib/cx';
import styles from './SegmentPreview.module.css';

interface SegmentPreviewProps {
  readonly text: string;
  readonly caption?: string | undefined;
  readonly limit?: number;
}

/** The dark r8 box with the rendered line on the left and the "n/144" chip on the right. */
export function SegmentPreview({
  text,
  caption,
  limit = CHATBOX_CHAR_LIMIT,
}: SegmentPreviewProps): React.JSX.Element {
  const length = text.length;
  const level = length > limit ? 'full' : length > limit * 0.8 ? 'tight' : 'room';
  return (
    <div className={styles.wrap}>
      {caption === undefined ? null : <p className={styles.caption}>{caption}</p>}
      <div className={styles.box} aria-live="polite">
        <pre className={cx(styles.text, text === '' && styles.empty)} data-testid="segment-preview">
          {text === '' ? 'Nothing to show yet' : text}
        </pre>
        <span
          className={cx(
            styles.chip,
            level === 'tight' && styles.tight,
            level === 'full' && styles.full,
          )}
          title={`${length} of ${limit} characters`}
        >
          {length}/{limit}
        </span>
      </div>
    </div>
  );
}
