import { useId, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './controls.module.css';

/** Card with the 2px purple left border that wraps each option subsection. */
export function OptionCard({ children }: { readonly children: ReactNode }): React.JSX.Element {
  return <div className={cx(styles.card, styles.stack)}>{children}</div>;
}

export function SubHeading({ children }: { readonly children: ReactNode }): React.JSX.Element {
  return <h2 className={styles.subheading}>{children}</h2>;
}

interface HelpProps {
  readonly children: ReactNode;
  readonly warning?: boolean;
}

export function Help({ children, warning = false }: HelpProps): React.JSX.Element {
  return <p className={cx(styles.help, warning && styles.helpWarning)}>{children}</p>;
}

export function Row({ children }: { readonly children: ReactNode }): React.JSX.Element {
  return <div className={styles.row}>{children}</div>;
}

type Width = 'wide' | 'short' | 'tiny' | 'auto';

interface TextFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly width?: Width;
  /** Put the label beside the box instead of above it. */
  readonly inline?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly list?: string;
  readonly type?: 'text' | 'datetime-local';
}

export function TextField({
  label,
  value,
  onChange,
  width = 'wide',
  inline = false,
  disabled = false,
  placeholder,
  list,
  type = 'text',
}: TextFieldProps): React.JSX.Element {
  const id = useId();
  return (
    <div className={cx(styles.field, inline && styles.fieldInline)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className={cx(styles.input, width !== 'auto' && styles[width])}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        list={list}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </div>
  );
}

interface NumberFieldProps {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly disabled?: boolean;
  /** Label before the box, unit after, on one line ("Count me as away after [n] seconds"). */
  readonly inline?: boolean;
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step,
  disabled = false,
  inline = true,
}: NumberFieldProps): React.JSX.Element {
  const id = useId();
  return (
    <div className={cx(styles.field, inline && styles.fieldInline)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        className={cx(styles.input, styles.short)}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) {
            onChange(next);
          }
        }}
      />
      {unit === undefined ? null : <span className={styles.unit}>{unit}</span>}
    </div>
  );
}

interface SliderFieldProps {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: string;
  readonly disabled?: boolean;
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  disabled = false,
}: SliderFieldProps): React.JSX.Element {
  const id = useId();
  const pct = `${String(Math.round(((value - min) / (max - min)) * 100))}%`;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.row}>
        <input
          id={id}
          type="range"
          className={styles.slider}
          style={{ ['--pct' as string]: pct }}
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) => {
            onChange(Number(event.target.value));
          }}
        />
        <span className={styles.readout}>
          {value} {unit}
        </span>
      </div>
    </div>
  );
}

interface SegmentedFieldProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (value: T) => void;
}

export function SegmentedField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedFieldProps<T>): React.JSX.Element {
  return (
    <div className={cx(styles.field, styles.fieldInline)}>
      <span className={styles.label}>{label}</span>
      <div className={styles.segmented} role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={cx(styles.segment, option.value === value && styles.segmentOn)}
            onClick={() => {
              onChange(option.value);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (value: T) => void;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>): React.JSX.Element {
  const id = useId();
  return (
    <div className={cx(styles.field, styles.fieldInline)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value);
          if (next !== undefined) {
            onChange(next.value);
          }
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
