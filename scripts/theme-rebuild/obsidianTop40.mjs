export const OBSIDIAN_STATS_SNAPSHOT_AT = '2026-07-14T00:00:00.000Z';

export const OBSIDIAN_TOP_40 = Object.freeze([
  source(1, 'Minimal', 2453164, 'kepano/obsidian-minimal', ['dark', 'light']),
  source(2, 'Things', 1246256, 'colineckert/obsidian-things', ['light', 'dark']),
  source(3, 'AnuPpuccin', 1027730, 'anubisnekhet/AnuPpuccin', ['dark', 'light']),
  source(4, 'Blue Topaz', 961769, 'pkm-er/Blue-Topaz_Obsidian-css', ['dark', 'light']),
  source(5, 'Obsidian Nord', 688654, 'insanum/obsidian_nord', ['dark', 'light']),
  source(6, 'Atom', 528706, 'kognise/obsidian-atom', ['dark', 'light']),
  source(7, 'Obsidianite', 512742, 'bennyxguo/Obsidian-Obsidianite', ['dark']),
  source(8, 'Wasp', 442457, 'santiyounger/Wasp-Obsidian-Theme', ['dark', 'light']),
  source(9, 'Typewriter', 408742, 'crashmoney/obsidian-typewriter', ['dark', 'light']),
  source(10, 'ITS Theme', 394065, 'slrvb/Obsidian--ITS-Theme', ['dark', 'light']),
  source(11, 'Obsidian gruvbox', 338901, 'insanum/obsidian_gruvbox', ['dark', 'light']),
  source(12, 'Shimmering Focus', 333336, 'chrisgrieser/shimmering-focus', ['dark', 'light']),
  source(13, 'Primary', 325032, 'primary-theme/obsidian', ['light', 'dark']),
  source(14, 'Catppuccin', 310806, 'catppuccin/obsidian', ['dark', 'light']),
  source(15, 'Prism', 305425, 'damiankorcz/Prism-Theme', ['dark', 'light']),
  source(16, 'Border', 283093, 'akifyss/obsidian-border', ['dark', 'light']),
  source(17, 'Tokyo Night', 281288, 'tcmmichaelb139/obsidian-tokyonight', ['dark', 'light']),
  source(18, 'Sanctum', 280098, 'jdanielmourao/obsidian-sanctum', ['dark', 'light']),
  source(19, 'Dracula for Obsidian', 279386, 'jarodise/Dracula-for-Obsidian.md', ['dark']),
  source(20, 'Willemstad', 264517, 'tingmelvin/willemstad-x', ['dark', 'light']),
  source(21, 'Everforest', 223633, 'FireIsGood/obsidian-everforest-enchanted', ['dark', 'light']),
  source(22, 'GitHub Theme', 196348, 'krios2146/obsidian-theme-github', ['dark', 'light']),
  source(23, '80s Neon', 193418, 'deathau/80s-Neon-for-Obsidian.md', ['dark']),
  source(24, 'Cybertron', 191902, 'nickmilo/Cybertron', ['dark']),
  source(25, 'Solarized', 178636, 'harmtemolder/obsidian-solarized', ['dark', 'light']),
  source(26, 'Notation', 153675, 'deathau/Notation-for-Obsidian', ['dark', 'light']),
  source(27, 'Typomagical', 148543, 'hungsu/typomagical-obsidian', ['light', 'dark']),
  source(28, 'Terminal', 144455, 'zcysxy/Obsidian-Terminal-Theme', ['dark']),
  source(29, 'Cupertino', 137518, 'aaaaalexis/obsidian-cupertino', ['dark', 'light']),
  source(30, 'Ono Sendai', 137222, 'cannibalox/ono-sendai_obsdn', ['dark', 'light']),
  source(31, 'Encore', 125990, 'carbonateb/obsidian-encore-theme', ['dark', 'light']),
  source(32, 'Shiba Inu', 125707, 'faroukx/Obsidian-shiba-inu-theme', ['dark', 'light']),
  source(33, 'PLN', 121740, 'pipeittodevnull/PLN', ['dark', 'light']),
  source(34, 'Dracula Official', 121509, 'dracula/obsidian', ['dark']),
  source(35, 'Obuntu', 120780, 'dmytrodubinin/Obuntu-theme-for-Obsidian', ['dark', 'light']),
  source(36, 'Pink Topaz', 120774, 'shaggyfeng/obsidian-Pink-topaz-theme', ['dark', 'light']),
  source(37, 'Cyber Glow', 117969, 'thepharaohart/Obsidian-CyberGlow', ['dark', 'light']),
  source(38, 'Ukiyo', 108123, 'technerium/obsidian-ukiyo', ['dark', 'light']),
  source(39, 'Material Gruvbox', 100200, 'alljavi/material_gruvbox_obsidian', ['dark', 'light']),
  source(40, 'Yin and Yang', 98626, 'chetachiezikeuzor/Yin-and-Yang-Theme', ['dark', 'light']),
]);

export const OFFICIAL_THEME_DIRECTIONS = Object.freeze([
  direction('quiet-focus', 'Quiet Focus', ['Minimal', 'Shimmering Focus', 'Notation'], [
    'borderless reading surface', 'quiet heading scale', 'low-noise navigation', 'hairline table rhythm', 'restrained active states',
  ]),
  direction('typewriter-studio', 'Typewriter Studio', ['Typewriter', 'Typomagical', 'Yin and Yang'], [
    'serif manuscript body', 'typewriter heading rhythm', 'pull-quote treatment', 'editorial paragraph spacing', 'underlined text links',
  ]),
  direction('topaz-workbench', 'Topaz Workbench', ['Blue Topaz', 'Pink Topaz', 'Prism'], [
    'component-rich surfaces', 'typed callout bands', 'prominent table controls', 'layered knowledge panels', 'colorless shape hierarchy',
  ]),
  direction('atlas-reference', 'Atlas Reference', ['ITS Theme', 'Notation', 'Willemstad'], [
    'dense reference layout', 'compact metadata grids', 'ledger-like tables', 'sectioned callouts', 'structured navigation depth',
  ]),
  direction('soft-canvas', 'Soft Canvas', ['Primary', 'Things', 'Shiba Inu'], [
    'soft rounded controls', 'pill active states', 'task-first reading rhythm', 'gentle raised panels', 'roomy touch targets',
  ]),
  direction('palette-code', 'Palette Code', ['Catppuccin', 'Tokyo Night', 'Obsidian Nord', 'Dracula Official'], [
    'syntax-led hierarchy', 'editor-style code frame', 'compact technical tables', 'balanced dark surfaces', 'semantic status chips',
  ]),
  direction('desktop-notes', 'Desktop Notes', ['Cupertino', 'Border', 'GitHub Theme', 'Obuntu'], [
    'native application chrome', 'segmented toolbar controls', 'sidebar selection rails', 'desktop panel dividers', 'compact outline navigation',
  ]),
  direction('terminal-grid', 'Terminal Grid', ['Terminal', 'Ono Sendai', 'PLN', 'Atom'], [
    'monospace information system', 'command-prefixed headings', 'square grid tables', 'console code headers', 'sharp keyboard focus',
  ]),
  direction('neon-vault', 'Neon Vault', ['Cybertron', 'Cyber Glow', '80s Neon', 'Obsidianite'], [
    'luminous focus treatment', 'floating diagram controls', 'neon edge emphasis', 'dark console panels', 'high-contrast active rails',
  ]),
  direction('editorial-contrast', 'Editorial Contrast', ['Yin and Yang', 'Sanctum', 'Ukiyo', 'Everforest'], [
    'magazine heading scale', 'asymmetric heading rules', 'archival quote styling', 'open body spacing', 'high-contrast section markers',
  ]),
]);

function source(rank, name, downloads, repo, modes) {
  return Object.freeze({ rank, name, downloads, repo, modes: Object.freeze(modes) });
}

function direction(id, name, references, nonColorIdentity) {
  return Object.freeze({
    id,
    name,
    references: Object.freeze(references),
    nonColorIdentity: Object.freeze(nonColorIdentity),
  });
}
