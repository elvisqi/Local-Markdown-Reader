# Local Markdown Reader Theme Packages

Theme packages are local JSON files that can be imported from the extension
options page. Use the `.mdv-theme.json` suffix for files that are intended to
be installed as reader themes.

See [SCHEMA.md](./SCHEMA.md) for the full package schema and validation rules.

## File Shape

```json
{
  "id": "paper-pro",
  "name": "Paper Pro",
  "version": "1.0.0",
  "author": "Local Markdown Reader",
  "description": "A warm paper-like reading theme.",
  "minAppVersion": "2.2.3",
  "colorScheme": "light",
  "tokens": {
    "--reader-page-bg": "#f3f0e8",
    "--reader-surface": "#fffdf7",
    "--reader-text": "#282a27",
    "--reader-link": "#4b6f91",
    "--reader-heading-text": "#282a27",
    "--reader-inline-code-bg": "#f0ece4",
    "--markdown-font-size": "17px"
  },
  "css": ".document-reader h1 { font-family: Georgia, \"Times New Roman\", serif; }"
}
```

Required fields:

- `id`: stable theme id. Use letters, numbers, dots, underscores, and hyphens.
- `name`: display name.
- `version`: theme version.
- `tokens` or `css`: at least one of these must be present.

Optional fields:

- `author`
- `description`
- `minAppVersion`
- `colorScheme`: `system`, `light`, or `dark`. Defaults to `system`.

Unknown top-level fields are rejected so package mistakes are visible before
installation.

## Supported Tokens

Token names must start with `--reader-` or `--markdown-`.

Common reader tokens:

Base surfaces and palette:

- `--reader-page-bg`
- `--reader-surface`
- `--reader-border`
- `--reader-text`
- `--reader-muted`
- `--reader-link`
- `--reader-radius`
- `--reader-base-00`
- `--reader-base-10`
- `--reader-base-20`
- `--reader-base-30`
- `--reader-base-50`
- `--reader-base-70`
- `--reader-base-100`
- `--reader-color-red`
- `--reader-color-orange`
- `--reader-color-yellow`
- `--reader-color-green`
- `--reader-color-cyan`
- `--reader-color-blue`
- `--reader-color-purple`
- `--reader-color-pink`

Panel and chrome:

- `--reader-panel-bg`
- `--reader-panel-border`
- `--reader-accent`
- `--reader-accent-muted`
- `--reader-selection-bg`
- `--reader-toolbar-bg`
- `--reader-control-bg`
- `--reader-control-radius`
- `--reader-tree-row-hover`
- `--reader-tree-row-active`
- `--reader-outline-active-bg`

Typography and headings:

- `--reader-font-family`
- `--reader-monospace-font`
- `--reader-font-weight`
- `--reader-heading-text`
- `--reader-heading-font`
- `--reader-heading-border`
- `--reader-h1-color` through `--reader-h6-color`
- `--reader-h1-size` through `--reader-h6-size`
- `--reader-h1-weight` through `--reader-h6-weight`
- `--reader-paragraph-spacing`
- `--reader-list-spacing`
- `--reader-list-indent`
- `--reader-list-item-spacing`

Code:

- `--reader-code-bg`
- `--reader-code-text`
- `--reader-inline-code-bg`
- `--reader-inline-code-text`
- `--reader-code-radius`
- `--reader-code-border`
- `--reader-code-font-size`
- `--reader-syntax-keyword`
- `--reader-syntax-string`
- `--reader-syntax-function`
- `--reader-syntax-comment`

Tables:

- `--reader-table-head`
- `--reader-table-stripe`
- `--reader-table-text`
- `--reader-table-border`
- `--reader-table-cell-padding`
- `--reader-table-row-hover`
- `--reader-rule`

Quotes and callouts:

- `--reader-quote-bg`
- `--reader-quote-border`
- `--reader-quote-text`
- `--reader-quote-padding`
- `--reader-quote-radius`
- `--reader-callout-bg`
- `--reader-callout-border`
- `--reader-callout-title`
- `--reader-callout-text`
- `--reader-callout-radius`

Tasks, marks, and tags:

- `--reader-task-done`
- `--reader-checkbox-bg`
- `--reader-checkbox-border`
- `--reader-checkbox-checked-bg`
- `--reader-checkbox-check-color`
- `--reader-mark-bg`
- `--reader-mark-text`
- `--reader-tag-bg`
- `--reader-tag-text`
- `--reader-tag-radius`
- `--reader-tag-padding`
- `--reader-shadow`

Common Markdown tokens:

- `--markdown-font-size`
- `--markdown-line-height`

## CSS Rules

Theme CSS is scoped to the selected reader theme automatically. Write selectors
as if they target the reader, for example:

```css
.document-reader h1 {
  font-weight: 700;
}
```

The installer rejects CSS with remote resources or unsafe expressions:

- `@import`
- `url(...)`
- `@font-face`
- `javascript:`
- `expression(...)`

Supported at-rules inside theme CSS:

- `@media`
- `@supports`
- `@container`

## Install

Open the extension options page, use the theme package installer, and select a
`.mdv-theme.json` file. Installed themes appear in the same Reader Theme list as
built-in themes.
