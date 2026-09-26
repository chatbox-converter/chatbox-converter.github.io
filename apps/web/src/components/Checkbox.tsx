import { cx } from '@/lib/cx';
import styles from './Checkbox.module.css';

interface CheckboxProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label: string;
  /** Put the label before the box, as the sidebar does. */
  readonly labelFirst?: boolean;
  readonly hint?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  labelFirst = false,
  hint,
}: CheckboxProps): React.JSX.Element {
  return (
    <label className={cx(styles.row, labelFirst && styles.labelFirst)}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      <span className={styles.box} aria-hidden="true" />
      <span className={styles.text}>
        {label}
        {hint === undefined ? null : <em className={styles.hint}>{hint}</em>}
      </span>
    </label>
  );
}
