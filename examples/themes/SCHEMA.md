# Theme Package Schema

Theme packages are local JSON files. Use the `.mdv-theme.json` suffix for files that are meant to be imported as reader themes.

## Shape

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

Theme packages may only contain the fields listed above. Unknown top-level fields such as `palette`, `variables`, or `installedAt` are rejected during import.

## Fields

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `id` | Yes | string | Stable theme id. Length 2 to 64. May contain letters, numbers, dots, underscores, and hyphens. It is normalized to lowercase during import. |
| `name` | Yes | string | Display name. Non-empty, maximum 160 characters. |
| `version` | Yes | string | Theme version. Non-empty, maximum 160 characters. Use semantic versions such as `1.0.0`. |
| `author` | No | string | Author name, maximum 160 characters. |
| `description` | No | string | Short description, maximum 160 characters. |
| `minAppVersion` | No | string | Minimum app version, maximum 160 characters. Themes requiring a newer app version are rejected. |
| `colorScheme` | No | string | `system`, `light`, or `dark`. Defaults to `system` when omitted. |
| `tokens` | No | object | CSS custom properties. Provide at least one of `tokens` or `css`. |
| `css` | No | string | Scoped theme CSS. Provide at least one of `tokens` or `css`. |

## Tokens

`tokens` can contain up to 80 variables. Names must start with `--reader-` or `--markdown-`. Values must be non-empty strings with a maximum length of 500 characters.

Common reader tokens:

- `--reader-page-bg`
- `--reader-surface`
- `--reader-border`
- `--reader-text`
- `--reader-muted`
- `--reader-link`
- `--reader-radius`
- `--reader-panel-bg`
- `--reader-panel-border`
- `--reader-accent`
- `--reader-accent-muted`
- `--reader-selection-bg`
- `--reader-heading-text`
- `--reader-heading-font`
- `--reader-heading-border`
- `--reader-code-bg`
- `--reader-code-text`
- `--reader-inline-code-bg`
- `--reader-inline-code-text`
- `--reader-table-head`
- `--reader-table-stripe`
- `--reader-rule`
- `--reader-quote-bg`
- `--reader-quote-border`
- `--reader-quote-text`
- `--reader-task-done`
- `--reader-mark-bg`
- `--reader-mark-text`
- `--reader-tag-bg`
- `--reader-tag-text`
- `--reader-shadow`

Common Markdown tokens:

- `--markdown-font-size`
- `--markdown-line-height`

Token values cannot contain remote resources or unsafe expressions:

- `url(...)`
- `@import`
- `javascript:`
- `expression(...)`
- `behavior:`

## CSS

Theme CSS is automatically scoped to the active reader theme. Write selectors as if they target the reader directly:

```css
.document-reader h1 {
  font-weight: 700;
}
```

The importer rejects CSS that:

- is larger than 64KB
- is non-empty but does not contain a complete CSS rule
- contains `@import`, `url(...)`, `@font-face`, `javascript:`, `expression(...)`, or `behavior:`
- uses unsupported at-rules

Supported at-rules:

- `@media`
- `@supports`
- `@container`

## Install And Update

Only one theme can be installed for a given `id`. Importing a package with an existing `id` shows an update confirmation first. After confirmation, the new package replaces the old package and installed themes are sorted by display name.

Exported theme packages do not include local installation metadata such as `installedAt`.

## Recommended Themes

The options page can include built-in recommended themes. These themes use the same package shape as imported `.mdv-theme.json` files. Installing a recommended theme stores it as a normal local theme package.

When a recommended theme has the same `id` and `version` as an installed theme, it is marked as installed. When the `id` matches but the version differs, the options page asks for update confirmation before replacing the installed package.
