import { useState } from 'react';
import { cx } from '@/lib/cx';
import { counterTone, STATUS_CHAR_LIMIT } from './status-helpers';
import styles from './StatusComposer.module.css';

interface StatusComposerProps {
  readonly text: string;
  readonly onTextChange: (text: string) => void;
  readonly onCreate: (text: string) => void;
}

export function StatusComposer({
  text,
  onTextChange,
  onCreate,
}: StatusComposerProps): React.JSX.Element {
  const [touched, setTouched] = useState(false);
  const length = text.length;
  const tone = counterTone(length);
  const canCreate = text.trim() !== '' && length <= STATUS_CHAR_LIMIT;

  function create(): void {
    if (!canCreate) {
      return;
    }
    onCreate(text.trim());
    onTextChange('');
    setTouched(false);
  }

  return (
    <div className={styles.composer}>
      <div className={styles.field}>
        <input
          className={styles.input}
          type="text"
          aria-label="New status"
          placeholder="Create here a new status"
          value={text}
          onChange={(event) => {
            setTouched(true);
            onTextChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              create();
            }
          }}
        />
        <span
          className={cx(
            styles.counter,
            tone === 'near' && styles.near,
            tone === 'over' && styles.over,
            touched && styles.counterVisible,
          )}
          aria-live="polite"
        >
          {length}/{STATUS_CHAR_LIMIT}
        </span>
      </div>
      <button type="button" className={styles.create} disabled={!canCreate} onClick={create}>
        Create
      </button>
    </div>
  );
}
