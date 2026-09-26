import { Toggle } from '@/components/Toggle';
import { cx } from '@/lib/cx';
import { PAGE_LABELS, PAGES, type PageId } from '@/pages/pages';
import styles from './TopBar.module.css';

interface TopBarProps {
  readonly page: PageId;
  readonly onNavigate: (page: PageId) => void;
  readonly previewMode: 'desktop' | 'vr';
  readonly onPreviewModeChange: (mode: 'desktop' | 'vr') => void;
}

export function TopBar({
  page,
  onNavigate,
  previewMode,
  onPreviewModeChange,
}: TopBarProps): React.JSX.Element {
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.brandTop}>VRC OSC</span>
        <span className={styles.brandName}>Chatbox Converter</span>
      </div>
      <nav className={styles.tabs} aria-label="Pages">
        {PAGES.map((id) => (
          <button
            key={id}
            type="button"
            className={cx(
              styles.tab,
              page === id && styles.active,
              id === 'convert' && styles.highlight,
            )}
            aria-current={page === id ? 'page' : undefined}
            onClick={() => {
              onNavigate(id);
            }}
          >
            <span className={styles.tabLabel}>{PAGE_LABELS[id]}</span>
          </button>
        ))}
      </nav>
      <div className={styles.spacer} />
      <a
        className={styles.iconLink}
        href="https://github.com/chatbox-converter/chatbox-converter.github.io"
        target="_blank"
        rel="noreferrer"
        aria-label="Source code on GitHub"
        title="Source code on GitHub"
      >
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
          />
        </svg>
      </a>
      <div className={styles.sendBox}>
        <span className={styles.sendLabel}>Preview mode</span>
        <div className={styles.sendRow}>
          <span className={styles.modeText}>{previewMode === 'vr' ? 'VR' : 'DESKTOP'}</span>
          <Toggle
            size="large"
            label="Preview as VR"
            checked={previewMode === 'vr'}
            onChange={(checked) => {
              onPreviewModeChange(checked ? 'vr' : 'desktop');
            }}
          />
        </div>
      </div>
    </header>
  );
}
