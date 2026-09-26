# Chatbox Converter

**https://chatbox-converter.github.io/** — convert VRChat chatbox app configs between
[MagicChatbox](https://github.com/BoiHanny/vrcosc-magicchatbox),
[VRCOSC](https://github.com/VolcanicArts/VRCOSC) and
[OSC-DreamChatbox](https://github.com/yakuda-stack/OSC-DreamChatbox), or build a new config
from scratch in an editor that looks and behaves like MagicChatbox.

Everything runs in the browser. No file you drop on the page ever leaves it.

## What it does

- **Import** a config folder, a single JSON file or a zip from any of the three apps. The format is
  detected automatically and every mapping loss is listed.
- **Edit** the result (or start fresh) on the Integrations / Status / Options tabs: enable and
  reorder integrations, choose what each one shows with `{placeholder}` templates, manage status
  messages and cycling, AFK, separators, the 144-character budget, OSC endpoint.
- **Export** to MagicChatbox (`%APPDATA%\Vrcosc-MagicChatbox\*.json`), VRCOSC (`chatbox.json` plus
  `modules/*.json`), DreamChatbox (`config.json` / profile) or the converter's own profile file,
  with a report of anything the target app cannot express.

Conversion goes through a neutral model (an ordered list of _segments_, each with a template
built from a shared placeholder vocabulary, plus statuses, AFK, output and OSC settings). Each
format has a codec that parses into that model and serialises from it; see
`packages/core/src/formats/*/MAPPING.md` for the exact field-by-field tables and known losses.

## Repository layout

| Path            | What                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core` | Framework-free TypeScript: the neutral model, template engine, preview renderer, and one codec per format with fixtures and tests.  |
| `apps/web`      | The site: React + Vite, MagicChatbox-styled UI, import/export, live preview.                                                        |
| `docs/`         | The built site, served by GitHub Pages. Rebuilt with `pnpm build` and committed.                                                    |
| `scripts/`      | Developer tooling (`screenshot.mjs` renders every page with Playwright).                                                            |
| `.references/`  | Research material. `notes/` holds the format and UI references the codecs were written from; cloned upstream repos are git-ignored. |

## Developing

```sh
pnpm install
pnpm dev          # Vite dev server
pnpm check        # format check, lint, typecheck, tests, build → docs/
pnpm test:watch
```

`pnpm check` is the gate: it must be green before a commit, and `docs/` must be rebuilt in the
same commit as the source change it reflects. The Actions workflow is manual-only
(`workflow_dispatch`) and runs the same gate.

## Credits

MagicChatbox UI, wording and icons are © BoiHanny and used here so that MagicChatbox users feel
at home. This project is otherwise released into the public domain (see `LICENSE`).
