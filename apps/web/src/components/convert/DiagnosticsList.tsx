import type { Diagnostic } from '@chatbox-converter/core';
import { cx } from '@/lib/cx';
import styles from './DiagnosticsList.module.css';

interface DiagnosticsListProps {
  readonly diagnostics: readonly Diagnostic[];
  readonly emptyText?: string;
}

const ICONS: Readonly<Record<Diagnostic['level'], string>> = {
  info: 'ℹ',
  warning: '⚠',
  error: '✕',
};

const LEVEL_CLASS: Readonly<Record<Diagnostic['level'], string>> = {
  info: styles.info,
  warning: styles.warning,
  error: styles.error,
};

export function DiagnosticsList({
  diagnostics,
  emptyText = 'Nothing was lost.',
}: DiagnosticsListProps): React.JSX.Element {
  if (diagnostics.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }
  return (
    <ul className={styles.list} aria-label="Conversion notes">
      {diagnostics.map((diagnostic, index) => (
        <li
          key={`${diagnostic.code}-${String(index)}`}
          className={cx(styles.item, LEVEL_CLASS[diagnostic.level])}
        >
          <span className={styles.icon} aria-hidden="true">
            {ICONS[diagnostic.level]}
          </span>
          <span className={styles.message}>
            {diagnostic.message}
            {diagnostic.path === undefined ? null : (
              <code className={styles.path}>{diagnostic.path}</code>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
