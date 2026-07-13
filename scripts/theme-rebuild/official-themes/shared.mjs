export function defineThemeProfile(input) {
  return Object.freeze({
    ...input,
    upstreamReference: input.references[0],
    tags: Object.freeze(input.tags),
    references: Object.freeze(input.references),
    signatureFeatureIds: Object.freeze(input.signatureFeatureIds),
    nonColorFeatureIds: Object.freeze(input.nonColorFeatureIds),
    typography: Object.freeze(input.typography),
    tokens: Object.freeze(input.tokens ?? {}),
    light: Object.freeze(input.light),
    dark: Object.freeze(input.dark),
  });
}

export function palette({ page, surface, panel, border, text, muted, accent, accentSoft, code, mark = '#fff2a8', extra = {} }) {
  return {
    page,
    surface,
    panel,
    border,
    text,
    muted,
    accent,
    accentSoft,
    code,
    tableHead: extra.tableHead ?? panel,
    stripe: extra.stripe ?? page,
    quote: extra.quote ?? panel,
    mark,
    ...extra,
  };
}

export const COMMON_REFERENCES = Object.freeze({
  quiet: ['Minimal', 'Shimmering Focus', 'Notation'],
  typewriter: ['Typewriter', 'Typomagical', 'Yin and Yang'],
  topaz: ['Blue Topaz', 'Pink Topaz', 'Prism'],
  atlas: ['ITS Theme', 'Notation', 'Willemstad'],
  soft: ['Primary', 'Things', 'Shiba Inu'],
  palette: ['Catppuccin', 'Tokyo Night', 'Obsidian Nord', 'Dracula Official'],
  desktop: ['Cupertino', 'Border', 'GitHub Theme', 'Obuntu'],
  terminal: ['Terminal', 'Ono Sendai', 'PLN', 'Atom'],
  neon: ['Cybertron', 'Cyber Glow', '80s Neon', 'Obsidianite'],
  editorial: ['Yin and Yang', 'Sanctum', 'Ukiyo', 'Everforest'],
});

export const CORE_FEATURES = Object.freeze([
  'table-sticky-header-frame',
  'table-hover-row',
  'control-pressed-state',
  'control-focus-ring',
  'control-disabled-muted',
  'tree-disclosure-themed',
  'tree-icon-sized',
  'outline-hierarchy-indent',
  'mermaid-floating-controls',
  'fullscreen-table-docked-actions',
]);

export function features(...ids) {
  return [...new Set([...ids, ...CORE_FEATURES])].slice(0, 22);
}
