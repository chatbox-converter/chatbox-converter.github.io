import type { ProviderRef } from '@chatbox-converter/core';
import { cx } from '@/lib/cx';
import styles from './ProviderPill.module.css';

interface ProviderPillProps {
  readonly provider: ProviderRef;
}

const KIND_LABELS: Readonly<Record<ProviderRef['kind'], string>> = {
  builtin: 'built-in',
  official: 'official module',
  community: 'community module',
  plugin: 'plugin',
  integration: 'integration',
};

/** Compact "● Name detail ⓘ" pill; community modules and plugins link to their repository. */
export function ProviderPill({ provider }: ProviderPillProps): React.JSX.Element {
  const title = [KIND_LABELS[provider.kind], provider.note].filter(Boolean).join(' · ');
  const body = (
    <>
      <span className={cx(styles.dot, styles[provider.kind])} aria-hidden="true" />
      <span className={styles.name}>{provider.name}</span>
      <code className={styles.detail}>{provider.detail}</code>
      {provider.note === undefined ? null : (
        <span className={styles.info} aria-label={provider.note}>
          ⓘ
        </span>
      )}
    </>
  );
  const linked =
    provider.repository !== undefined &&
    (provider.kind === 'community' || provider.kind === 'plugin');
  if (linked) {
    return (
      <a
        className={cx(styles.pill, styles.link)}
        href={`https://github.com/${provider.repository ?? ''}`}
        target="_blank"
        rel="noreferrer"
        title={title}
      >
        {body}
      </a>
    );
  }
  return (
    <span className={styles.pill} title={title}>
      {body}
    </span>
  );
}
