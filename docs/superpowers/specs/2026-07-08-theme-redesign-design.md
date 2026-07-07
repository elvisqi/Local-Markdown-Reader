# Local Markdown Reader Theme Redesign Design

## Context

The current remote Obsidian-inspired draft themes were removed because they were too structurally similar. Local analysis of the current top 40 Obsidian community themes by downloads showed that popular Obsidian themes are not primarily differentiated by color. Their strongest differences come from selector coverage, typography rhythm, application chrome, tables, callouts, code blocks, plugin-like content, and component density.

Local Markdown Reader currently supports reader theme packages with `tokens` and scoped `css`. The core token set covers base colors, typography, headings, code, tables, quotes, callouts, tasks, tags, toolbar, file tree, outline, and a small syntax palette. This is a good base for normal reading styles, but it is too flat for 10 strongly differentiated themes.

## Goals

- Create 10 distinctive theme families based on feature differences, not download ranking alone.
- Keep themes designed for Local Markdown Reader instead of copying Obsidian CSS.
- Expand theme tokens and safe theme CSS only where they unlock visible differences.
- Preserve the existing reading width setting; themes may change internal density and spacing but must not force fixed document width.
- Make remote theme previews show the actual style differences clearly.
- Add repeatable similarity checks so future theme sets do not regress into near-duplicates.

## Non-Goals

- Do not import full upstream Obsidian theme CSS into Local Markdown Reader.
- Do not support remote font loading or arbitrary `url(...)` resources in theme CSS.
- Do not replace the existing built-in color mode preference with a "theme" concept.
- Do not make these themes depend on Obsidian-only plugin DOM structures.

## Theme Positioning

### 1. Minimal Focus

Reference direction: Minimal, Shimmering Focus.

Visual target: a low-noise technical reading style with weak borders, restrained headings, high legibility, and quiet navigation chrome.

Distinctive traits:
- Document surface is calm and mostly flat.
- Headings use size and whitespace more than decoration.
- Tables and code blocks are readable but not visually heavy.
- File tree and outline active states are subtle.

Required support:
- Document padding and border strength tokens.
- Heading margin and border width tokens.
- Outline active background and text tokens.
- Scrollbar and resize handle tokens for quiet chrome.

### 2. Typewriter Desk

Reference direction: Typewriter, Red Graphite, Typomagical.

Visual target: long-form writing, paper texture feel without images, serif or slab-serif headings, generous line height, and strong paragraph rhythm.

Distinctive traits:
- Paper-like surface and warmer neutrals.
- More editorial heading rhythm.
- Blockquotes feel like pull quotes.
- Code and tables remain functional but secondary.

Required support:
- Paragraph spacing, optional first-line indent, and list rhythm tokens.
- Blockquote padding, border, background, and typography tokens.
- Heading family, margin, decoration, and letter-case tokens.
- Mark and link decoration tokens.

### 3. Topaz Lab

Reference direction: Blue Topaz, Pink Topaz.

Visual target: colorful, customizable, component-rich style with strong callouts, tags, tables, and interactive controls.

Distinctive traits:
- Strong accent palette with multiple semantic colors.
- Callouts and tags are visually prominent.
- Tables have clear header, zebra, hover, and control affordances.
- Fullscreen table and Mermaid controls match the theme.

Required support:
- Semantic callout type tokens for note, info, tip, warning, danger, quote, todo, and abstract.
- Tag and badge variants.
- Table toolbar, statistic badge, fullscreen button, and scroll-shadow tokens.
- Higher CSS/token package limits.

### 4. ITS Atlas

Reference direction: ITS Theme.

Visual target: knowledge-base and reference-document reading, optimized for dense content, tables, metadata, YAML, callouts, and structured notes.

Distinctive traits:
- High information density without becoming cramped.
- Tables, YAML summaries, JSON summaries, and block sections have strong hierarchy.
- Callouts and blockquotes are part of the document structure.
- Code blocks and inline code remain distinct in dense pages.

Required support:
- YAML/JSON reader summary tokens.
- Section/card surface tokens for generated readers.
- Table density and full-screen table panel tokens.
- Callout type tokens and block title tokens.

### 5. Primary Soft

Reference direction: Primary.

Visual target: friendly, rounded, soft, creative reading environment with a stronger design-system feel.

Distinctive traits:
- Rounded controls and panels.
- Softer shadows and gentle color surfaces.
- File tree, toolbar, outline, and document components feel cohesive.
- Tags and task checkboxes are visibly styled.

Required support:
- Radius scale tokens: small, medium, large, pill.
- Shadow scale tokens: small, medium, elevated.
- Button/control hover, active, focus, and disabled tokens.
- Checkbox radius and checked mark tokens.

### 6. Palette Port

Reference direction: Catppuccin, Tokyo Night, Nord, Dracula.

Visual target: faithful palette-driven dark/light reading themes where code and semantic colors are the main identity.

Distinctive traits:
- Color palette is coherent across text, code, callouts, links, tags, and chrome.
- Syntax highlighting feels intentional, not generic.
- Dark mode contrast is comfortable over long sessions.

Required support:
- Expanded syntax tokens for number, operator, punctuation, variable, type, property, tag, attribute, regexp, inserted, and deleted.
- Semantic palette tokens beyond red/orange/yellow/green/cyan/blue/purple/pink.
- True light/dark token overrides in theme packages.

### 7. Desktop Native

Reference direction: Cupertino, Border, GitHub Theme.

Visual target: local desktop document app, where toolbar, file tree, outline, controls, and document surface all look native and deliberate.

Distinctive traits:
- App chrome is as important as the markdown body.
- File tree rows, disclosure icons, toolbar buttons, and resize handles are themed.
- The document surface can be flat or panel-like depending on mode.

Required support:
- Toolbar background, border, height, and blur tokens.
- File tree row height, hover, active, icon, disclosure, and state tokens.
- Outline button padding, active indicator, and border tokens.
- Scrollbar and resize handle tokens.

### 8. Terminal Console

Reference direction: Terminal, Ono Sendai.

Visual target: monospace-first technical reading, terminal-like density, sharp edges, strong code identity, and command-line-inspired headings.

Distinctive traits:
- Monospace typography dominates headings, code, and optionally body.
- Borders are sharp and grid-like.
- Headings can show prefix-like decoration.
- Tables and code blocks feel console-native.

Required support:
- Heading prefix/decoration tokens or safe theme CSS selectors.
- Code block border, header, and line-number-adjacent styling.
- Table border and density tokens.
- Focus ring and selection tokens.

### 9. Cyber Glow

Reference direction: Cybertron, Cyber Glow.

Visual target: futuristic dark theme with controlled neon accents, glow effects, and high contrast.

Distinctive traits:
- Dark surfaces with glow on links, active controls, and important blocks.
- Callouts and code blocks use accent borders or shadows.
- Mermaid/table fullscreen controls should look integrated.

Required support:
- Glow shadow tokens.
- Focus ring tokens.
- Control and floating action button tokens.
- Mermaid wrapper, zoom button, fullscreen overlay, and diagram surface tokens.

### 10. Yin Editorial

Reference direction: Yin and Yang, Red Graphite.

Visual target: strong editorial contrast, black/white or red/graphite emphasis, magazine-like headings, and clean reading hierarchy.

Distinctive traits:
- Light and dark modes are intentionally different, not just inverted.
- Headings have strong contrast and editorial spacing.
- Links, marks, quotes, and horizontal rules carry the identity.

Required support:
- `lightTokens` and `darkTokens` in theme packages.
- Heading rule, text-transform, and margin tokens.
- Link underline style, mark style, and horizontal rule tokens.
- Blockquote typography tokens.

## Token Expansion

### Layout Tokens

- `--reader-document-padding`
- `--reader-document-border-width`
- `--reader-document-border-style`
- `--reader-document-shadow`
- `--reader-section-gap`
- `--reader-scrollbar-thumb`
- `--reader-scrollbar-track`

### Heading Tokens

- `--reader-h1-margin` through `--reader-h6-margin`
- `--reader-h1-padding` through `--reader-h6-padding`
- `--reader-h1-border-width` through `--reader-h6-border-width`
- `--reader-heading-text-transform`
- `--reader-heading-letter-spacing`
- `--reader-heading-decoration-color`
- `--reader-heading-decoration-width`

### Typography Tokens

- `--reader-body-letter-spacing`
- `--reader-paragraph-indent`
- `--reader-link-decoration`
- `--reader-link-decoration-thickness`
- `--reader-link-underline-offset`
- `--reader-strong-color`
- `--reader-em-color`

### Chrome Tokens

- `--reader-toolbar-border`
- `--reader-toolbar-height`
- `--reader-toolbar-blur`
- `--reader-control-border`
- `--reader-control-hover-bg`
- `--reader-control-active-bg`
- `--reader-control-focus-ring`
- `--reader-file-tree-row-height`
- `--reader-file-tree-icon-color`
- `--reader-file-tree-disclosure-color`
- `--reader-outline-border`
- `--reader-outline-active-color`
- `--reader-resize-handle-color`

### Table Tokens

- `--reader-table-font-size`
- `--reader-table-header-text`
- `--reader-table-header-shadow`
- `--reader-table-cell-min-width`
- `--reader-table-cell-max-width`
- `--reader-table-fullscreen-bg`
- `--reader-table-fullscreen-panel-bg`
- `--reader-table-fullscreen-toolbar-bg`
- `--reader-table-action-bg`
- `--reader-table-action-color`
- `--reader-table-stat-bg`
- `--reader-table-stat-color`
- `--reader-table-scroll-shadow`

### Callout Tokens

Base:
- `--reader-callout-padding`
- `--reader-callout-title-font`
- `--reader-callout-title-weight`
- `--reader-callout-icon-color`

Typed:
- `--reader-callout-note-bg`
- `--reader-callout-note-border`
- `--reader-callout-note-title`
- `--reader-callout-info-bg`
- `--reader-callout-info-border`
- `--reader-callout-info-title`
- `--reader-callout-tip-bg`
- `--reader-callout-tip-border`
- `--reader-callout-tip-title`
- `--reader-callout-warning-bg`
- `--reader-callout-warning-border`
- `--reader-callout-warning-title`
- `--reader-callout-danger-bg`
- `--reader-callout-danger-border`
- `--reader-callout-danger-title`

### Code And Syntax Tokens

- `--reader-code-padding`
- `--reader-code-block-shadow`
- `--reader-code-line-height`
- `--reader-syntax-number`
- `--reader-syntax-operator`
- `--reader-syntax-punctuation`
- `--reader-syntax-variable`
- `--reader-syntax-type`
- `--reader-syntax-property`
- `--reader-syntax-tag`
- `--reader-syntax-attr`
- `--reader-syntax-regexp`
- `--reader-syntax-inserted`
- `--reader-syntax-deleted`

### Component Scale Tokens

- `--reader-radius-sm`
- `--reader-radius-md`
- `--reader-radius-lg`
- `--reader-radius-pill`
- `--reader-shadow-sm`
- `--reader-shadow-md`
- `--reader-shadow-lg`
- `--reader-shadow-glow`

### Generated Reader Tokens

- `--reader-json-summary-bg`
- `--reader-json-summary-border`
- `--reader-yaml-summary-bg`
- `--reader-yaml-summary-border`
- `--reader-large-document-panel-bg`
- `--reader-large-document-line-number`
- `--reader-mermaid-bg`
- `--reader-mermaid-border`
- `--reader-mermaid-control-bg`
- `--reader-mermaid-control-color`

## Theme Package Schema Changes

The package shape should evolve from:

```json
{
  "tokens": {},
  "css": ""
}
```

to:

```json
{
  "tokens": {},
  "lightTokens": {},
  "darkTokens": {},
  "css": "",
  "features": ["tables", "callouts", "chrome"],
  "previewFixtures": ["longform", "technical", "data-table"]
}
```

Compatibility rules:
- Existing packages remain valid.
- `tokens` are always applied.
- `lightTokens` apply when the reader resolves to light mode.
- `darkTokens` apply when the reader resolves to dark mode.
- `features` are metadata for catalog filtering and preview badges.
- `previewFixtures` declare which preview fixtures best show the theme.

Limits:
- Raise token limit from 160 to 320.
- Raise CSS limit from 64KB to 128KB initially.
- Keep rejecting `@import`, `url(...)`, `@font-face`, `javascript:`, `expression(...)`, and `behavior`.

## Preview Requirements

The remote theme preview must include a fixed, rich sample document:

- H1 through H6
- normal paragraphs and dense paragraphs
- ordered and unordered lists
- task list
- blockquote
- note, tip, warning, and danger callouts
- inline code and fenced code
- syntax-highlighted code
- wide table and compact table
- table row/column count badge
- Mermaid block
- tags and marks
- JSON/YAML summary panels
- file tree and outline chrome

This prevents themes from looking different only in the package but similar in the catalog.

## Similarity Checks

Theme generation should produce a local report that compares:

- token key overlap
- exact token value overlap
- color bucket similarity
- CSS selector similarity
- category coverage for headings, tables, callouts, code, lists, chrome, generated readers, and controls

Acceptance target for the 10-theme set:
- Average overall similarity below 35%.
- No pair above 65% unless intentionally part of the same family.
- At least 8 of 10 themes must have a unique dominant feature category.
- Each theme must use at least 3 component groups beyond base colors.

## Implementation Phases

### Phase 1: Foundation

- Add new token defaults to `DEFAULT_READER_THEME_TOKENS`.
- Apply new tokens in `src/reader/App.css`.
- Extend theme package parsing for `lightTokens`, `darkTokens`, `features`, and `previewFixtures`.
- Preserve existing package compatibility.
- Increase safe token and CSS limits.

### Phase 2: Built-In And Existing Themes

- Update built-in reading styles to use the new tokens.
- Update the existing remote themes `ink-focus`, `night-study`, and `report-grid`.
- Update schema documentation and tests.

### Phase 3: Theme Profiles

- Replace the removed Obsidian draft generator with 10 style profiles.
- Each profile must define typography, layout, table, callout, code, chrome, and generated-reader behavior.
- Generate packages and previews from the profiles.

### Phase 4: Validation

- Run unit tests, typecheck, build, theme index generation, and distribution verification.
- Run the similarity report.
- Review generated preview output before publishing.

### Phase 5: Release

- Publish the 10 remote theme packages and previews.
- Update remote theme index.
- Prepare release notes describing the theme system expansion.

## Open Decision

The recommended first implementation step is Phase 1. It should be completed before rebuilding the 10 themes; otherwise the new themes will again depend on ad hoc CSS and will be harder to keep distinct.
