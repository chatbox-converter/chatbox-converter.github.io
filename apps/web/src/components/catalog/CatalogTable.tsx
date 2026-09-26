import type { PlaceholderCoverage } from '@chatbox-converter/core';
import { useEffect, useState } from 'react';
import { OptionGroupHeader } from '@/components/options/OptionGroupHeader';
import { cx } from '@/lib/cx';
import { APP_TITLES, missingIn, providersFor, type CatalogApp } from './catalog-helpers';
import styles from './CatalogTable.module.css';
import { ProviderPill } from './ProviderPill';

interface CatalogTableProps {
  readonly title: string;
  readonly rows: readonly PlaceholderCoverage[];
  readonly apps: readonly CatalogApp[];
}

const COPIED_MS = 1200;

function PlaceholderCell({ entry }: { readonly entry: PlaceholderCoverage }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const handle = window.setTimeout(() => {
      setCopied(false);
    }, COPIED_MS);
    return () => {
      window.clearTimeout(handle);
    };
  }, [copied]);
  const token = `{${entry.name}}`;
  return (
    <button
      type="button"
      className={cx(styles.copy, copied && styles.copied)}
      title={copied ? 'Copied' : `Copy ${token}`}
      aria-label={`Copy ${token}`}
      onClick={() => {
        void navigator.clipboard.writeText(token).then(() => {
          setCopied(true);
        });
      }}
    >
      <code className={styles.token}>{token}</code>
      <span className={styles.label}>{copied ? 'copied' : entry.label}</span>
    </button>
  );
}

/** One category: MagicChatbox-style group header plus a provider table. */
export function CatalogTable({ title, rows, apps }: CatalogTableProps): React.JSX.Element {
  return (
    <section className={styles.section} aria-label={title}>
      <OptionGroupHeader title={title} />
      <div className={styles.scroller}>
        <table className={styles.table} style={{ minWidth: `${420 + apps.length * 180}px` }}>
          <thead>
            <tr>
              <th scope="col" className={styles.thPlaceholder}>
                Placeholder
              </th>
              <th scope="col" className={styles.thSample}>
                Sample
              </th>
              {apps.map((app) => (
                <th key={app} scope="col">
                  {APP_TITLES[app]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr
                key={entry.name}
                className={cx(styles.row, missingIn(entry, apps) && styles.gap)}
                data-placeholder={entry.name}
              >
                <td>
                  <PlaceholderCell entry={entry} />
                </td>
                <td>
                  <span className={styles.sample}>{entry.sample}</span>
                </td>
                {apps.map((app) => {
                  const providers = providersFor(entry, app);
                  return (
                    <td key={app}>
                      {providers.length === 0 ? (
                        <span className={styles.none} aria-label="No provider">
                          —
                        </span>
                      ) : (
                        <div className={styles.pills}>
                          {providers.map((provider) => (
                            <ProviderPill
                              key={`${provider.name}:${provider.detail}:${provider.note ?? ''}`}
                              provider={provider}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
