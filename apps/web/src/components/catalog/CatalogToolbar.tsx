import { PLACEHOLDER_CATEGORIES, type PlaceholderCategory } from '@chatbox-converter/core';
import { Chip } from '@/components/Chip';
import {
  APP_TITLES,
  CATALOG_APPS,
  CATEGORY_TITLES,
  toggleApp,
  type CatalogApp,
  type CatalogFilter,
} from './catalog-helpers';
import styles from './CatalogToolbar.module.css';

interface CatalogToolbarProps {
  readonly filter: CatalogFilter;
  readonly onChange: (next: CatalogFilter) => void;
  readonly summary: string;
}

export function CatalogToolbar({
  filter,
  onChange,
  summary,
}: CatalogToolbarProps): React.JSX.Element {
  const setCategory = (category: PlaceholderCategory | null): void => {
    onChange({ ...filter, category });
  };
  const flipApp = (app: CatalogApp): void => {
    onChange({ ...filter, apps: toggleApp(filter.apps, app) });
  };
  return (
    <div className={styles.toolbar}>
      <div className={styles.row}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search placeholders, labels, modules, tokens…"
          aria-label="Search placeholders"
          value={filter.query}
          onChange={(event) => {
            onChange({ ...filter, query: event.target.value });
          }}
        />
        <div className={styles.apps} role="group" aria-label="Apps">
          {CATALOG_APPS.map((app) => (
            <Chip
              key={app}
              label={APP_TITLES[app]}
              variant="feature"
              on={filter.apps.includes(app)}
              title={
                filter.apps.includes(app) ? `Hide ${APP_TITLES[app]}` : `Show ${APP_TITLES[app]}`
              }
              onClick={() => {
                flipApp(app);
              }}
            />
          ))}
        </div>
      </div>
      <div className={styles.chips} role="group" aria-label="Categories">
        <Chip
          label="All"
          on={filter.category === null}
          onClick={() => {
            setCategory(null);
          }}
        />
        {PLACEHOLDER_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={CATEGORY_TITLES[category]}
            on={filter.category === category}
            onClick={() => {
              setCategory(filter.category === category ? null : category);
            }}
          />
        ))}
      </div>
      <p className={styles.summary} aria-live="polite">
        {summary}
      </p>
    </div>
  );
}
