import {
  PLACEHOLDERS,
  PLACEHOLDER_CATEGORIES,
  placeholdersIn,
  placeholdersInCategory,
  renderTemplate,
  unknownPlaceholdersIn,
  type PlaceholderCategory,
  type PlaceholderName,
  type TemplateValues,
} from '@chatbox-converter/core';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { insertAtCaret } from './caret';
import { Help } from './controls';
import controls from './controls.module.css';
import { SegmentPreview } from './SegmentPreview';
import styles from './TemplateEditor.module.css';

interface TemplateEditorProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Placeholders offered first; every other category sits behind "More…". */
  readonly category: PlaceholderCategory;
  readonly values: TemplateValues;
  readonly previewCaption?: string;
}

const CATEGORY_TITLES: Readonly<Record<PlaceholderCategory, string>> = {
  status: 'Status',
  afk: 'Away',
  media: 'Music',
  lyrics: 'Lyrics',
  hardware: 'Component stats',
  time: 'Time',
  weather: 'Weather',
  heartrate: 'Heart rate',
  window: 'Window activity',
  vrchat: 'VRChat radar',
  vr_battery: 'VR gear battery',
  vr_performance: 'VR performance',
  network: 'Network stats',
  twitch: 'Twitch',
  tiktok: 'TikTok',
  discord: 'Discord',
  soundpad: 'Soundpad',
  voicemod: 'Voicemod',
  speech: 'Speech to text',
  custom: 'Custom',
};

/** Textbox + clickable placeholder chips + legend + live preview for one template. */
export function TemplateEditor({
  label,
  value,
  onChange,
  category,
  values,
  previewCaption,
}: TemplateEditorProps): React.JSX.Element {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const [showMore, setShowMore] = useState(false);

  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    const input = inputRef.current;
    if (caret !== null && input !== null) {
      pendingCaret.current = null;
      input.focus();
      input.setSelectionRange(caret, caret);
    }
  }, [value]);

  function insert(name: PlaceholderName): void {
    const input = inputRef.current;
    const next = insertAtCaret(
      value,
      `{${name}}`,
      input?.selectionStart ?? null,
      input?.selectionEnd,
    );
    pendingCaret.current = next.caret;
    onChange(next.value);
  }

  const primary = placeholdersInCategory(category);
  const others = PLACEHOLDER_CATEGORIES.filter((entry) => entry !== category)
    .map((entry) => ({ category: entry, names: placeholdersInCategory(entry) }))
    .filter((group) => group.names.length > 0);
  const used = placeholdersIn(value);
  const unknown = unknownPlaceholdersIn(value);

  return (
    <div className={styles.editor}>
      <div className={controls.field}>
        <label className={controls.label} htmlFor={id}>
          {label}
        </label>
        <input
          ref={inputRef}
          id={id}
          className={`${controls.input} ${controls.wide}`}
          value={value}
          spellCheck={false}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      </div>
      <div className={styles.chips} aria-label="Placeholders">
        {primary.map((name) => (
          <PlaceholderChip key={name} name={name} onInsert={insert} />
        ))}
        <button
          type="button"
          className={styles.more}
          aria-expanded={showMore}
          onClick={() => {
            setShowMore((open) => !open);
          }}
        >
          {showMore ? 'Fewer' : 'More…'}
        </button>
      </div>
      {showMore ? (
        <div className={styles.moreGroups}>
          {others.map((group) => (
            <div key={group.category} className={styles.moreGroup}>
              <span className={styles.moreTitle}>{CATEGORY_TITLES[group.category]}</span>
              {group.names.map((name) => (
                <PlaceholderChip key={name} name={name} onInsert={insert} />
              ))}
            </div>
          ))}
        </div>
      ) : null}
      {used.length > 0 ? (
        <dl className={styles.legend}>
          {used.map((name) => (
            <div key={name} className={styles.legendItem}>
              <dt className={styles.legendName}>{`{${name}}`}</dt>
              <dd className={styles.legendSample}>
                {PLACEHOLDERS[name].label} · {values[name] ?? PLACEHOLDERS[name].sample}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {unknown.length > 0 ? (
        <Help warning>
          Unknown placeholder{unknown.length === 1 ? '' : 's'}{' '}
          {unknown.map((name) => `{${name}}`).join(', ')}: no app fills these in, so they are sent
          as typed.
        </Help>
      ) : null}
      <SegmentPreview
        text={renderTemplate(value, values, { tidyEmpty: true })}
        caption={previewCaption}
      />
    </div>
  );
}

interface PlaceholderChipProps {
  readonly name: PlaceholderName;
  readonly onInsert: (name: PlaceholderName) => void;
}

function PlaceholderChip({ name, onInsert }: PlaceholderChipProps): React.JSX.Element {
  const info = PLACEHOLDERS[name];
  return (
    <button
      type="button"
      className={styles.chip}
      title={`${info.label}, e.g. ${info.sample}`}
      onClick={() => {
        onInsert(name);
      }}
    >
      {info.label} <span className={styles.chipName}>{`{${name}}`}</span>
    </button>
  );
}
