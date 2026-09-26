import type { PlaceholderName } from '../../model/placeholders';

/**
 * Converter-side sources: placeholders VRCOSC has no dedicated variable for,
 * which the compiler (`compile.ts`) expresses with another variable plus
 * options or with a literal. Shared with the coverage catalog so the
 * reference page never drifts from the codec.
 */
export type MediaState = 'playing' | 'paused' | 'stopped';

/** `{play_icon}` has no official variable: it is a literal that differs per media state. */
export const PLAY_ICONS: Readonly<Record<MediaState, string>> = {
  playing: '▶',
  paused: '⏸',
  stopped: '⏹',
};

/**
 * Placeholders that reuse another placeholder's variable with different
 * options: the same DateTime with a date/offset format, the progress variable
 * without its visual bar, the speech result once VRCOSC has translated it.
 * Linux Media has real `playicon`/`progresspercent` variables, used when it
 * is the segment's media module.
 */
export const ALIASED_SOURCES: Partial<Record<PlaceholderName, PlaceholderName>> = {
  date: 'time',
  timezone: 'time',
  progress_percent: 'progress_bar',
  translation: 'speech_text',
};

/**
 * Aliases that only approximate the placeholder (an offset instead of a zone
 * abbreviation, the app-side translation): a module with a real variable for
 * them beats the alias when modules are chosen (`planModules` in compile.ts).
 * `date` and `progress_percent` render exactly and count like real variables.
 */
export const LOSSY_ALIASES: ReadonlySet<PlaceholderName> = new Set(['timezone', 'translation']);

/** How each alias is realised, for the coverage catalog (`variableOptions` in compile.ts). */
export const ALIAS_NOTES: Partial<Record<PlaceholderName, string>> = {
  date: 'same DateTime variable with a yyyy-MM-dd format',
  timezone: 'offset only: DateTime variable with the "zzz" format (+02:00)',
  progress_percent: 'Progress variable with use_visual:false renders "NN%"',
  translation: 'translated app-side by the Speech To Text module',
};

/** Built-in variable that carries the status text when the Status module is not used. */
export const STATUS_BUILTIN_VARIABLE = 'text';
export const STATUS_BUILTIN_NOTE =
  'the active status is written as literal text; cycling/groups use the Bluscream Status module';

export function playIconNote(): string {
  return `literal ${PLAY_ICONS.playing}/${PLAY_ICONS.paused}/${PLAY_ICONS.stopped} per media state`;
}
