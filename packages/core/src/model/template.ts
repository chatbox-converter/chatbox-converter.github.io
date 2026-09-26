import { isPlaceholderName, type PlaceholderName } from './placeholders';

/**
 * Templates use `{name}` placeholders from the canonical catalog. Names are
 * case-insensitive; unknown names are preserved as literal text so that a
 * format-specific token nobody mapped is never silently lost.
 */
export type TemplateToken =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'placeholder'; readonly name: PlaceholderName; readonly raw: string }
  | { readonly kind: 'unknown'; readonly name: string; readonly raw: string };

const TOKEN_PATTERN = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;

export function parseTemplate(template: string): TemplateToken[] {
  const tokens: TemplateToken[] = [];
  let last = 0;
  for (const match of template.matchAll(TOKEN_PATTERN)) {
    const index = match.index;
    const raw = match[0];
    const captured = match[1] ?? '';
    if (index > last) {
      tokens.push({ kind: 'text', text: template.slice(last, index) });
    }
    const name = captured.toLowerCase();
    tokens.push(
      isPlaceholderName(name)
        ? { kind: 'placeholder', name, raw }
        : { kind: 'unknown', name: captured, raw },
    );
    last = index + raw.length;
  }
  if (last < template.length) {
    tokens.push({ kind: 'text', text: template.slice(last) });
  }
  return tokens;
}

/** Distinct canonical placeholders used by a template, in order of first use. */
export function placeholdersIn(template: string): PlaceholderName[] {
  const seen = new Set<PlaceholderName>();
  for (const token of parseTemplate(template)) {
    if (token.kind === 'placeholder') {
      seen.add(token.name);
    }
  }
  return [...seen];
}

/** Names of `{tokens}` that are not in the canonical catalog. */
export function unknownPlaceholdersIn(template: string): string[] {
  const seen = new Set<string>();
  for (const token of parseTemplate(template)) {
    if (token.kind === 'unknown') {
      seen.add(token.name);
    }
  }
  return [...seen];
}

export type TemplateValues = Partial<Record<PlaceholderName, string>>;

export interface RenderOptions {
  /**
   * When a placeholder resolves to an empty value, also drop one directly
   * adjacent separator so `A | {empty} | B` becomes `A | B` (DreamChatbox and
   * MagicChatbox both tidy like this).
   */
  readonly tidyEmpty?: boolean;
}

const SEPARATOR_PATTERN = /\s*[|:/,\-–·¦┆]\s*$/u;

export function renderTemplate(
  template: string,
  values: TemplateValues,
  options: RenderOptions = {},
): string {
  let out = '';
  let pendingTidy = false;
  for (const token of parseTemplate(template)) {
    if (token.kind === 'text') {
      out += pendingTidy ? stripLeadingSeparator(token.text) : token.text;
      pendingTidy = false;
      continue;
    }
    const value = token.kind === 'placeholder' ? (values[token.name] ?? '') : token.raw;
    if (value === '' && options.tidyEmpty === true) {
      const stripped = out.replace(SEPARATOR_PATTERN, '');
      if (stripped !== out) {
        out = stripped;
      } else {
        pendingTidy = true;
      }
      continue;
    }
    out += value;
  }
  return out.replace(/[ \t]{2,}/g, ' ').trim();
}

function stripLeadingSeparator(text: string): string {
  return text.replace(/^\s*[|:/,\-–·¦┆]\s*/u, ' ');
}

/** Replace `{oldName}` tokens using a mapping; unmapped tokens are kept. */
export function renameTemplateTokens(
  template: string,
  mapping: Readonly<Record<string, string>>,
): string {
  return template.replace(TOKEN_PATTERN, (raw, captured: string) => {
    const mapped = mapping[captured] ?? mapping[captured.toLowerCase()];
    return mapped === undefined ? raw : `{${mapped}}`;
  });
}
