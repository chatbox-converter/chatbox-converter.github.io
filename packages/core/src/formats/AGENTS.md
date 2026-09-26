# Codec conventions (read before adding a format)

- One folder per format: `formats/<id>/` exporting `<id>Codec: FormatCodec` from `index.ts`.
- Relative imports only inside `packages/core` (no `@/` alias here; the web app consumes the source).
- `parse(files)` is tolerant: missing keys fall back to the app's documented defaults, unknown keys
  are ignored, case-insensitive matching where the app does it. Throw `ConfigParseError` only for
  unreadable input. Every lossy mapping produces a `Diagnostic` via `DiagnosticCollector`.
- `serialize(profile)` writes canonical files exactly as the target app writes them (key names,
  casing, enum integers, indentation, version stamps). Report every feature that could not be
  expressed with `collector.unsupported(...)`.
- Round-trip: anything parsed that the neutral model cannot hold goes into
  `profile.extras[<id>]` as opaque JSON and is merged back on serialize, so importing a config and
  exporting it to the same format loses nothing the model does not touch.
- Canonical placeholders live in `model/placeholders.ts`; map format-specific tokens with
  `renameTemplateTokens` and report unmapped ones.
- Tests live beside the code (`*.test.ts`) with literal fixtures under `fixtures/` (JSON files are
  imported via `?raw` or read with `node:fs` in tests only). Cover: parse of a realistic full config,
  parse of a minimal/empty config (defaults), serialize of `createDefaultProfile()`, and a
  profile → format → profile round trip for every segment kind the format supports.
- The house lint rules apply: files < 600 lines, functions < 100 lines, no `enum`, no `any`,
  no non-null assertions. Split large tables into `catalog.ts` / `defaults.ts` files.
