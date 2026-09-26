import {
  type ChatboxProfile,
  type CodecRegistry,
  type ConfigFile,
  type Diagnostic,
  type FormatId,
} from '@chatbox-converter/core';
import { useState } from 'react';
import { DiagnosticsList } from '@/components/convert/DiagnosticsList';
import { cx } from '@/lib/cx';
import { downloadConfigFiles } from '@/lib/files';
import styles from '@/pages/ConvertPage.module.css';

interface ExportPanelProps {
  readonly registry: CodecRegistry;
  readonly profile: ChatboxProfile;
}

interface ExportResult {
  readonly format: FormatId;
  readonly diagnostics: readonly Diagnostic[];
  readonly files: readonly ConfigFile[];
}

const FILES_SHOWN = 3;

function summarizeFiles(files: readonly string[]): string {
  if (files.length <= FILES_SHOWN) {
    return files.join(', ');
  }
  return `${files.slice(0, FILES_SHOWN).join(', ')} and ${files.length - FILES_SHOWN} more`;
}

export function ExportPanel({ registry, profile }: ExportPanelProps): React.JSX.Element {
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  function exportAs(format: FormatId): void {
    const result = registry.get(format).serialize(profile);
    setExportResult({ format, diagnostics: result.diagnostics, files: result.files });
    const safeName = profile.meta.name.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '') || 'chatbox';
    downloadConfigFiles(result.files, `${safeName}-${format}.zip`);
  }

  return (
    <section className={styles.column} aria-labelledby="export-title">
      <h2 id="export-title" className={styles.heading}>
        Export
      </h2>
      <p className={styles.lead}>
        Download the profile you are editing as a config for one of these apps. Anything the target
        cannot express is listed below the button, so nothing disappears silently.
      </p>
      <div className={styles.exportGrid}>
        {registry.all().map((codec) => (
          <button
            key={codec.id}
            type="button"
            className={cx(
              styles.exportButton,
              exportResult?.format === codec.id && styles.exportActive,
            )}
            onClick={() => {
              exportAs(codec.id);
            }}
          >
            <span className={styles.exportName}>{codec.name}</span>
            <span className={styles.exportFiles}>{summarizeFiles(codec.expectedFiles)}</span>
          </button>
        ))}
      </div>
      {exportResult === null ? null : (
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.label}>
              {exportResult.files.length} file{exportResult.files.length === 1 ? '' : 's'}{' '}
              downloaded as {registry.get(exportResult.format).name}
            </span>
          </div>
          <DiagnosticsList diagnostics={exportResult.diagnostics} />
          <p className={styles.fileList}>
            {exportResult.files.map((file) => (
              <code key={file.path}>{file.path}</code>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}
