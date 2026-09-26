import {
  ConfigParseError,
  isFormatId,
  UnknownFormatError,
  type ChatboxProfile,
  type CodecRegistry,
  type ConfigFile,
  type Diagnostic,
  type FormatCodec,
  type FormatId,
} from '@chatbox-converter/core';
import { useState } from 'react';
import { DiagnosticsList } from '@/components/convert/DiagnosticsList';
import { FileDrop } from '@/components/convert/FileDrop';
import { cx } from '@/lib/cx';
import { readConfigFiles } from '@/lib/files';
import { logger } from '@/lib/logger';
import styles from '@/pages/ConvertPage.module.css';

interface ImportState {
  readonly files: readonly ConfigFile[];
  readonly detected: readonly { readonly codec: FormatCodec; readonly confidence: number }[];
  readonly chosen: FormatId | null;
  readonly parsed: {
    readonly profile: ChatboxProfile;
    readonly diagnostics: readonly Diagnostic[];
  } | null;
  readonly error: string | null;
}

const EMPTY_IMPORT: ImportState = {
  files: [],
  detected: [],
  chosen: null,
  parsed: null,
  error: null,
};

function errorMessage(error: unknown): string {
  if (error instanceof ConfigParseError || error instanceof UnknownFormatError) {
    return error.message;
  }
  logger.error('Unexpected conversion failure.', error);
  return 'Something went wrong while reading these files.';
}

function parseWith(
  registry: CodecRegistry,
  files: readonly ConfigFile[],
  format: FormatId | undefined,
): ImportState {
  const detected = registry.detect(files);
  try {
    const result = registry.parse(files, format);
    return {
      files,
      detected,
      chosen: result.format,
      parsed: { profile: result.profile, diagnostics: result.diagnostics },
      error: null,
    };
  } catch (error) {
    return { files, detected, chosen: format ?? null, parsed: null, error: errorMessage(error) };
  }
}

interface ImportPanelProps {
  readonly registry: CodecRegistry;
  readonly onLoad: (profile: ChatboxProfile) => void;
}

export function ImportPanel({ registry, onLoad }: ImportPanelProps): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<ImportState>(EMPTY_IMPORT);

  async function handleFiles(picked: File[]): Promise<void> {
    setBusy(true);
    try {
      const files = await readConfigFiles(picked);
      if (files.length === 0) {
        setImported({ ...EMPTY_IMPORT, error: 'No JSON files were found in that selection.' });
        return;
      }
      setImported(parseWith(registry, files, undefined));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.column} aria-labelledby="import-title">
      <h2 id="import-title" className={styles.heading}>
        Import
      </h2>
      <p className={styles.lead}>
        Load an existing config from any supported app. It becomes the profile you edit on the other
        tabs, and you can export it to any other app from the right.
      </p>
      <FileDrop
        busy={busy}
        onFiles={(files) => {
          void handleFiles(files);
        }}
      />
      {imported.files.length > 0 ? (
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.label}>
              {imported.files.length} file{imported.files.length === 1 ? '' : 's'}
            </span>
            <label className={styles.formatPick}>
              Read as
              <select
                value={imported.chosen ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setImported(
                    parseWith(
                      registry,
                      imported.files,
                      value === '' ? undefined : isFormatId(value) ? value : undefined,
                    ),
                  );
                }}
              >
                <option value="">Detect automatically</option>
                {registry.all().map((codec) => (
                  <option key={codec.id} value={codec.id}>
                    {codec.name}
                    {imported.detected.some((entry) => entry.codec.id === codec.id)
                      ? ' (detected)'
                      : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {imported.error === null ? null : (
            <p className={styles.error} role="alert">
              {imported.error}
            </p>
          )}
          {imported.parsed === null ? null : (
            <>
              <DiagnosticsList
                diagnostics={imported.parsed.diagnostics}
                emptyText="Everything in these files has a place in the editor."
              />
              <div className={styles.row}>
                <span className={styles.label}>
                  {imported.parsed.profile.segments.length} integrations,{' '}
                  {imported.parsed.profile.statuses.length} statuses
                </span>
                <button
                  type="button"
                  className={cx(styles.button, styles.primary)}
                  onClick={() => {
                    if (imported.parsed !== null) {
                      onLoad(imported.parsed.profile);
                    }
                  }}
                >
                  Load into the editor
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
      <details className={styles.help}>
        <summary>Where do I find my config files?</summary>
        <ul>
          {registry.all().map((codec) => (
            <li key={codec.id}>
              <strong>{codec.name}:</strong> <code>{codec.configLocation}</code>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
