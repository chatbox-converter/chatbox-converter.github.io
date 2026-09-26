import { placeholderCoverage, type ProviderKind } from '@chatbox-converter/core';
import { useMemo, useState } from 'react';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { CatalogToolbar } from '@/components/catalog/CatalogToolbar';
import {
  DEFAULT_FILTER,
  filterCoverage,
  groupByCategory,
  summarize,
  summaryText,
  type CatalogFilter,
} from '@/components/catalog/catalog-helpers';
import styles from './CatalogPage.module.css';

const LEGEND: readonly (readonly [ProviderKind, string])[] = [
  ['builtin', 'Built-in variable / token'],
  ['official', 'VRCOSC official module'],
  ['community', 'VRCOSC community module'],
  ['plugin', 'DreamChatbox plugin'],
  ['integration', 'MagicChatbox integration'],
];

/** Reference: every canonical placeholder and what provides it in each app. */
export function CatalogPage(): React.JSX.Element {
  const all = useMemo(() => placeholderCoverage(), []);
  const [filter, setFilter] = useState<CatalogFilter>(DEFAULT_FILTER);
  const shown = useMemo(() => filterCoverage(all, filter), [all, filter]);
  const groups = useMemo(() => groupByCategory(shown), [shown]);
  const summary = summaryText(summarize(shown, all.length));

  return (
    <div className={styles.page}>
      <CatalogToolbar filter={filter} onChange={setFilter} summary={summary} />
      {groups.length === 0 ? (
        <p className={styles.empty}>No placeholder matches “{filter.query}”.</p>
      ) : (
        groups.map((group) => (
          <CatalogTable
            key={group.category}
            title={group.title}
            rows={group.rows}
            apps={filter.apps}
          />
        ))
      )}
      <footer className={styles.legend} aria-label="Legend">
        <ul className={styles.legendList}>
          {LEGEND.map(([kind, text]) => (
            <li key={kind} className={styles.legendItem}>
              <span className={`${styles.dot} ${styles[kind]}`} aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Rows with a yellow tint lack a provider in one of the shown apps. VRCOSC community modules
          are not bundled with VRCOSC: install them from their package repositories (the pill links
          there). DreamChatbox plugin tokens need the named plugin enabled.
        </p>
      </footer>
    </div>
  );
}
