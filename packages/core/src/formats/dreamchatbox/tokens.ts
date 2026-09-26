import type { PlaceholderName } from '../../model/placeholders';
import { parseTemplate, renameTemplateTokens } from '../../model/template';
import type { DiagnosticCollector } from '../codec';
import {
  CANONICAL_PAIR_COLLAPSE,
  CANONICAL_TO_DREAM,
  DREAM_MARKER,
  DREAM_TO_CANONICAL,
  type PluginId,
} from './catalog';

/** Dream placeholders are `{anything but braces}`, case-insensitive, spaces folded to `_`. */
const DREAM_TOKEN = /\{([^{}]+)\}/g;
const STATUS_SLOT = /^text_(?:\d{1,2}|(?:t|tpl|template)\d{1,2}(?:_\d{1,2})?)$/;
const INLINE_STYLE =
  /\{\s*(?:super(?:script)?|sup|sub(?:script)?)\s*\/\s*((?:[^{}]|\{[^{}]*\})*?)\s*\}/gi;
const REGION_STYLE = /\{\s*\/?\s*(?:super(?:script)?|sup|sub(?:script)?)\s*\}/gi;
const VERBATIM = /_"([^"]*)"_/g;

export interface DreamContext {
  /** Literal for `{lyrics_prefix}`; empty when the prefix is switched off. */
  readonly lyricsPrefix: string;
  /** Literal for `{ram_type}` (free text from `hw_ram_type`). */
  readonly ramType: string;
}

export interface ToCanonicalResult {
  readonly template: string;
  readonly unknown: readonly string[];
  readonly strippedStyles: boolean;
  readonly usedTempIcon: boolean;
}

/** Dream template → canonical template (literal `\n` → newline, tokens renamed). */
export function dreamToCanonical(template: string, ctx: DreamContext): ToCanonicalResult {
  const unknown = new Set<string>();
  let usedTempIcon = false;
  const withoutStyles = stripStyles(template);
  const strippedStyles = withoutStyles !== template;
  const replaced = withoutStyles
    .replace(/\\n/g, '\n')
    .replace(DREAM_TOKEN, (raw, inner: string) => {
      const key = inner.trim().toLowerCase().replace(/ /g, '_');
      if (STATUS_SLOT.test(key)) {
        return '{status}';
      }
      if (key === 'lyrics_prefix') {
        return ctx.lyricsPrefix;
      }
      if (key === 'ram_type' || key === 'ram_typ' || key === 'ramtype') {
        return ctx.ramType;
      }
      if (key === 'temp_icon' || key === 'tempicon' || key === 'temp') {
        usedTempIcon = true;
        return '';
      }
      const mapped = DREAM_TO_CANONICAL[key];
      if (mapped === undefined) {
        unknown.add(inner.trim());
        return raw;
      }
      return mapped;
    });
  return {
    template: tidyLines(replaced),
    unknown: [...unknown],
    strippedStyles,
    usedTempIcon,
  };
}

/** `{sup}…{/sup}`, `{super/"word"}` and `_"word"_` become plain text. */
export function stripStyles(template: string): string {
  return template
    .replace(INLINE_STYLE, (_, content: string) => content.replace(/^"(.*)"$/s, '$1'))
    .replace(REGION_STYLE, '')
    .replace(VERBATIM, '$1');
}

function tidyLines(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trim())
    .join('\n');
}

export interface ToDreamResult {
  readonly template: string;
  readonly plugins: ReadonlySet<PluginId>;
  readonly dropped: readonly PlaceholderName[];
}

/** Canonical template → Dream template (newline → literal `\n`, tokens renamed). */
export function canonicalToDream(template: string): ToDreamResult {
  const plugins = new Set<PluginId>();
  const dropped = new Set<PlaceholderName>();
  const mapping: Record<string, string> = {};
  let collapsed = template;
  for (const [pattern, replacement] of CANONICAL_PAIR_COLLAPSE) {
    collapsed = collapsed.replace(pattern, replacement);
  }
  let kept = '';
  for (const token of parseTemplate(collapsed)) {
    if (token.kind !== 'placeholder') {
      kept += token.kind === 'text' ? token.text : token.raw;
      continue;
    }
    const target = CANONICAL_TO_DREAM[token.name];
    if (target === undefined) {
      dropped.add(token.name);
      continue;
    }
    mapping[token.name] = target.token;
    if (target.plugin !== undefined) {
      plugins.add(target.plugin);
    }
    kept += token.raw;
  }
  const renamed = tidyLines(renameTemplateTokens(kept, mapping)).replace(DREAM_MARKER, '{$1}');
  // Dream's own templates write line breaks as ` \n ` (literal backslash-n with spaces).
  return { template: renamed.replace(/\n/g, ' \\n '), plugins, dropped: [...dropped] };
}

/** Report the losses of a Dream → canonical conversion. */
export function reportToCanonical(
  result: ToCanonicalResult,
  collector: DiagnosticCollector,
  path: string,
): void {
  for (const name of result.unknown) {
    collector.warn(
      'unknown-placeholder',
      `{${name}} has no canonical placeholder; it was kept as literal text.`,
      path,
    );
  }
  if (result.strippedStyles) {
    collector.info(
      'style-markers-stripped',
      'Superscript/subscript style markers were removed; the text is kept plain.',
      path,
    );
  }
  if (result.usedTempIcon) {
    collector.info(
      'temp-icon-merged',
      '{temp_icon} was removed; canonical temperatures already include their unit.',
      path,
    );
  }
}

export const PLUGIN_LABELS: Readonly<Record<PluginId, string>> = {
  world_stats: 'World Stats',
  vrcosc_modules: 'VRCOSC Modules (Linux)',
  stream_stats: 'Stream Stats',
  social_media: 'Social Media',
};

/** Report the losses of a canonical → Dream conversion (plugins are reported once by the caller). */
export function reportToDream(
  result: ToDreamResult,
  collector: DiagnosticCollector,
  path: string,
  plugins: Set<PluginId>,
): void {
  for (const name of result.dropped) {
    collector.unsupported(`Placeholder {${name}}`, path);
  }
  for (const plugin of result.plugins) {
    plugins.add(plugin);
  }
}
