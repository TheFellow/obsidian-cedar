# Changelog

## 0.1.2

- Fix an unsafe `any` assignment reported by the community directory's review.
- Lint with Obsidian's official ESLint rules (`npm run lint`) in CI and before releases.

## 0.1.1

- Mark unknown string escapes with a dashed underline (a border) instead of `text-decoration`, which older
  Obsidian versions only partly support.
- Release assets (`main.js`, `manifest.json`, `styles.css`) all carry GitHub artifact attestations.

## 0.1.0

- Highlight `cedar` and `cedarschema` fenced code blocks in Live Preview, Source mode and Reading view,
  using the TextMate grammars from vscode-cedar 0.10.6 unmodified, coloured with the theme's code colours.
