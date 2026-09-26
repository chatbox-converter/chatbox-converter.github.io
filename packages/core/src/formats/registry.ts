import type { ChatboxProfile, FormatId } from '../model/profile';
import {
  DiagnosticCollector,
  type ConfigFile,
  type FormatCodec,
  type ParseResult,
  type SerializeResult,
} from './codec';

export interface Detection {
  readonly codec: FormatCodec;
  readonly confidence: number;
}

export interface ConversionResult {
  readonly source: FormatId;
  readonly target: FormatId;
  readonly profile: ChatboxProfile;
  readonly files: readonly ConfigFile[];
  readonly diagnostics: SerializeResult['diagnostics'];
}

export class CodecRegistry {
  private readonly codecs: readonly FormatCodec[];

  constructor(codecs: readonly FormatCodec[]) {
    this.codecs = codecs;
  }

  all(): readonly FormatCodec[] {
    return this.codecs;
  }

  get(id: FormatId): FormatCodec {
    const codec = this.codecs.find((candidate) => candidate.id === id);
    if (codec === undefined) {
      throw new Error(`No codec registered for format "${id}".`);
    }
    return codec;
  }

  /** Codecs ordered by confidence; entries with confidence 0 are omitted. */
  detect(files: readonly ConfigFile[]): Detection[] {
    return this.codecs
      .map((codec) => ({ codec, confidence: codec.detect(files) }))
      .filter((entry) => entry.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /** Parse with an explicit format, or the best detected one. */
  parse(
    files: readonly ConfigFile[],
    format?: FormatId,
  ): ParseResult & { readonly format: FormatId } {
    const codec = format === undefined ? this.detect(files)[0]?.codec : this.get(format);
    if (codec === undefined) {
      const collector = new DiagnosticCollector();
      collector.error('unknown-format', 'None of the supported formats recognised these files.');
      throw new UnknownFormatError(
        collector
          .all()
          .map((d) => d.message)
          .join(' '),
      );
    }
    return { ...codec.parse(files), format: codec.id };
  }

  convert(files: readonly ConfigFile[], target: FormatId, source?: FormatId): ConversionResult {
    const parsed = this.parse(files, source);
    const serialized = this.get(target).serialize(parsed.profile);
    return {
      source: parsed.format,
      target,
      profile: parsed.profile,
      files: serialized.files,
      diagnostics: [...parsed.diagnostics, ...serialized.diagnostics],
    };
  }
}

export class UnknownFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnknownFormatError';
  }
}
