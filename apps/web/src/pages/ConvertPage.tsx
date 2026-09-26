import { createDefaultRegistry } from '@chatbox-converter/core';
import { useMemo } from 'react';
import { ExportPanel } from '@/components/convert/ExportPanel';
import { ImportPanel } from '@/components/convert/ImportPanel';
import { useProfile } from '@/state/profile-context';
import styles from './ConvertPage.module.css';

export function ConvertPage(): React.JSX.Element {
  const registry = useMemo(() => createDefaultRegistry(), []);
  const { profile, dispatch } = useProfile();
  return (
    <div className={styles.page}>
      <ImportPanel
        registry={registry}
        onLoad={(loaded) => {
          dispatch({ type: 'replace', profile: loaded });
          window.location.hash = '/integrations';
        }}
      />
      <ExportPanel registry={registry} profile={profile} />
    </div>
  );
}
