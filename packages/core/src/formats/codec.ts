import type { ChatboxProfile, FormatId } from '../model/profile';

/** One file of a configuration, path relative to the app's config root. */
export interface ConfigFile {
  readonly path: string;
  readonly content: string;
}

export type DiagnosticLevel = 'info' | 'warning' | 'error';

export interface Diagnostic {
  readonly level: DiagnosticLevel;
  /** Stable machine-readable code, e.g. `unsupported-feature`. */
  readonly code: string;
  readonly message: string;
  /** File or JSON path the message refers to, when known. */
  readonly path?: string;
}

export interface ParseResult {
  readonly profile: ChatboxProfile;
  readonly diagnostics: readonly Diagnostic[];
}

export interface SerializeResult {
  readonly files: readonly ConfigFile[];
  readonly diagnostics: readonly Diagnostic[];
}

export interface FormatDescriptor {
  readonly id: FormatId;
  readonly name: string;
  /** Where the app keeps these files, for the upload/download instructions. */
  readonly configLocation: string;
  /** File names (or globs) a user is expected to upload. */
  readonly expectedFiles: readonly string[];
}

export interface FormatCodec extends FormatDescriptor {
  /** Confidence 0..1 that the given files belong to this format. */
  detect(files: readonly ConfigFile[]): number;
  parse(files: readonly ConfigFile[]): ParseResult;
  serialize(profile: ChatboxProfile): SerializeResult;
}

export class DiagnosticCollector {
  private readonly items: Diagnostic[] = [];

  info(code: string, message: string, path?: string): void {
    this.push('info', code, message, path);
  }

  warn(code: string, message: string, path?: string): void {
    this.push('warning', code, message, path);
  }

  error(code: string, message: string, path?: string): void {
    this.push('error', code, message, path);
  }

  /** Report a feature the target format cannot express. */
  unsupported(feature: string, path?: string): void {
    this.warn(
      'unsupported-feature',
      `${feature} has no equivalent in this format and was dropped.`,
      path,
    );
  }

  all(): readonly Diagnostic[] {
    return [...this.items];
  }

  private push(level: DiagnosticLevel, code: string, message: string, path?: string): void {
    this.items.push(path === undefined ? { level, code, message } : { level, code, message, path });
  }
}

export class ConfigParseError extends Error {
  constructor(
    message: string,
    readonly path?: string,
  ) {
    super(message);
    this.name = 'ConfigParseError';
  }
}
