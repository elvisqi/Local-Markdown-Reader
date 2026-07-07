import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OBSIDIAN_THEME_IDS = [
  'minimal-focus',
  'things-flow',
  'pastel-puccin',
  'topaz-blue',
  'nord-notes',
  'atom-one-reader',
  'obsidianite-dark',
  'wasp-highlight',
  'typewriter-desk',
  'its-readable',
];

const DEFAULT_COLOR_SET = {
  blue: 'var(--reader-color-blue)',
  purple: 'var(--reader-color-purple)',
  pink: 'var(--reader-color-pink)',
  green: 'var(--reader-color-green)',
  yellow: 'var(--reader-color-yellow)',
  red: 'var(--reader-color-red)',
  cyan: 'var(--reader-color-cyan)',
  orange: 'var(--reader-color-orange)',
};

const THEME_PROFILES = {
  'minimal-focus': {
    origin: 'Minimal',
    shape: 'quiet',
    density: 'airy',
    radius: '6px',
    softRadius: '8px',
    strongRadius: '4px',
    borderWidth: '1px',
    accentWidth: '2px',
    headingAlign: 'left',
    headingTransform: 'none',
    headingWeight: '650',
    headingSpacing: '1.8em',
    paragraphIndent: '0',
    tableMode: 'separated',
    codeMode: 'quiet',
    calloutMode: 'subtle',
    tagMode: 'outline',
    shadow: 'none',
    strongShadow: 'none',
    glow: 'none',
    colors: {
      pink: '#a1738f',
      green: '#6d8a68',
      yellow: '#a68a3b',
      red: '#a66b63',
      cyan: '#5f8588',
      orange: '#a2784d',
    },
    signatureRules: [
      ['.markdown-heading', 'margin-top: 1.8em; margin-bottom: 0.55em; border-bottom: 0; letter-spacing: 0'],
      ['.markdown-heading--h2', 'font-weight: 620; color: var(--reader-muted)'],
      ['.markdown-quote', 'border-left-width: 2px; padding: 0.2em 0 0.2em 1em; background: transparent'],
      ['.callout', 'border: 1px solid var(--reader-border); border-left-width: 3px; box-shadow: none'],
      ['.markdown-tag', 'background: transparent; border: 1px solid var(--reader-border); color: var(--reader-muted)'],
    ],
  },
  'things-flow': {
    origin: 'Things',
    shape: 'rounded-productivity',
    density: 'comfortable',
    radius: '14px',
    softRadius: '18px',
    strongRadius: '999px',
    borderWidth: '0',
    accentWidth: '6px',
    headingAlign: 'left',
    headingTransform: 'none',
    headingWeight: '760',
    headingSpacing: '1.45em',
    paragraphIndent: '0',
    tableMode: 'rounded',
    codeMode: 'soft-panel',
    calloutMode: 'card',
    tagMode: 'pill',
    shadow: '0 8px 24px rgba(42, 66, 49, 0.11)',
    strongShadow: '0 14px 36px rgba(42, 66, 49, 0.16)',
    glow: 'none',
    colors: {
      pink: '#d4779f',
      green: '#55a879',
      yellow: '#d59b37',
      red: '#d06b5c',
      cyan: '#4ea6a6',
      orange: '#d18448',
    },
    signatureRules: [
      ['.markdown-heading--h2', 'border-bottom: 3px solid var(--reader-accent-muted); padding-bottom: 0.32em; color: var(--reader-accent)'],
      ['.markdown-heading--h3', 'display: inline-flex; padding: 0.08em 0.44em; border-radius: 999px; background: var(--reader-accent-muted)'],
      ['.callout', 'border: 0; border-radius: 18px; background: linear-gradient(135deg, var(--reader-callout-bg), var(--reader-accent-muted)); box-shadow: 0 8px 24px rgba(42, 66, 49, 0.11)'],
      ['.callout-title', 'display: inline-flex; padding: 0.12em 0.5em; border-radius: 999px; background: var(--reader-accent-muted); color: var(--reader-accent)'],
      ['.markdown-task', 'border-radius: 10px; padding: 0.12em 0.42em'],
      ['.markdown-tag', 'background: #bde1d3; color: #1d694b; border-radius: 999px; font-weight: 750'],
    ],
  },
  'pastel-puccin': {
    origin: 'AnuPpuccin and Catppuccin',
    shape: 'pastel-soft',
    density: 'comfortable',
    radius: '14px',
    softRadius: '16px',
    strongRadius: '18px',
    borderWidth: '1px',
    accentWidth: '5px',
    headingAlign: 'left',
    headingTransform: 'none',
    headingWeight: '760',
    headingSpacing: '1.6em',
    paragraphIndent: '0',
    tableMode: 'pastel-card',
    codeMode: 'pastel-panel',
    calloutMode: 'pastel',
    tagMode: 'tinted',
    shadow: '0 12px 26px rgba(10, 8, 16, 0.18)',
    strongShadow: '0 14px 34px rgba(10, 8, 16, 0.22)',
    glow: '0 0 0 1px rgba(199, 165, 255, 0.12)',
    colors: {
      pink: '#f5bde6',
      green: '#a6da95',
      yellow: '#eed49f',
      red: '#ed8796',
      cyan: '#91d7e3',
      orange: '#f5a97f',
    },
    signatureRules: [
      [':root', '--reader-theme-palette: pastel'],
      ['.markdown-heading--h1', 'color: var(--reader-color-pink); border-bottom: 1px solid rgba(199, 165, 255, 0.28)'],
      ['.markdown-link', 'color: var(--reader-color-cyan); text-decoration-style: wavy'],
      ['.callout', 'background: color-mix(in srgb, var(--reader-color-pink) 10%, transparent); border-radius: 14px; box-shadow: 0 14px 34px rgba(10, 8, 16, 0.22)'],
      ['.markdown-code-block', 'border: 1px solid rgba(199, 165, 255, 0.28); border-radius: 16px; box-shadow: 0 12px 26px rgba(10, 8, 16, 0.22)'],
      ['.markdown-table', 'border-collapse: separate; border-spacing: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 24px rgba(10, 8, 16, 0.16)'],
    ],
  },
  'topaz-blue': {
    origin: 'Blue Topaz',
    shape: 'blue-decorative',
    density: 'feature-rich',
    radius: '10px',
    softRadius: '14px',
    strongRadius: '12px',
    borderWidth: '1px',
    accentWidth: '4px',
    headingAlign: 'center',
    headingTransform: 'none',
    headingWeight: '780',
    headingSpacing: '1.5em',
    paragraphIndent: '0',
    tableMode: 'framed',
    codeMode: 'panel',
    calloutMode: 'blue-frame',
    tagMode: 'blue-pill',
    shadow: '0 10px 28px rgba(45, 107, 161, 0.12)',
    strongShadow: '0 18px 42px rgba(45, 107, 161, 0.18)',
    glow: '0 0 0 1px rgba(45, 107, 161, 0.12)',
    colors: {
      pink: '#c47aa2',
      green: '#5b9e73',
      yellow: '#c69a32',
      red: '#c65f5f',
      cyan: '#48a8bd',
      orange: '#c98642',
    },
    signatureRules: [
      ['.markdown-heading--h1', 'text-align: center; border-top: 3px double var(--reader-heading-border); border-bottom: 4px double var(--reader-heading-border); padding: 0.22em 0 0.35em'],
      ['.markdown-heading--h2', 'color: var(--reader-accent); border-bottom: 2px solid var(--reader-accent-muted); padding-bottom: 0.25em'],
      ['.callout', 'border: 1px solid rgba(45, 107, 161, 0.22); border-left: 5px solid var(--reader-accent); background: linear-gradient(90deg, rgba(45, 107, 161, 0.12), transparent)'],
      ['.markdown-table-cell--head', 'background: linear-gradient(90deg, var(--reader-accent-muted), transparent); color: var(--reader-accent)'],
      ['hr', 'background: linear-gradient(90deg, transparent, var(--reader-accent), transparent)'],
    ],
  },
  'nord-notes': {
    origin: 'Obsidian Nord',
    shape: 'frost-editor',
    density: 'compact',
    radius: '4px',
    softRadius: '6px',
    strongRadius: '2px',
    borderWidth: '1px',
    accentWidth: '6px',
    headingAlign: 'left',
    headingTransform: 'uppercase',
    headingWeight: '700',
    headingSpacing: '1.55em',
    paragraphIndent: '0',
    tableMode: 'frost-grid',
    codeMode: 'editor',
    calloutMode: 'frost',
    tagMode: 'outline',
    shadow: 'none',
    strongShadow: '0 12px 30px rgba(7, 12, 20, 0.24)',
    glow: '0 0 0 1px rgba(136, 192, 208, 0.12)',
    colors: {
      pink: '#b48ead',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      red: '#bf616a',
      cyan: '#88c0d0',
      orange: '#d08770',
    },
    signatureRules: [
      [':root', '--reader-theme-temperature: frost'],
      ['.markdown-heading', 'font-family: var(--reader-heading-font); text-transform: uppercase; letter-spacing: 0.07em'],
      ['.callout', 'border: 1px solid var(--reader-base-30); border-left: 6px solid var(--reader-color-cyan); border-radius: 2px; background: var(--reader-base-10)'],
      ['.callout-title', 'color: var(--reader-color-cyan); text-transform: uppercase; letter-spacing: 0.07em'],
      ['.markdown-task-checkbox', 'border-radius: 2px; border-color: var(--reader-color-cyan)'],
      ['.markdown-table', 'border-collapse: collapse; font-variant-numeric: tabular-nums'],
    ],
  },
  'atom-one-reader': {
    origin: 'Atom',
    shape: 'code-editor',
    density: 'compact',
    radius: '6px',
    softRadius: '8px',
    strongRadius: '4px',
    borderWidth: '1px',
    accentWidth: '3px',
    headingAlign: 'left',
    headingTransform: 'none',
    headingWeight: '700',
    headingSpacing: '1.45em',
    paragraphIndent: '0',
    tableMode: 'editor-grid',
    codeMode: 'editor',
    calloutMode: 'editor',
    tagMode: 'mono-outline',
    shadow: 'none',
    strongShadow: '0 14px 32px rgba(0, 0, 0, 0.22)',
    glow: '0 0 0 1px rgba(97, 175, 239, 0.12)',
    colors: {
      pink: '#c678dd',
      green: '#98c379',
      yellow: '#e5c07b',
      red: '#e06c75',
      cyan: '#56b6c2',
      orange: '#d19a66',
    },
    signatureRules: [
      [':root', '--reader-theme-editor-chrome: atom'],
      ['.markdown-heading', 'font-family: var(--reader-monospace-font); letter-spacing: 0'],
      ['.markdown-quote', 'border-left: 3px solid var(--reader-color-green); background: var(--reader-base-10); font-family: var(--reader-monospace-font)'],
      ['.markdown-code-block', 'border: 1px solid var(--reader-code-border); border-left: 3px solid var(--reader-color-blue); border-radius: 6px; font-family: var(--reader-monospace-font)'],
      ['.markdown-tag', 'font-family: var(--reader-monospace-font); border: 1px solid var(--reader-base-30); color: var(--reader-color-yellow)'],
      ['.markdown-table', 'border-collapse: collapse; font-family: var(--reader-monospace-font)'],
    ],
  },
  'obsidianite-dark': {
    origin: 'Obsidianite',
    shape: 'neon-dark',
    density: 'comfortable',
    radius: '10px',
    softRadius: '12px',
    strongRadius: '10px',
    borderWidth: '1px',
    accentWidth: '5px',
    headingAlign: 'left',
    headingTransform: 'none',
    headingWeight: '780',
    headingSpacing: '1.5em',
    paragraphIndent: '0',
    tableMode: 'neon-grid',
    codeMode: 'glow',
    calloutMode: 'glow',
    tagMode: 'neon',
    shadow: '0 0 0 1px rgba(14, 210, 247, 0.08)',
    strongShadow: '0 0 28px rgba(14, 210, 247, 0.16)',
    glow: '0 0 18px rgba(14, 210, 247, 0.26)',
    colors: {
      pink: '#ff7edb',
      green: '#72f1b8',
      yellow: '#fede5d',
      red: '#ff5370',
      cyan: '#0ed2f7',
      orange: '#f78c6c',
    },
    signatureRules: [
      [':root', '--reader-theme-glow: neon'],
      ['.markdown-heading--h1', 'border-bottom: 1px solid var(--reader-accent); color: var(--reader-color-purple); text-shadow: 0 0 14px rgba(157, 140, 255, 0.24)'],
      ['.markdown-heading--h2', 'color: var(--reader-color-cyan); text-shadow: 0 0 12px rgba(14, 210, 247, 0.24)'],
      ['.markdown-quote', 'position: relative; border-left: 0; padding-left: 1.25em; box-shadow: inset 4px 0 0 var(--reader-accent)'],
      ['.callout', 'border: 1px solid rgba(157, 140, 255, 0.28); border-left: 5px solid var(--reader-accent); border-radius: 10px; box-shadow: 0 0 24px rgba(14, 210, 247, 0.16)'],
      ['.markdown-tag', 'border: 1px solid rgba(157, 140, 255, 0.38); background: rgba(14, 210, 247, 0.12); color: var(--reader-color-cyan); font-family: var(--reader-monospace-font)'],
    ],
  },
  'wasp-highlight': {
    origin: 'Wasp',
    shape: 'warning-contrast',
    density: 'compact',
    radius: '0',
    softRadius: '0',
    strongRadius: '0',
    borderWidth: '1px',
    accentWidth: '6px',
    headingAlign: 'left',
    headingTransform: 'uppercase',
    headingWeight: '820',
    headingSpacing: '1.35em',
    paragraphIndent: '0',
    tableMode: 'warning-grid',
    codeMode: 'warning-panel',
    calloutMode: 'warning',
    tagMode: 'warning-label',
    shadow: 'none',
    strongShadow: '0 0 0 2px rgba(248, 197, 55, 0.18)',
    glow: '0 0 18px rgba(248, 197, 55, 0.18)',
    colors: {
      pink: '#d3869b',
      green: '#83a598',
      yellow: '#f8c537',
      red: '#fb4934',
      cyan: '#8ec07c',
      orange: '#fe8019',
    },
    signatureRules: [
      [':root', '--reader-theme-contrast: wasp'],
      ['.markdown-heading', 'text-transform: uppercase; letter-spacing: 0.08em'],
      ['.markdown-heading--h1', 'color: #f8c537; border-bottom: 2px solid #f8c537'],
      ['.callout', 'border: 1px solid #7a5c14; border-left: 6px solid #f8c537; border-radius: 0; background: rgba(248, 197, 55, 0.08)'],
      ['.markdown-tag', 'text-transform: uppercase; letter-spacing: 0.06em; border: 1px solid #f8c537; color: #f8c537; background: rgba(248, 197, 55, 0.08)'],
      ['hr::after', 'content: ""; position: absolute; right: 0; top: -0.2em; width: 3.2em; height: 3px; background: #f8c537'],
    ],
  },
  'typewriter-desk': {
    origin: 'Typewriter',
    shape: 'paper-manuscript',
    density: 'longform',
    radius: '0',
    softRadius: '0',
    strongRadius: '0',
    borderWidth: '1px',
    accentWidth: '3px',
    headingAlign: 'center',
    headingTransform: 'uppercase',
    headingWeight: '700',
    headingSpacing: '2.2em',
    paragraphIndent: '1.4em',
    tableMode: 'manuscript',
    codeMode: 'typewritten',
    calloutMode: 'paper-note',
    tagMode: 'stamp',
    shadow: '3px 3px 0 var(--reader-border)',
    strongShadow: '4px 4px 0 var(--reader-border)',
    glow: 'none',
    colors: {
      pink: '#9f6d75',
      green: '#6f7f58',
      yellow: '#a1874b',
      red: '#a65c4b',
      cyan: '#5f7f82',
      orange: '#a36f43',
    },
    signatureRules: [
      [':root', '--reader-theme-paper: manuscript'],
      ['.markdown-heading', 'font-family: var(--reader-heading-font); text-align: center; text-transform: uppercase; letter-spacing: 0.08em'],
      ['.markdown-paragraph', 'text-indent: 1.4em; line-height: 1.9'],
      ['.callout', 'border: 1px solid var(--reader-border); border-radius: 0; padding: 1em 1.2em; background: var(--reader-callout-bg); box-shadow: 4px 4px 0 var(--reader-border)'],
      ['.markdown-table', 'border-collapse: collapse; font-family: var(--reader-monospace-font); font-size: 0.92em'],
    ],
  },
  'its-readable': {
    origin: 'ITS Theme',
    shape: 'structured-readable',
    density: 'comfortable',
    radius: '8px',
    softRadius: '10px',
    strongRadius: '999px',
    borderWidth: '1px',
    accentWidth: '5px',
    headingAlign: 'left',
    headingTransform: 'none',
    headingWeight: '820',
    headingSpacing: '1.55em',
    paragraphIndent: '0',
    tableMode: 'readable-card',
    codeMode: 'readable-panel',
    calloutMode: 'left-rail',
    tagMode: 'badge',
    shadow: '0 1px 0 var(--reader-border)',
    strongShadow: '0 10px 28px rgba(31, 50, 78, 0.12)',
    glow: 'none',
    colors: {
      pink: '#b86f91',
      green: '#5d9b72',
      yellow: '#c59a3f',
      red: '#c25f62',
      cyan: '#4fa7ad',
      orange: '#c17d43',
    },
    signatureRules: [
      [':root', '--reader-theme-layout: readable'],
      ['.markdown-heading', 'position: relative; padding-left: 0.9em'],
      ['.markdown-heading::before', 'content: ""; position: absolute; left: 0; top: 0.28em; width: 0.28em; height: 0.9em; border-radius: 999px; background: var(--reader-accent)'],
      ['.callout', 'border: 1px solid var(--reader-callout-border); border-left: 5px solid var(--reader-accent); border-radius: 10px; padding: 1em; box-shadow: 0 1px 0 var(--reader-border)'],
      ['.markdown-summary-grid', 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75em'],
    ],
  },
};

const VISIBLE_SIGNATURES = {
  'minimal-focus': {
    label: 'Minimal',
    headingPrefix: '',
    codeLabel: 'plain',
    tableLabel: 'data',
    tagPrefix: '',
    imageLabel: 'image',
    diagramLabel: 'flow',
    accentLine: '1px solid var(--reader-border)',
    documentBadge: 'color: var(--reader-muted); background: transparent; border: 1px solid var(--reader-border); letter-spacing: 0.08em',
    h1Prefix: 'width: 0.65em; height: 1px; margin-right: 0.45em; background: var(--reader-muted); vertical-align: middle',
    h2Rule: 'width: 44px; height: 1px; background: var(--reader-border); opacity: 0.8',
    codePanel: 'background: var(--reader-code-bg); border-left: 2px solid var(--reader-border)',
    tableMarker: 'background: transparent; color: var(--reader-muted); border-bottom: 1px solid var(--reader-border)',
    tagMarker: 'color: var(--reader-muted)',
    mediaMarker: 'background: transparent; border: 1px solid var(--reader-border); color: var(--reader-muted)',
    ruleMarker: 'width: 32px; height: 1px; background: var(--reader-border)',
  },
  'things-flow': {
    label: 'Things',
    headingPrefix: 'todo',
    codeLabel: 'log',
    tableLabel: 'status board',
    tagPrefix: 'task',
    imageLabel: 'card',
    diagramLabel: 'flow',
    accentLine: '0',
    documentBadge: 'color: #1d694b; background: #bde1d3; border: 0; border-radius: 999px; box-shadow: 0 8px 24px rgba(42, 66, 49, 0.11)',
    h1Prefix: 'padding: 0.14em 0.42em; margin-right: 0.5em; border-radius: 999px; background: var(--reader-accent-muted); color: var(--reader-accent); font-size: 0.46em',
    h2Rule: 'width: 76px; height: 5px; border-radius: 999px; background: linear-gradient(90deg, var(--reader-accent), var(--reader-color-green))',
    codePanel: 'background: linear-gradient(135deg, var(--reader-code-bg), var(--reader-accent-muted)); border: 0; box-shadow: 0 8px 24px rgba(42, 66, 49, 0.11)',
    tableMarker: 'background: var(--reader-accent-muted); color: var(--reader-accent); border-radius: 999px',
    tagMarker: 'color: #1d694b',
    mediaMarker: 'background: #bde1d3; border: 0; color: #1d694b',
    ruleMarker: 'width: 96px; height: 5px; border-radius: 999px; background: linear-gradient(90deg, var(--reader-color-green), transparent)',
  },
  'pastel-puccin': {
    label: 'Pastel',
    headingPrefix: 'soft',
    codeLabel: 'palette',
    tableLabel: 'cream grid',
    tagPrefix: 'mood',
    imageLabel: 'cover',
    diagramLabel: 'map',
    accentLine: '1px solid rgba(199, 165, 255, 0.28)',
    documentBadge: 'color: var(--reader-color-pink); background: color-mix(in srgb, var(--reader-color-pink) 14%, transparent); border: 1px solid rgba(199, 165, 255, 0.28); border-radius: 14px',
    h1Prefix: 'padding: 0.12em 0.36em; margin-right: 0.45em; border-radius: 14px; background: color-mix(in srgb, var(--reader-color-pink) 14%, transparent); color: var(--reader-color-pink); font-size: 0.45em',
    h2Rule: 'width: 88px; height: 4px; border-radius: 999px; background: linear-gradient(90deg, var(--reader-color-pink), var(--reader-color-cyan), var(--reader-color-purple))',
    codePanel: 'background: color-mix(in srgb, var(--reader-color-purple) 8%, var(--reader-code-bg)); border: 1px solid rgba(199, 165, 255, 0.28)',
    tableMarker: 'background: color-mix(in srgb, var(--reader-color-pink) 12%, transparent); color: var(--reader-color-pink); border-radius: 14px',
    tagMarker: 'color: var(--reader-color-pink)',
    mediaMarker: 'background: color-mix(in srgb, var(--reader-color-cyan) 12%, transparent); border: 1px solid rgba(199, 165, 255, 0.28); color: var(--reader-color-cyan)',
    ruleMarker: 'width: 92px; height: 4px; border-radius: 999px; background: linear-gradient(90deg, var(--reader-color-pink), var(--reader-color-purple))',
  },
  'topaz-blue': {
    label: 'Topaz',
    headingPrefix: 'topaz',
    codeLabel: 'panel',
    tableLabel: 'blue topaz',
    tagPrefix: 'ref',
    imageLabel: 'plate',
    diagramLabel: 'chart',
    accentLine: '3px double var(--reader-heading-border)',
    documentBadge: 'color: var(--reader-accent); background: linear-gradient(90deg, rgba(45, 107, 161, 0.12), transparent); border: 1px solid rgba(45, 107, 161, 0.22); border-radius: 10px',
    h1Prefix: 'display: block; width: 64px; height: 3px; margin: 0 auto 0.28em; background: linear-gradient(90deg, transparent, var(--reader-accent), transparent)',
    h2Rule: 'width: 100%; height: 2px; background: linear-gradient(90deg, transparent, var(--reader-accent), transparent)',
    codePanel: 'background: linear-gradient(90deg, rgba(45, 107, 161, 0.12), var(--reader-code-bg)); border-left: 4px solid var(--reader-accent)',
    tableMarker: 'background: linear-gradient(90deg, var(--reader-accent-muted), transparent); color: var(--reader-accent); border-bottom: 1px solid rgba(45, 107, 161, 0.22)',
    tagMarker: 'color: var(--reader-accent)',
    mediaMarker: 'background: linear-gradient(90deg, rgba(45, 107, 161, 0.12), transparent); border: 1px solid rgba(45, 107, 161, 0.22); color: var(--reader-accent)',
    ruleMarker: 'width: 120px; height: 2px; background: linear-gradient(90deg, transparent, var(--reader-accent), transparent)',
  },
  'nord-notes': {
    label: 'Nord',
    headingPrefix: 'nord',
    codeLabel: 'editor',
    tableLabel: 'frost rows',
    tagPrefix: 'note',
    imageLabel: 'frame',
    diagramLabel: 'graph',
    accentLine: '1px solid var(--reader-base-30)',
    documentBadge: 'color: var(--reader-color-cyan); background: var(--reader-base-10); border: 1px solid var(--reader-base-30); border-radius: 2px; letter-spacing: 0.12em; text-transform: uppercase',
    h1Prefix: 'padding: 0.1em 0.34em; margin-right: 0.48em; border-radius: 2px; background: var(--reader-base-20); color: var(--reader-color-cyan); font-size: 0.46em; text-transform: uppercase',
    h2Rule: 'width: 72px; height: 2px; background: var(--reader-color-cyan)',
    codePanel: 'background: var(--reader-base-10); border: 1px solid var(--reader-base-30); border-left: 6px solid var(--reader-color-cyan)',
    tableMarker: 'background: var(--reader-base-10); color: var(--reader-color-cyan); border: 1px solid var(--reader-base-30); border-radius: 2px',
    tagMarker: 'color: var(--reader-color-cyan)',
    mediaMarker: 'background: var(--reader-base-10); border: 1px solid var(--reader-base-30); color: var(--reader-color-cyan)',
    ruleMarker: 'width: 72px; height: 2px; background: var(--reader-color-cyan)',
  },
  'atom-one-reader': {
    label: 'Atom',
    headingPrefix: '//',
    codeLabel: 'module',
    tableLabel: 'debug table',
    tagPrefix: 'var',
    imageLabel: 'asset',
    diagramLabel: 'ast',
    accentLine: '1px solid var(--reader-code-border)',
    documentBadge: 'font-family: var(--reader-monospace-font); color: var(--reader-color-yellow); background: var(--reader-base-10); border: 1px solid var(--reader-base-30); border-radius: 6px',
    h1Prefix: 'margin-right: 0.45em; color: var(--reader-color-green); font-family: var(--reader-monospace-font); font-size: 0.68em',
    h2Rule: 'width: 88px; height: 1px; background: var(--reader-color-blue)',
    codePanel: 'background: var(--reader-base-10); border: 1px solid var(--reader-code-border); border-left: 3px solid var(--reader-color-blue)',
    tableMarker: 'font-family: var(--reader-monospace-font); background: var(--reader-base-10); color: var(--reader-color-yellow); border-bottom: 1px solid var(--reader-base-30)',
    tagMarker: 'font-family: var(--reader-monospace-font); color: var(--reader-color-yellow)',
    mediaMarker: 'font-family: var(--reader-monospace-font); background: var(--reader-base-10); border: 1px solid var(--reader-base-30); color: var(--reader-color-blue)',
    ruleMarker: 'width: 88px; height: 1px; background: var(--reader-color-green)',
  },
  'obsidianite-dark': {
    label: 'Obsidianite',
    headingPrefix: 'neon',
    codeLabel: 'glow',
    tableLabel: 'signal grid',
    tagPrefix: 'pulse',
    imageLabel: 'scan',
    diagramLabel: 'circuit',
    accentLine: '1px solid rgba(157, 140, 255, 0.28)',
    documentBadge: 'color: var(--reader-color-cyan); background: rgba(14, 210, 247, 0.12); border: 1px solid rgba(157, 140, 255, 0.38); border-radius: 10px; box-shadow: 0 0 18px rgba(14, 210, 247, 0.26); text-shadow: 0 0 12px rgba(14, 210, 247, 0.24)',
    h1Prefix: 'padding: 0.1em 0.34em; margin-right: 0.45em; border-radius: 10px; background: rgba(14, 210, 247, 0.12); color: var(--reader-color-cyan); font-size: 0.48em; box-shadow: 0 0 18px rgba(14, 210, 247, 0.26)',
    h2Rule: 'width: 96px; height: 2px; background: var(--reader-color-cyan); box-shadow: 0 0 18px rgba(14, 210, 247, 0.26)',
    codePanel: 'background: rgba(14, 210, 247, 0.08); border: 1px solid rgba(157, 140, 255, 0.28); box-shadow: 0 0 18px rgba(14, 210, 247, 0.26)',
    tableMarker: 'background: rgba(14, 210, 247, 0.12); color: var(--reader-color-cyan); border: 1px solid rgba(157, 140, 255, 0.28); box-shadow: 0 0 18px rgba(14, 210, 247, 0.16)',
    tagMarker: 'color: var(--reader-color-cyan); text-shadow: 0 0 12px rgba(14, 210, 247, 0.24)',
    mediaMarker: 'background: rgba(14, 210, 247, 0.12); border: 1px solid rgba(157, 140, 255, 0.28); color: var(--reader-color-cyan); box-shadow: 0 0 18px rgba(14, 210, 247, 0.26)',
    ruleMarker: 'width: 110px; height: 1px; background: var(--reader-color-cyan); box-shadow: 0 0 18px rgba(14, 210, 247, 0.26)',
  },
  'wasp-highlight': {
    label: 'Wasp',
    headingPrefix: '!',
    codeLabel: 'alert',
    tableLabel: 'warning grid',
    tagPrefix: 'warn',
    imageLabel: 'proof',
    diagramLabel: 'route',
    accentLine: '2px solid #f8c537',
    documentBadge: 'color: #f8c537; background: rgba(248, 197, 55, 0.08); border: 1px solid #f8c537; border-radius: 0; letter-spacing: 0.14em; text-transform: uppercase',
    h1Prefix: 'padding: 0 0.28em; margin-right: 0.42em; background: #f8c537; color: #111; font-size: 0.62em; border-radius: 0',
    h2Rule: 'width: 82px; height: 3px; background: #f8c537',
    codePanel: 'background: rgba(248, 197, 55, 0.08); border: 1px solid #7a5c14; border-left: 6px solid #f8c537',
    tableMarker: 'background: rgba(248, 197, 55, 0.08); color: #f8c537; border: 1px solid #f8c537; border-radius: 0; text-transform: uppercase',
    tagMarker: 'color: #f8c537',
    mediaMarker: 'background: rgba(248, 197, 55, 0.08); border: 1px solid #f8c537; border-radius: 0; color: #f8c537',
    ruleMarker: 'width: 88px; height: 3px; background: #f8c537',
  },
  'typewriter-desk': {
    label: 'Typewriter',
    headingPrefix: 'NOTE',
    codeLabel: 'typed',
    tableLabel: 'ledger',
    tagPrefix: 'stamp',
    imageLabel: 'photo',
    diagramLabel: 'sketch',
    accentLine: '1px solid var(--reader-border)',
    documentBadge: 'font-family: var(--reader-monospace-font); color: var(--reader-muted); background: var(--reader-callout-bg); border: 1px solid var(--reader-border); border-radius: 0; box-shadow: 3px 3px 0 var(--reader-border); text-transform: uppercase',
    h1Prefix: 'display: block; width: max-content; margin: 0 auto 0.34em; padding: 0.06em 0.38em; border: 1px solid var(--reader-border); color: var(--reader-muted); font-family: var(--reader-monospace-font); font-size: 0.48em',
    h2Rule: 'width: 72px; height: 1px; background: var(--reader-border)',
    codePanel: 'background: var(--reader-code-bg); border: 1px solid var(--reader-border); box-shadow: 3px 3px 0 var(--reader-border)',
    tableMarker: 'font-family: var(--reader-monospace-font); background: var(--reader-callout-bg); color: var(--reader-muted); border: 1px solid var(--reader-border); border-radius: 0; text-transform: uppercase',
    tagMarker: 'font-family: var(--reader-monospace-font); color: var(--reader-muted)',
    mediaMarker: 'font-family: var(--reader-monospace-font); background: var(--reader-callout-bg); border: 1px solid var(--reader-border); border-radius: 0; color: var(--reader-muted)',
    ruleMarker: 'width: 72px; height: 1px; background: var(--reader-border)',
  },
  'its-readable': {
    label: 'ITS',
    headingPrefix: 'read',
    codeLabel: 'example',
    tableLabel: 'readable data',
    tagPrefix: 'index',
    imageLabel: 'figure',
    diagramLabel: 'system',
    accentLine: '1px solid var(--reader-callout-border)',
    documentBadge: 'color: var(--reader-accent); background: var(--reader-accent-muted); border: 1px solid var(--reader-callout-border); border-radius: 999px',
    h1Prefix: 'width: 0.32em; height: 1.05em; margin-right: 0.45em; border-radius: 999px; background: var(--reader-accent); vertical-align: -0.12em',
    h2Rule: 'width: 68px; height: 4px; border-radius: 999px; background: var(--reader-accent)',
    codePanel: 'background: var(--reader-code-bg); border-left: 5px solid var(--reader-accent); box-shadow: 0 1px 0 var(--reader-border)',
    tableMarker: 'background: var(--reader-accent-muted); color: var(--reader-accent); border-radius: 999px',
    tagMarker: 'color: var(--reader-accent)',
    mediaMarker: 'background: var(--reader-accent-muted); border: 1px solid var(--reader-callout-border); color: var(--reader-accent)',
    ruleMarker: 'width: 74px; height: 4px; border-radius: 999px; background: var(--reader-accent)',
  },
};

const SOURCE_DETAIL_RULES = {
  'minimal-focus': [
    ['.markdown-preview-intro > .markdown-heading--h1', 'padding-bottom: 0.35em; border-bottom: 1px solid var(--reader-border)'],
    ['.markdown-preview-intro > .markdown-heading--h2', 'margin-top: 0.65em; font-size: 0.92em; color: var(--reader-muted)'],
    ['.markdown-preview-intro .markdown-paragraph', 'line-height: 1.78; color: var(--reader-text)'],
    ['.markdown-preview-intro .markdown-tag[data-tag="theme"]', 'background: transparent; border: 1px solid var(--reader-border); color: var(--reader-muted)'],
    ['.markdown-preview-tasks .markdown-task', 'padding: 0.08em 0; background: transparent'],
    ['.markdown-preview-tasks .markdown-task-checkbox', 'box-shadow: none; background: var(--reader-surface)'],
    ['.markdown-preview-quote.callout-tip', 'border-left-width: 2px; background: transparent'],
    ['.markdown-preview-table .markdown-table-cell', 'border-left: 0; border-right: 0'],
    ['.theme-preview__document .markdown-table-caption', 'color: var(--reader-muted); text-align: left'],
    ['.theme-preview__document .markdown-code-block', 'border: 1px solid var(--reader-border); background: var(--reader-surface)'],
    ['.document-reader .markdown-heading--h2 + .markdown-paragraph', 'margin-top: 0.2em'],
    ['.document-reader .markdown-rule + .markdown-heading', 'margin-top: 1em'],
    ['.outline-panel__scroll .is-active', 'background: transparent; color: var(--reader-text)'],
    ['.markdown-list-item > .markdown-tag[data-tag="theme"]', 'font-size: 0.92em'],
  ],
  'things-flow': [
    ['.markdown-preview-tasks > .markdown-heading--h3', 'display: inline-flex; align-items: center; padding: 0.12em 0.5em; border-radius: 999px; background: var(--reader-accent-muted)'],
    ['.markdown-preview-tasks .markdown-task--checked', 'background: color-mix(in srgb, var(--reader-color-green) 12%, transparent); color: var(--reader-muted)'],
    ['.markdown-list--unordered > .markdown-task', 'display: flex; align-items: center; gap: 0.55em'],
    ['.markdown-task--open .markdown-task-checkbox', 'border-color: var(--reader-accent); background: var(--reader-surface)'],
    ['.markdown-preview-tasks .markdown-task:not(.markdown-task--checked)', 'background: color-mix(in srgb, var(--reader-accent) 8%, transparent)'],
    ['.markdown-preview-tasks .markdown-task-checkbox:checked', 'box-shadow: 0 0 0 3px var(--reader-accent-muted)'],
    ['.markdown-preview-tasks .markdown-list-item::marker', 'color: var(--reader-accent)'],
    ['.markdown-tag[data-tag="todo"]', 'background: var(--reader-accent-muted); color: var(--reader-accent)'],
    ['.callout-success .callout-title', 'display: inline-flex; padding: 0.1em 0.5em; border-radius: 999px; background: color-mix(in srgb, var(--reader-color-green) 16%, transparent)'],
    ['.callout-todo', 'border: 0; background: color-mix(in srgb, var(--reader-accent) 10%, var(--reader-callout-bg))'],
    ['.markdown-table-row:hover > .markdown-table-cell', 'background: color-mix(in srgb, var(--reader-accent) 9%, var(--reader-table-row-hover))'],
    ['.theme-preview__document .markdown-task + .markdown-task', 'margin-top: 0.42em'],
    ['.markdown-preview-table .markdown-table-row:nth-child(even)', 'box-shadow: inset 4px 0 0 var(--reader-accent-muted)'],
    ['.markdown-preview-table .markdown-table-cell:last-child', 'font-weight: 720; color: var(--reader-accent)'],
    ['.markdown-preview-tasks .markdown-task--checked + .markdown-task', 'border-top: 1px solid color-mix(in srgb, var(--reader-accent) 18%, transparent)'],
    ['.markdown-preview-tasks .markdown-task:first-of-type', 'border-top-left-radius: 12px; border-top-right-radius: 12px'],
    ['.markdown-preview-tasks .markdown-task:last-of-type', 'border-bottom-left-radius: 12px; border-bottom-right-radius: 12px'],
  ],
  'pastel-puccin': [
    ['.markdown-preview-code .markdown-code-block', 'border: 1px solid rgba(199, 165, 255, 0.32); background: color-mix(in srgb, var(--reader-color-purple) 10%, var(--reader-code-bg))'],
    ['.markdown-preview-code .token.keyword', 'color: var(--reader-color-pink); font-weight: 760'],
    ['.markdown-preview-code .token.string', 'color: var(--reader-color-green)'],
    ['.markdown-preview-code .token.function', 'color: var(--reader-color-cyan)'],
    ['.markdown-preview-code .token.comment', 'color: color-mix(in srgb, var(--reader-color-purple) 68%, var(--reader-muted)); font-style: italic'],
    ['.markdown-tag[data-tag="theme"] + .markdown-tag', 'margin-left: 0.3em; background: color-mix(in srgb, var(--reader-color-pink) 16%, transparent)'],
    ['.markdown-table-row:nth-child(even) > .markdown-table-cell', 'background: color-mix(in srgb, var(--reader-color-purple) 9%, var(--reader-table-stripe))'],
    ['.markdown-table-body .markdown-table-row:nth-child(odd) > .markdown-table-cell', 'background: color-mix(in srgb, var(--reader-color-pink) 5%, transparent)'],
    ['.callout-tip .callout-content', 'background: color-mix(in srgb, var(--reader-color-cyan) 7%, transparent); border-radius: var(--reader-callout-radius)'],
    ['.theme-preview__document mark', 'background: color-mix(in srgb, var(--reader-color-yellow) 42%, transparent); color: var(--reader-text)'],
    ['.markdown-preview-intro .markdown-code--inline', 'background: color-mix(in srgb, var(--reader-color-purple) 14%, transparent); color: var(--reader-color-pink)'],
    ['.theme-preview__document > div .markdown-heading--h1::before', 'box-shadow: 0 0 0 4px color-mix(in srgb, var(--reader-color-pink) 18%, transparent)'],
    ['.markdown-preview-intro mark', 'border-radius: 999px; padding: 0 0.34em'],
    ['.markdown-preview-table .markdown-table-caption', 'color: var(--reader-color-pink); font-weight: 760'],
  ],
  'topaz-blue': [
    ['.markdown-preview-table-wrap > .markdown-heading--h3', 'text-align: center; padding-bottom: 0.24em; border-bottom: 2px solid var(--reader-accent-muted)'],
    ['.markdown-preview-table .markdown-table-head', 'background: linear-gradient(90deg, var(--reader-accent-muted), transparent)'],
    ['.markdown-preview-table .markdown-table-cell--head:first-child', 'border-top-left-radius: var(--reader-radius)'],
    ['.callout-tip .callout-title', 'justify-content: center; border-bottom: 1px solid var(--reader-accent-muted)'],
    ['.markdown-heading--h1 + .markdown-heading--h2', 'text-align: center; color: var(--reader-accent)'],
    ['.markdown-preview-table .markdown-table-row:hover', 'box-shadow: inset 0 0 0 2px var(--reader-accent-muted)'],
    ['.markdown-preview-table .markdown-table-cell:last-child', 'color: var(--reader-accent); font-weight: 720'],
    ['.markdown-table-body .markdown-table-row:hover > .markdown-table-cell', 'background: color-mix(in srgb, var(--reader-accent) 10%, var(--reader-table-row-hover))'],
    ['.callout-tip[data-callout="tip"]', 'border-top: 1px solid color-mix(in srgb, var(--reader-accent) 28%, transparent)'],
    ['.callout-warning[data-callout="warning"]', 'border-inline: 1px solid color-mix(in srgb, var(--reader-color-yellow) 30%, transparent)'],
    ['.theme-preview__document .markdown-heading--h1::after', 'content: ""; display: block; width: 6em; height: 2px; margin: 0.35em auto 0; background: linear-gradient(90deg, transparent, var(--reader-accent), transparent)'],
    ['.markdown-preview-intro .markdown-link--external', 'text-decoration-style: double; text-underline-offset: 0.22em'],
    ['.markdown-preview-table-wrap .markdown-table', 'border: 1px solid color-mix(in srgb, var(--reader-accent) 28%, var(--reader-border))'],
    ['.markdown-table-cell--head + .markdown-table-cell--head', 'border-left: 1px solid color-mix(in srgb, var(--reader-accent) 18%, transparent)'],
  ],
  'nord-notes': [
    ['.markdown-code-block .line:hover', 'background: color-mix(in srgb, var(--reader-color-cyan) 9%, transparent)'],
    ['.markdown-code-block code.language-js', 'color: var(--reader-base-100)'],
    ['.markdown-table-cell--head:first-child', 'color: var(--reader-color-cyan)'],
    ['.outline-panel button.is-active', 'border-left: 3px solid var(--reader-color-cyan); background: color-mix(in srgb, var(--reader-color-cyan) 8%, transparent)'],
    ['.markdown-preview-code pre.markdown-code-block', 'border-radius: 2px; border-left-color: var(--reader-color-cyan)'],
    ['.markdown-preview-code code.language-js', 'letter-spacing: 0.01em'],
    ['.markdown-preview-table .markdown-table-row:nth-child(odd)', 'background: color-mix(in srgb, var(--reader-base-20) 60%, transparent)'],
    ['.markdown-preview-table .markdown-table-row:nth-child(even)', 'background: color-mix(in srgb, var(--reader-base-30) 45%, transparent)'],
    ['.markdown-table-cell:first-child.markdown-table-cell', 'font-variant-numeric: tabular-nums'],
    ['.markdown-heading--h3 + .markdown-code-block', 'margin-top: 0.45em'],
    ['.markdown-heading--h2 ~ .markdown-paragraph', 'color: color-mix(in srgb, var(--reader-text) 86%, var(--reader-color-cyan))'],
    ['.markdown-tag[data-tag="status"] + .markdown-tag[data-tag="done"]', 'border-color: var(--reader-color-cyan)'],
    ['.markdown-preview-tasks .markdown-list--unordered', 'border-left: 1px solid var(--reader-base-30); padding-left: 1.25em'],
    ['.callout-tip .callout-content > .markdown-paragraph', 'font-variant-numeric: tabular-nums'],
    ['.markdown-preview-code + .markdown-preview-tasks', 'border-top: 1px solid var(--reader-base-30); padding-top: 0.8em'],
    ['.markdown-preview-table .markdown-table-cell:first-child', 'color: var(--reader-color-cyan)'],
    ['.markdown-preview-table .markdown-table-cell:nth-child(2)', 'font-family: var(--reader-monospace-font)'],
  ],
  'atom-one-reader': [
    ['.markdown-preview-code > .markdown-heading--h3', 'font-family: var(--reader-monospace-font); color: var(--reader-color-blue)'],
    ['.markdown-code-block .token.keyword', 'font-weight: 760; color: var(--reader-color-purple)'],
    ['.markdown-code-block .token.string', 'color: var(--reader-color-green)'],
    ['.markdown-inline-code.markdown-code--inline', 'border: 1px solid var(--reader-code-border); background: color-mix(in srgb, var(--reader-code-bg) 86%, var(--reader-base-00))'],
    ['.theme-preview__document pre.markdown-code-block', 'border-left: 4px solid var(--reader-color-blue)'],
    ['.theme-preview__document code.markdown-code--inline', 'font-weight: 650'],
    ['.markdown-preview-code pre.markdown-code-block > code', 'display: block; color: var(--reader-code-text)'],
    ['.markdown-preview-code .markdown-code--block', 'tab-size: 2'],
    ['.markdown-preview-code .language-js', 'font-feature-settings: "liga" 0'],
    ['.markdown-paragraph > code.markdown-code', 'vertical-align: 0.04em'],
    ['.markdown-code-block .line:nth-child(odd)', 'background: rgba(255, 255, 255, 0.015)'],
    ['.markdown-code-block .line:nth-child(even)', 'background: rgba(0, 0, 0, 0.035)'],
    ['.markdown-code-block .token.punctuation + .token.keyword', 'margin-left: 0.12em'],
    ['.callout-tip code.markdown-code', 'color: var(--reader-color-yellow)'],
  ],
  'obsidianite-dark': [
    ['.markdown-link--external', 'text-shadow: 0 0 10px color-mix(in srgb, var(--reader-color-cyan) 22%, transparent)'],
    ['.markdown-link--external:hover', 'filter: brightness(1.25) saturate(1.25)'],
    ['.markdown-link--external:focus-visible', 'outline: 1px solid var(--reader-color-cyan); outline-offset: 3px'],
    ['.callout-tip::before', 'content: ""; display: block; height: 2px; background: linear-gradient(90deg, var(--reader-color-cyan), transparent)'],
    ['.callout-tip::after', 'content: ""; display: block; height: 1px; background: linear-gradient(90deg, transparent, var(--reader-color-purple))'],
    ['.markdown-code-block::after', 'content: ""; position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 18px rgba(14, 210, 247, 0.12)'],
    ['.markdown-code-block:hover::after', 'box-shadow: inset 0 0 24px rgba(14, 210, 247, 0.18)'],
    ['.markdown-tag[data-tag="theme"]::after', 'content: ""; display: inline-block; width: 0.42em; height: 0.42em; margin-left: 0.3em; border-radius: 999px; background: var(--reader-color-cyan)'],
    ['.markdown-tag[data-tag="theme"]:hover::after', 'box-shadow: 0 0 12px var(--reader-color-cyan)'],
    ['.markdown-heading--h2::before', 'content: ""; display: inline-block; width: 0.5em; height: 0.5em; margin-right: 0.42em; background: var(--reader-color-cyan); box-shadow: 0 0 12px var(--reader-color-cyan)'],
    ['.markdown-heading--h3::before', 'content: ""; display: inline-block; width: 0.42em; height: 0.42em; margin-right: 0.36em; border: 1px solid var(--reader-color-purple)'],
    ['.markdown-preview-quote::before', 'box-shadow: 0 0 18px rgba(14, 210, 247, 0.22)'],
    ['.markdown-preview-table::after', 'content: ""; display: table-caption; caption-side: bottom; height: 2px; background: linear-gradient(90deg, transparent, var(--reader-color-cyan), transparent)'],
    ['.mermaid::after', 'content: ""; position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 24px rgba(14, 210, 247, 0.12)'],
    ['.theme-preview-shell .markdown-link--external', 'color: var(--reader-color-cyan)'],
    ['.markdown-preview-document .callout-tip::before', 'opacity: 0.88'],
    ['.markdown-preview-document .markdown-tag[data-tag="theme"]::after', 'vertical-align: 0.04em'],
  ],
  'wasp-highlight': [
    ['.markdown-heading--h1::after', 'content: ""; display: block; height: 3px; margin-top: 0.25em; background: #f8c537'],
    ['.markdown-heading--h2::before', 'content: ""; display: inline-block; width: 0.75em; height: 0.75em; margin-right: 0.4em; background: #f8c537'],
    ['.markdown-task-checkbox:not(:checked)', 'background: #101010; border-color: #f8c537'],
    ['.markdown-tag[data-tag="status"]', 'border-color: #f8c537; color: #f8c537; background: rgba(248, 197, 55, 0.08)'],
    ['.markdown-tag[data-tag="status"]::before', 'content: ""; display: inline-block; width: 0.55em; height: 0.55em; margin-right: 0.3em; background: currentColor'],
    ['.markdown-table-row:nth-child(odd) > .markdown-table-cell:first-child', 'border-left: 4px solid #f8c537'],
    ['.markdown-preview-table .markdown-table-row:nth-child(odd) > .markdown-table-cell', 'background: rgba(248, 197, 55, 0.05)'],
    ['.markdown-code-block .token.operator::selection', 'background: #f8c537; color: #111111'],
    ['.callout-warning::before', 'content: ""; display: block; height: 3px; background: #f8c537'],
    ['.callout-danger', 'border-color: #fb4934; background: rgba(251, 73, 52, 0.1)'],
    ['.callout-bug', 'border-color: #fb4934; box-shadow: 0 0 0 2px rgba(251, 73, 52, 0.12)'],
    ['.markdown-rule::before', 'content: ""; position: absolute; left: 0; top: -0.2em; width: 2.5em; height: 3px; background: #f8c537'],
    ['.theme-preview-header .theme-preview-badge', 'border-radius: 0; border: 1px solid #f8c537'],
    ['.markdown-list--unordered .markdown-list-item::marker', 'color: #f8c537'],
    ['.markdown-preview-document .markdown-heading--h1::after', 'box-shadow: 0 0 0 1px rgba(248, 197, 55, 0.24)'],
    ['.markdown-preview-document .markdown-heading--h2::before', 'box-shadow: 0 0 0 2px rgba(248, 197, 55, 0.16)'],
    ['.markdown-preview-table .markdown-table-cell:first-child', 'text-transform: uppercase; letter-spacing: 0.05em'],
    ['.markdown-preview-document .markdown-tag[data-tag="status"]', 'border-style: dashed'],
  ],
  'typewriter-desk': [
    ['.markdown-paragraph + .markdown-paragraph', 'text-indent: 1.4em'],
    ['.markdown-code-block::after', 'content: ""; position: absolute; inset-inline: 0; bottom: 0; height: 1px; background: repeating-linear-gradient(90deg, var(--reader-border) 0 6px, transparent 6px 12px)'],
    ['.markdown-table-caption::before', 'content: ""; display: inline-block; width: 1.6em; height: 1px; margin-right: 0.45em; background: currentColor; vertical-align: middle'],
    ['.markdown-preview-document::after', 'content: ""; display: block; height: 1px; margin-top: 1em; background: repeating-linear-gradient(90deg, var(--reader-border) 0 8px, transparent 8px 16px)'],
    ['.markdown-preview-document .markdown-heading--h1::after', 'content: ""; display: block; width: 7em; height: 1px; margin: 0.45em auto 0; background: var(--reader-border)'],
    ['.markdown-heading--h2::first-letter', 'color: var(--reader-accent)'],
    ['.markdown-heading--h3::first-letter', 'color: var(--reader-accent)'],
    ['.markdown-task::before', 'content: ""; display: inline-block; width: 0.7em; height: 1px; margin-right: 0.35em; background: var(--reader-border); vertical-align: middle'],
    ['.markdown-task--checked::before', 'background: var(--reader-accent)'],
    ['.markdown-list--ordered .markdown-list-item', 'font-variant-numeric: oldstyle-nums'],
    ['.markdown-quote .markdown-paragraph', 'font-style: italic'],
    ['.theme-preview__document pre::before', 'content: ""; position: absolute; left: 0.75em; top: 0.75em; width: 0.45em; height: 0.45em; border-radius: 999px; background: var(--reader-border)'],
    ['.markdown-table-cell:first-child::before', 'content: ""; display: inline-block; width: 0.7em; height: 1px; margin-right: 0.35em; background: var(--reader-border); vertical-align: middle'],
    ['.markdown-inline-code::after', 'content: ""; display: inline-block; width: 0.35em; height: 1px; margin-left: 0.12em; background: currentColor; vertical-align: middle'],
  ],
  'its-readable': [
    ['.theme-preview__callouts', 'display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.65em'],
    ['.callout[data-callout="info"]', 'border-left-color: var(--reader-color-blue); background: color-mix(in srgb, var(--reader-color-blue) 8%, var(--reader-callout-bg))'],
    ['.callout[data-callout="warning"]', 'border-left-color: var(--reader-color-yellow); background: color-mix(in srgb, var(--reader-color-yellow) 10%, var(--reader-callout-bg))'],
    ['.markdown-tag[data-tag="done"]', 'background: color-mix(in srgb, var(--reader-color-green) 14%, transparent); color: var(--reader-color-green)'],
    ['.callout[data-callout="success"]', 'border-left-color: var(--reader-color-green); background: color-mix(in srgb, var(--reader-color-green) 9%, var(--reader-callout-bg))'],
    ['.callout[data-callout="info"] .callout-title', 'color: var(--reader-color-blue)'],
    ['.callout[data-callout="warning"] .callout-title', 'color: var(--reader-color-yellow)'],
    ['.callout[data-callout="success"] .callout-title', 'color: var(--reader-color-green)'],
    ['.theme-preview__callouts .callout + .callout', 'margin-top: 0'],
    ['.markdown-tag[data-tag="done"]::before', 'content: ""; display: inline-block; width: 0.5em; height: 0.5em; margin-right: 0.3em; border-radius: 999px; background: currentColor'],
    ['.markdown-tag[data-tag="status"]::after', 'content: ""; display: inline-block; width: 0.45em; height: 0.45em; margin-left: 0.3em; border-radius: 999px; background: var(--reader-accent)'],
    ['.theme-preview__document .markdown-image-caption', 'display: block; padding: 0.35em 0.5em; background: var(--reader-base-10)'],
    ['.theme-preview__document .markdown-preview-table-wrap', 'border: 1px solid var(--reader-border); border-radius: var(--reader-radius); padding: 0.75em'],
    ['.markdown-table-body .markdown-table-row:last-child .markdown-table-cell', 'border-bottom-width: 0'],
    ['.markdown-table-cell--head:last-child', 'text-align: right'],
    ['.callout-content .markdown-list', 'margin-top: 0.35em'],
    ['.theme-preview__document .callout[data-callout="info"]', 'box-shadow: inset 3px 0 0 var(--reader-color-blue)'],
    ['.theme-preview__document .callout[data-callout="warning"]', 'box-shadow: inset 3px 0 0 var(--reader-color-yellow)'],
    ['.theme-preview__document .callout[data-callout="success"]', 'box-shadow: inset 3px 0 0 var(--reader-color-green)'],
  ],
};

const CALLOUT_TYPES = [
  'note',
  'abstract',
  'info',
  'todo',
  'tip',
  'success',
  'question',
  'warning',
  'failure',
  'danger',
  'bug',
  'example',
  'quote',
];

const STATE_VARIANTS = [
  ['base', ''],
  ['hover', ':hover'],
  ['focus', ':focus-within'],
  ['first', ':first-child'],
  ['last', ':last-child'],
  ['active', '.is-active'],
];

const CONTENT_BLOCKS = [
  '.markdown-paragraph',
  '.markdown-link',
  '.markdown-link--external',
  '.markdown-quote',
  '.markdown-list',
  '.markdown-list-item',
  '.markdown-task',
  '.markdown-task--checked',
  '.markdown-tag',
  '.markdown-image',
  '.markdown-image img',
  '.markdown-image-caption',
  '.markdown-footnote',
  '.markdown-math',
  '.markdown-mark',
  '.markdown-strong',
  '.markdown-emphasis',
  '.markdown-rule',
];

const TABLE_BLOCKS = [
  '.markdown-table',
  '.markdown-table-head',
  '.markdown-table-body',
  '.markdown-table-row',
  '.markdown-table-row:nth-child(odd)',
  '.markdown-table-row:nth-child(even)',
  '.markdown-table-row:hover',
  '.markdown-table-cell',
  '.markdown-table-cell--head',
  '.markdown-table-cell:first-child',
  '.markdown-table-cell:last-child',
  '.markdown-table-body .markdown-table-cell',
  '.markdown-table-body .markdown-table-row:hover .markdown-table-cell',
  '.markdown-table-caption',
  '.markdown-preview-table',
  '.table-fullscreen',
  '.table-fullscreen__body',
  '.table-fullscreen__title',
  '.table-fullscreen__row-count',
  '.table-fullscreen__trigger',
];

const CODE_BLOCKS = [
  '.markdown-code',
  '.markdown-code--inline',
  '.markdown-inline-code',
  '.markdown-code-block',
  '.markdown-code--block',
  '.markdown-code-block code',
  '.markdown-code-block .token.keyword',
  '.markdown-code-block .token.string',
  '.markdown-code-block .token.function',
  '.markdown-code-block .token.comment',
  '.markdown-code-block .token.number',
  '.markdown-code-block .token.operator',
  '.markdown-code-block .token.punctuation',
  '.markdown-code-block .line',
  '.markdown-code-block .line:hover',
  'kbd',
  'samp',
  'var',
];

const MEDIA_BLOCKS = [
  '.mermaid',
  '.mermaid svg',
  '.mermaid-fullscreen',
  '.mermaid-fullscreen__body',
  '.mermaid-fullscreen__actions',
  '.mermaid-fullscreen__scale',
  '.markdown-preview-document',
  '.markdown-preview-intro',
  '.markdown-preview-code',
  '.markdown-preview-tasks',
  '.markdown-preview-quote',
  '.markdown-preview-table-wrap',
  '.document-reader',
  '.document-reader > div',
  '.reader-layout',
  '.outline-panel',
  '.outline-panel__scroll',
  '.outline-panel button',
  '.outline-panel button.is-active',
  '.theme-preview-card',
  '.theme-preview-shell',
  '.theme-preview-header',
  '.theme-preview-badge',
  '.theme-preview-swatches span',
];

export function buildObsidianThemeCss(themeId) {
  const profile = THEME_PROFILES[themeId];
  if (!profile) {
    throw new Error(`Unknown Obsidian theme profile: ${themeId}`);
  }

  const rules = [
    ...buildRootRules(themeId, profile),
    ...buildSignatureRules(themeId, profile),
    ...buildHeadingRules(profile),
    ...buildContentRules(profile),
    ...buildCalloutRules(profile),
    ...buildTableRules(profile),
    ...buildCodeRules(profile),
    ...buildTaskAndTagRules(profile),
    ...buildMediaRules(profile),
    ...buildSourceDetailRules(themeId),
  ];

  return rules.join('\n');
}

export async function writeObsidianThemeCssPackages({ rootDir = process.cwd() } = {}) {
  for (const themeId of OBSIDIAN_THEME_IDS) {
    const packagePath = resolve(rootDir, 'themes', 'packages', `${themeId}.mdv-theme.json`);
    const theme = JSON.parse(await readFile(packagePath, 'utf8'));
    theme.css = buildObsidianThemeCss(themeId);
    await writeFile(packagePath, `${JSON.stringify(theme, null, 2)}\n`);
  }
}

function buildRootRules(themeId, profile) {
  const colors = { ...DEFAULT_COLOR_SET, ...profile.colors };
  return [
    rule(':root', [
      `--reader-theme-origin: ${profile.origin}`,
      `--reader-theme-signature: ${themeId}`,
      `--reader-theme-shape: ${profile.shape}`,
      `--reader-theme-density: ${profile.density}`,
      `--reader-color-pink: ${colors.pink}`,
      `--reader-color-green: ${colors.green}`,
      `--reader-color-yellow: ${colors.yellow}`,
      `--reader-color-red: ${colors.red}`,
      `--reader-color-cyan: ${colors.cyan}`,
      `--reader-color-orange: ${colors.orange}`,
      `--reader-theme-shadow: ${profile.shadow}`,
      `--reader-theme-strong-shadow: ${profile.strongShadow}`,
      `--reader-theme-glow-effect: ${profile.glow}`,
    ]),
  ];
}

function buildSignatureRules(themeId, profile) {
  return [
    ...profile.signatureRules.map(([selector, declarations]) => rule(selector, declarations)),
    ...buildVisibleSignatureRules(themeId, profile),
  ];
}

function buildVisibleSignatureRules(themeId, profile) {
  const signature = VISIBLE_SIGNATURES[themeId];
  if (!signature) {
    throw new Error(`Unknown visible signature profile: ${themeId}`);
  }

  return [
    rule('.theme-preview__document', [
      'position: relative',
      `border: ${signature.accentLine}`,
      `box-shadow: ${profile.shadow}`,
      `padding: ${profile.density === 'compact' ? '16px' : profile.density === 'longform' ? '28px 32px' : '22px'}`,
    ]),
    rule('.theme-preview__document::before', [
      'content: ""',
      'position: absolute',
      'top: 10px',
      'right: 12px',
      'z-index: 1',
      'display: block',
      'width: 2.8em',
      'height: 0.36em',
      'padding: 0',
      signature.documentBadge,
    ]),
    rule('.markdown-heading--h1', 'position: relative'),
    rule('.markdown-heading--h1::before', [
      'content: ""',
      'display: inline-block',
      'width: 0.72em',
      'height: 0.72em',
      'border-radius: 999px',
      'background: var(--reader-accent)',
      'vertical-align: 0.02em',
      signature.h1Prefix,
    ]),
    rule('.markdown-heading--h2', 'position: relative'),
    rule('.markdown-heading--h2::after', [
      'content: ""',
      'display: block',
      'margin-top: 0.34em',
      signature.h2Rule,
    ]),
    rule('.callout-info', `outline: ${profile.borderWidth === '0' ? '1px' : profile.borderWidth} solid color-mix(in srgb, var(--reader-color-cyan) 24%, transparent)`),
    rule('.callout-warning', `outline: ${profile.borderWidth === '0' ? '1px' : profile.borderWidth} solid color-mix(in srgb, var(--reader-color-yellow) 28%, transparent)`),
    rule('.callout-success', `outline: ${profile.borderWidth === '0' ? '1px' : profile.borderWidth} solid color-mix(in srgb, var(--reader-color-green) 26%, transparent)`),
    rule('.markdown-code-block', [
      'position: relative',
      'counter-reset: line',
      'padding-top: 2.35em',
      signature.codePanel,
    ]),
    rule('.markdown-code-block::before', [
      'content: ""',
      'position: absolute',
      'top: 0.82em',
      'right: 0.86em',
      'width: 3.2em',
      'height: 0.34em',
      'border-radius: 999px',
      'background: var(--reader-accent)',
      'opacity: 0.68',
    ]),
    rule('.markdown-code-block .line', [
      'display: block',
      'position: relative',
      'padding-left: 2.2em',
      'counter-increment: line',
    ]),
    rule('.markdown-code-block .line::before', [
      'content: counter(line)',
      'position: absolute',
      'left: 0',
      'width: 1.4em',
      'color: var(--reader-muted)',
      'text-align: right',
      'opacity: 0.68',
    ]),
    rule('.markdown-table', 'position: relative'),
    rule('.markdown-table::before', [
      'content: ""',
      'display: table-caption',
      'caption-side: top',
      'width: 3.2em',
      'height: 0.34em',
      'max-width: 100%',
      'margin: 0 0 0.45em',
      signature.tableMarker,
    ]),
    rule('.markdown-table-row:nth-child(even) .markdown-table-cell', `background: color-mix(in srgb, var(--reader-table-stripe) 86%, var(--reader-accent-muted))`),
    rule('.markdown-task-checkbox:checked::after', [
      'content: ""',
      'display: block',
      'width: 0.38em',
      'height: 0.62em',
      'margin: 0.05em auto',
      'border-right: 2px solid var(--reader-checkbox-check-color)',
      'border-bottom: 2px solid var(--reader-checkbox-check-color)',
      'transform: rotate(45deg)',
    ]),
    rule('.markdown-tag[data-tag="theme"]', 'position: relative'),
    rule('.markdown-tag[data-tag="theme"]::before', [
      'content: ""',
      'display: inline-block',
      'width: 0.5em',
      'height: 0.5em',
      'margin-right: 0.28em',
      'border-radius: 999px',
      'background: currentColor',
      signature.tagMarker,
    ]),
    rule('.markdown-image', [
      'position: relative',
      'overflow: hidden',
      signature.mediaMarker,
    ]),
    rule('.markdown-image::before', [
      'content: ""',
      'position: absolute',
      'top: 0.48em',
      'left: 0.58em',
      'width: 2.4em',
      'height: 0.34em',
      'border-radius: 999px',
      signature.mediaMarker,
    ]),
    rule('.mermaid', [
      'position: relative',
      'overflow: hidden',
      signature.mediaMarker,
    ]),
    rule('.mermaid::before', [
      'content: ""',
      'position: absolute',
      'top: 0.48em',
      'right: 0.58em',
      'width: 2.4em',
      'height: 0.34em',
      'border-radius: 999px',
      signature.mediaMarker,
    ]),
    rule('.markdown-rule', 'position: relative; overflow: visible'),
    rule('.markdown-rule::after', [
      'content: ""',
      'position: absolute',
      'left: 0',
      'top: 50%',
      'transform: translateY(-50%)',
      signature.ruleMarker,
    ]),
  ];
}

function buildHeadingRules(profile) {
  const rules = [];
  for (let level = 1; level <= 6; level += 1) {
    const selector = `.markdown-heading--h${level}`;
    const scale = (1 + (7 - level) * 0.045).toFixed(3);
    const color = headingColor(profile, level);
    rules.push(rule(selector, `margin-top: calc(${profile.headingSpacing} * ${scale})`));
    rules.push(rule(selector, `text-align: ${profile.headingAlign}`));
    rules.push(rule(selector, `text-transform: ${profile.headingTransform}`));
    rules.push(rule(selector, `font-weight: ${Math.max(520, Number(profile.headingWeight) - level * 20)}`));
    rules.push(rule(selector, `color: ${color}`));
    rules.push(rule(selector, `border-color: ${level <= 2 ? 'var(--reader-heading-border)' : 'transparent'}`));
    rules.push(rule(`${selector} .markdown-link`, 'color: inherit; text-decoration: none'));
    rules.push(rule(`${selector} code`, 'font-size: 0.82em; vertical-align: 0.04em'));
    rules.push(rule(`${selector}::after`, `box-shadow: ${profile.glow}`));
  }
  rules.push(rule('.markdown-heading + .markdown-paragraph', 'margin-top: 0'));
  rules.push(rule('.markdown-heading + .markdown-list', 'margin-top: 0.2em'));
  rules.push(rule('.markdown-heading + .markdown-code-block', 'margin-top: 0.65em'));
  rules.push(rule('.markdown-heading + .callout', 'margin-top: 0.75em'));
  return rules;
}

function buildContentRules(profile) {
  const rules = [];
  for (const selector of CONTENT_BLOCKS) {
    const maxWidth = maxWidthFor(selector);
    rules.push(rule(selector, `border-radius: ${radiusFor(profile, selector)}`));
    if (maxWidth !== 'none') {
      rules.push(rule(selector, `max-width: ${maxWidth}`));
    }
    rules.push(rule(selector, `box-shadow: ${shadowFor(profile, selector)}`));
    rules.push(rule(selector, `text-transform: ${textTransformFor(profile, selector)}`));
  }
  for (const [, suffix] of STATE_VARIANTS) {
    rules.push(rule(`.markdown-link${suffix}`, `text-decoration-thickness: ${profile.shape === 'warning-contrast' ? '2px' : '1px'}`));
    rules.push(rule(`.markdown-tag${suffix}`, `outline: ${profile.borderWidth} solid transparent`));
    rules.push(rule(`.markdown-quote${suffix}`, `border-left-width: ${profile.accentWidth}`));
    rules.push(rule(`.markdown-image${suffix}`, `padding: ${profile.density === 'compact' ? '0.25em' : '0.45em'}`));
  }
  rules.push(rule('.markdown-paragraph', `text-indent: ${profile.paragraphIndent}`));
  rules.push(rule('.markdown-link:hover', 'filter: saturate(1.18)'));
  rules.push(rule('.markdown-rule, hr', `height: ${profile.shape === 'warning-contrast' ? '2px' : '1px'}`));
  return rules;
}

function buildCalloutRules(profile) {
  const rules = [];
  CALLOUT_TYPES.forEach((type, index) => {
    const color = calloutColor(type, index);
    const selector = `.callout-${type}, .callout[data-callout="${type}"]`;
    rules.push(rule(selector, `border-left-color: ${color}`));
    rules.push(rule(selector, `border-radius: ${profile.calloutMode === 'warning' ? '0' : profile.softRadius}`));
    rules.push(rule(selector, `box-shadow: ${calloutShadow(profile, color)}`));
    rules.push(rule(selector, `background: ${calloutBackground(profile, color)}`));
    rules.push(rule(`${selector} .callout-title`, `color: ${color}`));
    rules.push(rule(`${selector} .callout-title`, `text-transform: ${profile.headingTransform}`));
    rules.push(rule(`${selector} .callout-content`, `padding-top: ${profile.density === 'compact' ? '0.25em' : '0.45em'}`));
    rules.push(rule(`${selector} .markdown-list-item::marker`, `color: ${color}`));
  });
  rules.push(rule('.callout', `border-left-width: ${profile.accentWidth}`));
  rules.push(rule('.callout-title', `letter-spacing: ${profile.headingTransform === 'uppercase' ? '0.08em' : '0'}`));
  rules.push(rule('.callout-content > :last-child', 'margin-bottom: 0'));
  return rules;
}

function buildTableRules(profile) {
  const rules = [];
  for (const selector of TABLE_BLOCKS) {
    rules.push(rule(selector, `border-radius: ${tableRadius(profile, selector)}`));
    rules.push(rule(selector, `box-shadow: ${tableShadow(profile, selector)}`));
    rules.push(rule(selector, `border-width: ${profile.borderWidth}`));
    rules.push(rule(selector, `font-variant-numeric: ${profile.tableMode.includes('grid') || profile.tableMode.includes('editor') ? 'tabular-nums' : 'normal'}`));
    rules.push(rule(selector, `background-clip: ${selector.includes('cell') ? 'padding-box' : 'border-box'}`));
  }
  rules.push(rule('.markdown-table', `border-collapse: ${profile.tableMode === 'separated' || profile.tableMode.includes('card') ? 'separate' : 'collapse'}`));
  rules.push(rule('.markdown-table', `border-spacing: ${profile.tableMode === 'separated' ? '0 5px' : '0'}`));
  rules.push(rule('.markdown-table-cell--head', `text-transform: ${profile.headingTransform}`));
  rules.push(rule('.markdown-table-row:hover .markdown-table-cell', 'filter: brightness(1.035)'));
  return rules;
}

function buildCodeRules(profile) {
  const rules = [];
  for (const selector of CODE_BLOCKS) {
    rules.push(rule(selector, `font-family: ${codeFontFor(profile, selector)}`));
    rules.push(rule(selector, `border-radius: ${profile.codeMode === 'typewritten' || profile.calloutMode === 'warning' ? '0' : profile.radius}`));
    rules.push(rule(selector, `box-shadow: ${codeShadow(profile, selector)}`));
    rules.push(rule(selector, `letter-spacing: ${profile.codeMode === 'editor' ? '0.01em' : '0'}`));
  }
  rules.push(rule('.markdown-code-block', `border-left-width: ${profile.accentWidth}`));
  rules.push(rule('.markdown-code-block .token.keyword', `color: ${DEFAULT_COLOR_SET.purple}`));
  rules.push(rule('.markdown-code-block .token.string', `color: ${DEFAULT_COLOR_SET.green}`));
  rules.push(rule('.markdown-code-block .token.function', `color: ${DEFAULT_COLOR_SET.blue}`));
  rules.push(rule('.markdown-code-block .token.comment', 'color: var(--reader-muted); font-style: italic'));
  return rules;
}

function buildTaskAndTagRules(profile) {
  const rules = [];
  const taskSelectors = [
    '.markdown-task',
    '.markdown-task:hover',
    '.markdown-task--checked',
    '.markdown-task-checkbox',
    '.markdown-task-checkbox:checked',
    '.markdown-task-checkbox:checked::after',
    '.markdown-list--ordered',
    '.markdown-list--unordered',
    '.markdown-list .markdown-list',
    '.markdown-list-item::marker',
    '.markdown-tag',
    '.markdown-tag:hover',
    '.markdown-tag[data-tag]',
    '.markdown-tag[data-tag="theme"]',
    '.markdown-tag[data-tag="status"]',
    '.markdown-tag[data-tag="todo"]',
    '.markdown-tag[data-tag="done"]',
    '.markdown-tag + .markdown-tag',
  ];
  for (const selector of taskSelectors) {
    rules.push(rule(selector, `border-radius: ${tagRadius(profile, selector)}`));
    rules.push(rule(selector, `font-weight: ${tagWeight(profile, selector)}`));
    rules.push(rule(selector, `text-transform: ${tagTransform(profile, selector)}`));
    rules.push(rule(selector, `box-shadow: ${tagShadow(profile, selector)}`));
  }
  rules.push(rule('.markdown-task-checkbox', `border-width: ${profile.borderWidth === '0' ? '1px' : profile.borderWidth}`));
  rules.push(rule('.markdown-task--checked', 'text-decoration: line-through'));
  return rules;
}

function buildMediaRules(profile) {
  const rules = [];
  for (const selector of MEDIA_BLOCKS) {
    rules.push(rule(selector, `border-radius: ${mediaRadius(profile, selector)}`));
    rules.push(rule(selector, `box-shadow: ${mediaShadow(profile, selector)}`));
    rules.push(rule(selector, `outline-color: transparent`));
  }
  rules.push(rule('.mermaid svg', 'max-width: 100%; height: auto'));
  rules.push(rule('.table-fullscreen__body', 'background: var(--reader-surface)'));
  rules.push(rule('.mermaid-fullscreen__actions', `border-radius: ${profile.strongRadius}`));
  rules.push(rule('.outline-panel button.is-active', 'font-weight: 750'));
  return rules;
}

function buildSourceDetailRules(themeId) {
  const sourceRules = SOURCE_DETAIL_RULES[themeId];
  if (!sourceRules) {
    throw new Error(`Unknown Obsidian source detail profile: ${themeId}`);
  }

  return sourceRules.map(([selector, declarations]) => rule(selector, declarations));
}

function rule(selector, declarations) {
  const body = Array.isArray(declarations) ? declarations.join('; ') : declarations;
  return `${selector} { ${body}; }`;
}

function headingColor(profile, level) {
  if (profile.shape === 'neon-dark') {
    return [DEFAULT_COLOR_SET.purple, DEFAULT_COLOR_SET.cyan, DEFAULT_COLOR_SET.pink, DEFAULT_COLOR_SET.blue][(level - 1) % 4];
  }
  if (profile.shape === 'warning-contrast') {
    return level <= 2 ? DEFAULT_COLOR_SET.yellow : DEFAULT_COLOR_SET.orange;
  }
  if (profile.shape === 'frost-editor') {
    return [DEFAULT_COLOR_SET.red, DEFAULT_COLOR_SET.yellow, DEFAULT_COLOR_SET.green, DEFAULT_COLOR_SET.cyan][(level - 1) % 4];
  }
  if (profile.shape === 'pastel-soft') {
    return [DEFAULT_COLOR_SET.pink, DEFAULT_COLOR_SET.purple, DEFAULT_COLOR_SET.blue, DEFAULT_COLOR_SET.green][(level - 1) % 4];
  }
  return level <= 2 ? 'var(--reader-heading-text)' : 'var(--reader-muted)';
}

function radiusFor(profile, selector) {
  if (selector.includes('paragraph') || selector.includes('link')) {
    return profile.shape === 'paper-manuscript' ? '0' : '3px';
  }
  if (selector.includes('tag') || selector.includes('task')) {
    return profile.strongRadius;
  }
  return profile.radius;
}

function maxWidthFor(selector) {
  if (selector.includes('image')) {
    return '100%';
  }
  return 'none';
}

function shadowFor(profile, selector) {
  if (selector.includes('image') || selector.includes('quote')) {
    return profile.shadow;
  }
  return 'none';
}

function textTransformFor(profile, selector) {
  if (selector.includes('tag') && profile.tagMode.includes('warning')) {
    return 'uppercase';
  }
  return 'none';
}

function calloutColor(type, index) {
  const colors = [
    DEFAULT_COLOR_SET.blue,
    DEFAULT_COLOR_SET.purple,
    DEFAULT_COLOR_SET.cyan,
    DEFAULT_COLOR_SET.green,
    DEFAULT_COLOR_SET.green,
    DEFAULT_COLOR_SET.green,
    DEFAULT_COLOR_SET.purple,
    DEFAULT_COLOR_SET.yellow,
    DEFAULT_COLOR_SET.orange,
    DEFAULT_COLOR_SET.red,
    DEFAULT_COLOR_SET.red,
    DEFAULT_COLOR_SET.pink,
    'var(--reader-muted)',
  ];
  return colors[index % colors.length] ?? type;
}

function calloutShadow(profile, color) {
  if (profile.calloutMode === 'glow') {
    return `0 0 22px color-mix(in srgb, ${color} 22%, transparent)`;
  }
  if (profile.calloutMode === 'paper-note') {
    return profile.strongShadow;
  }
  if (profile.calloutMode === 'card' || profile.calloutMode === 'pastel') {
    return profile.strongShadow;
  }
  return profile.shadow;
}

function calloutBackground(profile, color) {
  if (profile.calloutMode === 'warning') {
    return `color-mix(in srgb, ${color} 12%, transparent)`;
  }
  if (profile.calloutMode === 'pastel' || profile.calloutMode === 'glow') {
    return `color-mix(in srgb, ${color} 10%, var(--reader-callout-bg))`;
  }
  if (profile.calloutMode === 'card') {
    return 'linear-gradient(135deg, var(--reader-callout-bg), var(--reader-accent-muted))';
  }
  return 'var(--reader-callout-bg)';
}

function tableRadius(profile, selector) {
  if (selector.includes('cell') || selector.includes('row')) {
    return profile.tableMode === 'separated' ? profile.radius : '0';
  }
  return profile.tableMode.includes('card') || profile.tableMode === 'rounded' ? profile.softRadius : profile.radius;
}

function tableShadow(profile, selector) {
  if (selector.includes('table') && !selector.includes('cell')) {
    return profile.tableMode.includes('card') || profile.tableMode === 'framed' ? profile.shadow : 'none';
  }
  return 'none';
}

function codeFontFor(profile, selector) {
  if (selector.includes('code') || selector === 'kbd' || selector === 'samp' || selector === 'var') {
    return 'var(--reader-monospace-font)';
  }
  return profile.codeMode === 'editor' || profile.codeMode === 'typewritten'
    ? 'var(--reader-monospace-font)'
    : 'var(--reader-font-family)';
}

function codeShadow(profile, selector) {
  if (selector.includes('block')) {
    return profile.codeMode === 'glow' ? profile.glow : profile.shadow;
  }
  return 'none';
}

function tagRadius(profile, selector) {
  if (selector.includes('checkbox')) {
    return profile.shape === 'frost-editor' ? '2px' : profile.strongRadius;
  }
  if (selector.includes('tag')) {
    return profile.tagMode === 'stamp' || profile.tagMode === 'warning-label' ? '0' : profile.strongRadius;
  }
  return profile.radius;
}

function tagWeight(profile, selector) {
  if (selector.includes('tag')) {
    return profile.tagMode === 'outline' ? '600' : '750';
  }
  return profile.density === 'compact' ? '500' : '450';
}

function tagTransform(profile, selector) {
  if (selector.includes('tag') && (profile.tagMode === 'stamp' || profile.tagMode === 'warning-label')) {
    return 'uppercase';
  }
  return 'none';
}

function tagShadow(profile, selector) {
  if (selector.includes('tag') && profile.tagMode === 'neon') {
    return profile.glow;
  }
  return 'none';
}

function mediaRadius(profile, selector) {
  if (selector.includes('fullscreen')) {
    return profile.radius;
  }
  if (selector.includes('badge') || selector.includes('swatches')) {
    return profile.strongRadius;
  }
  return profile.softRadius;
}

function mediaShadow(profile, selector) {
  if (selector.includes('preview') || selector.includes('fullscreen')) {
    return profile.shadow;
  }
  return 'none';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeObsidianThemeCssPackages();
  console.log(`obsidian theme css generated: ${OBSIDIAN_THEME_IDS.length} themes`);
}
