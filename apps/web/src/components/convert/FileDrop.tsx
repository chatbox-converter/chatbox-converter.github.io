import { useId, useRef, useState, type DragEvent } from 'react';
import { cx } from '@/lib/cx';
import styles from './FileDrop.module.css';

interface FileDropProps {
  readonly onFiles: (files: File[]) => void;
  readonly busy: boolean;
}

/** Drop zone plus "pick files" / "pick a folder" buttons. */
export function FileDrop({ onFiles, busy }: FileDropProps): React.JSX.Element {
  const [dragging, setDragging] = useState(false);
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const hintId = useId();

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    onFiles([...event.dataTransfer.files]);
  }

  return (
    <div
      className={cx(styles.zone, dragging && styles.dragging, busy && styles.busy)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => {
        setDragging(false);
      }}
      onDrop={handleDrop}
      aria-describedby={hintId}
    >
      <p className={styles.title}>Drop your config files here</p>
      <p id={hintId} className={styles.hint}>
        A single JSON file, a whole folder, or a .zip of it. Everything stays in your browser.
      </p>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.button}
          disabled={busy}
          onClick={() => filesInput.current?.click()}
        >
          Pick files
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={busy}
          onClick={() => folderInput.current?.click()}
        >
          Pick a folder
        </button>
      </div>
      <input
        ref={filesInput}
        type="file"
        multiple
        accept=".json,.zip,application/json,application/zip"
        className="visually-hidden"
        aria-label="Pick config files"
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
      <input
        ref={folderInput}
        type="file"
        // Non-standard but supported by every current browser.
        webkitdirectory=""
        className="visually-hidden"
        aria-label="Pick a config folder"
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
