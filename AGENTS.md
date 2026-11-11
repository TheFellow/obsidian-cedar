# AGENTS.md — obsidian-cedar

An Obsidian plugin that highlights `cedar` and `cedarschema` fenced code blocks by running the upstream
[cedar-policy/vscode-cedar](https://github.com/cedar-policy/vscode-cedar) TextMate grammars, unmodified.
The sibling [jetbrains-cedar](../jetbrains-cedar) plugin does the same for JetBrains IDEs and is the
reference for scope → colour decisions.

## Layout

| Path | What |
| --- | --- |
| `syntaxes/*.tmLanguage.json` | Upstream grammars, verbatim (via jetbrains-cedar `src/main/resources/syntaxes/`). Don't edit; re-copy on upstream updates. |
| `src/tokenizer.ts` | Loads the grammars into `@shikijs/vscode-textmate` with Shiki's JS regex engine; line and block tokenization. |
| `src/scopes.ts` | TextMate scope → `{cm, prism, name}`. Mirrors jetbrains-cedar `CedarColors.forScope`; keep the two in step. |
| `src/editor-mode.ts` | CodeMirror 5-style stream mode for Live Preview and Source mode. Obsidian's HyperMD Markdown mode resolves fenced-code modes from `window.CodeMirror.modes`, and its editor turns each word of the style string into a `cm-*` class. |
| `src/reading-view.ts` | Registers empty Prism languages and replaces their tokens in an `after-tokenize` hook (Reading view, embeds, PDF export). |
| `src/main.ts` | Plugin entry: registers both, unregisters on unload. |
| `test/` | Vitest: tokenizer, the stream mode driven by CodeMirror's `StringStream` the way HyperMD drives it, Prism. Fixtures from upstream `testdata/`. |
| `test-vault/` | Manual check in the real app (`scripts/dev-vault.sh`). |

## Rules

- `npm run lint` must pass with zero warnings. It runs `eslint-plugin-obsidianmd`'s recommended config, the
  same rules the community directory's automated review uses (pinned to the scanner's version; bump it when
  the directory moves on). The scanner treats regex lookbehind in source as an error.
- Follow the [Obsidian plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines): no
  global `app`, no `innerHTML`, no console noise, no default hotkeys, sentence case in UI text.
- `manifest.json` `id` is `cedar` and must never change (it's the install folder name).
- The version is `x.y.z` and the git tag is the same, with no `v` prefix. Use `npm version`, which keeps
  `manifest.json` and `versions.json` in sync.
- Pin new dependencies to versions published at least two weeks ago (`.npmrc` `before=`; move the date forward
  deliberately).

## Build and test

```sh
mise install && npm ci
npm run lint
npm test
npm run build
```
