import type { PreviewMode } from '@chatbox-converter/core';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { CatalogPage } from '@/pages/CatalogPage';
import { ConvertPage } from '@/pages/ConvertPage';
import { IntegrationsPage } from '@/pages/IntegrationsPage';
import { OptionsPage } from '@/pages/OptionsPage';
import { StatusPage } from '@/pages/StatusPage';
import { isPageId, type PageId } from '@/pages/pages';
import { ProfileProvider } from '@/state/ProfileProvider';
import styles from './App.module.css';

function pageFromHash(): PageId {
  // `#/options?section=media` carries a query the Options page reads itself.
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  return isPageId(hash) ? hash : 'integrations';
}

export function App(): React.JSX.Element {
  const [page, setPage] = useState<PageId>(pageFromHash);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');

  useEffect(() => {
    function onHashChange(): void {
      setPage(pageFromHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  function navigate(next: PageId): void {
    window.location.hash = `/${next}`;
    setPage(next);
  }

  return (
    <ProfileProvider>
      <div className={styles.app}>
        <TopBar
          page={page}
          onNavigate={navigate}
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
        />
        <div className={styles.body}>
          <main className={styles.main} id="main">
            {page === 'integrations' ? <IntegrationsPage previewMode={previewMode} /> : null}
            {page === 'status' ? <StatusPage /> : null}
            {page === 'options' ? <OptionsPage /> : null}
            {page === 'convert' ? <ConvertPage /> : null}
            {page === 'catalog' ? <CatalogPage /> : null}
          </main>
          <Sidebar previewMode={previewMode} />
        </div>
      </div>
    </ProfileProvider>
  );
}
