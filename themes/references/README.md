# Theme Reference Research

This folder tracks external theme packages used as visual references while building Local Markdown Reader themes.

## Rules

- Keep external themes as references only until their license is reviewed.
- Do not copy CSS, token files, screenshots, or bundled assets into this repository unless the license explicitly allows it and attribution is recorded.
- Prefer deriving reader-specific themes from observed qualities: density, contrast, table readability, heading rhythm, code block treatment, and light/dark behavior.
- Every candidate in `catalog.json` must include `sourceUrl`, `license.status`, `usage`, and `reviewStatus`.

## Workflow

1. Add reference candidates to `catalog.json`.
2. Keep `usage` as `inspiration-only` until license review is complete.
3. Move useful references to `shortlisted` after visual review.
4. Create new Local Markdown Reader theme packages from first principles.
5. Run `npm run themes:references:verify` before release.
