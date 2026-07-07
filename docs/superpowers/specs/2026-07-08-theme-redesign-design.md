# Local Markdown Reader 主题重建设计规格

## 背景

之前做过的 Obsidian 风格远程主题草稿已经删除，原因是它们在结构上过于相似，实际观感更像同一套样式换颜色。我们重新分析了 Obsidian 社区当前下载量前 40 的主题，结论很明确：热门 Obsidian 主题的差异并不主要来自配色，而是来自选择器覆盖、排版节奏、应用框架、表格、callout、代码块、类插件内容和组件密度。

Local Markdown Reader 现在的主题包能力是 `tokens + scoped css`。现有 token 已经覆盖基础颜色、字体、标题、代码、表格、引用、callout、任务、标签、toolbar、文件树、outline 和少量语法高亮颜色。这个基础足够支撑普通阅读样式，但不足以支撑 10 套特征明显、观感差异足够大的主题。

## 目标

- 基于特征差异设计 10 套主题，而不是简单按下载量前 10 复制。
- 主题要为 Local Markdown Reader 重新设计，不直接搬运 Obsidian CSS。
- 只在能够带来明显视觉差异的地方扩展 token 和安全 CSS 能力。
- 保留现有“阅读宽度”设置；主题可以改变内部密度和间距，但不能强行固定正文宽度。
- 远程主题预览要能清楚展示实际差异。
- 增加可重复执行的相似度检查，避免以后再次出现主题近似重复的问题。

## 非目标

- 不导入完整的 Obsidian 上游主题 CSS。
- 不支持远程字体加载，也不允许主题 CSS 使用任意 `url(...)` 资源。
- 不把现有的“跟随系统 / 浅色 / 深色”颜色模式替换成“主题”概念。
- 不让这些主题依赖 Obsidian 专属插件 DOM 结构。

## 核心判断

本次重建不能只理解为“扩充 token”。如果只有更多颜色、间距和圆角变量，10 套主题仍然可能看起来只是轻微换肤。要稳定做出差异明显的主题，必须同时具备四类能力：

1. **组件级 token**：主题必须能控制正文、标题、表格、代码、callout、标签、任务、文件树、outline、toolbar、Mermaid、JSON/YAML 摘要等区域。
2. **稳定 DOM 语义钩子**：主题需要根据内容类型和组件状态写样式，不能只能笼统选择 `table`、`pre`、`.callout`。
3. **风格 profile**：每套主题必须有明确的密度、圆角、标题、表格、callout、代码和应用框架策略，不能从颜色表直接生成。
4. **视觉与相似度验收**：发布前必须同时通过机器相似度报告和人工预览检查。

因此，Phase 1 的目标不是“把 token 数量做大”，而是建立一个能表达结构差异的主题系统。

## 主题定位

### 1. Minimal Focus

参考方向：Minimal、Shimmering Focus。

视觉目标：低干扰的技术文档阅读风格，边框弱、标题克制、可读性高，导航框架尽量安静。

核心特征：

- 正文容器平静、扁平、低噪音。
- 标题主要依靠字号和留白建立层级，而不是强装饰。
- 表格和代码块清晰，但不抢正文注意力。
- 文件树和大纲的激活状态要克制。

需要的支持：

- 正文内距、边框强度 token。
- 标题 margin 和 border width token。
- outline 激活背景和文字 token。
- 滚动条和 resize handle token，用于弱化应用框架。

### 2. Typewriter Desk

参考方向：Typewriter、Red Graphite、Typomagical。

视觉目标：长文写作、纸张质感、类打字机体验，标题可使用衬线或 slab-serif 气质，行高更舒展，段落节奏更强。

核心特征：

- 纸张式表面和偏暖的中性色。
- 更像文章排版的标题节奏。
- blockquote 更接近 pull quote。
- 代码和表格保持功能可读，但不作为视觉主角。

需要的支持：

- 段落间距、可选首行缩进、列表节奏 token。
- blockquote padding、border、background、typography token。
- 标题字体、margin、装饰、大小写 token。
- mark 和 link 装饰 token。

### 3. Topaz Lab

参考方向：Blue Topaz、Pink Topaz。

视觉目标：多彩、高定制、组件感强，callout、标签、表格和交互控件都要有明显存在感。

核心特征：

- 强 accent palette，拥有多个语义颜色。
- callout 和 tag 的视觉权重要高。
- 表格的表头、斑马纹、hover、控件都要清楚。
- 全屏表格和 Mermaid 控件需要融入主题。

需要的支持：

- 语义 callout 类型 token：note、info、tip、warning、danger、quote、todo、abstract。
- tag 和 badge 变体。
- 表格 toolbar、统计徽章、全屏按钮、滚动阴影 token。
- 更高的 CSS 和 token 包容量限制。

### 4. ITS Atlas

参考方向：ITS Theme。

视觉目标：知识库和参考文档阅读，适合高密度内容、表格、metadata、YAML、callout 和结构化笔记。

核心特征：

- 信息密度高，但不能显得拥挤。
- 表格、YAML 摘要、JSON 摘要和块级区域要有强层级。
- callout 和 blockquote 是文档结构的一部分，而不只是装饰。
- 在密集页面里，代码块和 inline code 仍然要清楚。

需要的支持：

- YAML / JSON reader summary token。
- 生成型 reader 的 section/card surface token。
- 表格密度和全屏表格面板 token。
- callout 类型 token 和 block title token。

### 5. Primary Soft

参考方向：Primary。

视觉目标：友好、圆润、柔和、轻松，有更强的设计系统感。

核心特征：

- 控件和面板更圆润。
- 阴影柔和，色彩表面轻。
- 文件树、toolbar、outline 和正文组件要统一。
- tag 和任务 checkbox 需要有明显风格。

需要的支持：

- 圆角尺度 token：small、medium、large、pill。
- 阴影尺度 token：small、medium、elevated。
- button/control 的 hover、active、focus、disabled token。
- checkbox radius 和 checked mark token。

### 6. Palette Port

参考方向：Catppuccin、Tokyo Night、Nord、Dracula。

视觉目标：忠实的流行配色移植，明暗模式下都要有完整体验，代码和语义色是主题身份的核心。

核心特征：

- 文字、代码、callout、链接、标签和应用框架都使用同一套一致的色彩逻辑。
- 语法高亮要像专门设计过，而不是通用默认色。
- 深色模式长时间阅读要舒适，不能只有高饱和对比。

需要的支持：

- 更完整的语法 token：number、operator、punctuation、variable、type、property、tag、attribute、regexp、inserted、deleted。
- 超出 red/orange/yellow/green/cyan/blue/purple/pink 的语义调色 token。
- 主题包支持真正的 light/dark token override。

### 7. Desktop Native

参考方向：Cupertino、Border、GitHub Theme。

视觉目标：像本地桌面文档应用。toolbar、文件树、outline、控件和正文表面都要有完整应用感。

核心特征：

- 应用框架和 Markdown 正文同等重要。
- 文件树行、展开箭头、toolbar 按钮、resize handle 都需要主题化。
- 正文表面可以是扁平，也可以是面板式，但要和应用框架一致。

需要的支持：

- toolbar 背景、边框、高度、blur token。
- 文件树 row height、hover、active、icon、disclosure、state token。
- outline button padding、active indicator、border token。
- 滚动条和 resize handle token。

### 8. Terminal Console

参考方向：Terminal、Ono Sendai。

视觉目标：等宽字体优先的技术阅读体验，终端式密度、锐利边框、强代码气质、命令行风格标题。

核心特征：

- 等宽字体主导标题、代码，也可以选择性影响正文。
- 边框锐利，表格和代码区域有网格感。
- 标题可以有命令行前缀式装饰。
- 表格和代码块要有 console-native 的感觉。

需要的支持：

- 标题 prefix / decoration token，或可通过安全主题 CSS 实现的选择器。
- 代码块 border、header、接近行号区域的样式。
- 表格边框和密度 token。
- focus ring 和 selection token。

### 9. Cyber Glow

参考方向：Cybertron、Cyber Glow。

视觉目标：未来感深色主题，克制的霓虹 accent、发光效果和高对比。

核心特征：

- 深色表面，链接、激活控件和重要块有 glow。
- callout 和代码块使用 accent border 或 shadow。
- Mermaid / 表格全屏控件要看起来属于同一主题。

需要的支持：

- glow shadow token。
- focus ring token。
- control 和 floating action button token。
- Mermaid wrapper、zoom button、fullscreen overlay、diagram surface token。

### 10. Yin Editorial

参考方向：Yin and Yang、Red Graphite。

视觉目标：强编辑感对比，黑白或红/石墨强调，杂志式标题和清晰阅读层级。

核心特征：

- 浅色和深色模式不是简单反色，而是分别设计。
- 标题有强对比和编辑式间距。
- link、mark、quote、horizontal rule 承载主题身份。

需要的支持：

- 主题包支持 `lightTokens` 和 `darkTokens`。
- 标题 rule、text-transform、margin token。
- 链接下划线、mark、horizontal rule token。
- blockquote typography token。

## Token 扩展

### 分批策略

Token 扩展需要分批落地，但 Phase 1 必须覆盖能拉开主题差异的最小能力集。不能只先做颜色 token，否则后续 10 套主题仍然会接近换色。

Phase 1 必须实现的最小能力集：

- 正文结构：document padding、document border、document shadow、section gap。
- 标题节奏：H1-H6 margin、padding、border width、text transform、letter spacing。
- 排版细节：paragraph indent、link decoration、strong/em color。
- 应用框架：toolbar、control、file tree、outline、resize handle。
- 表格：font size、cell min/max width、header text/shadow、fullscreen panel、action/stat badge、scroll shadow。
- Callout：基础 callout token 和全部 typed callout token。
- 代码：code padding、block shadow、line height、扩展 syntax token。
- 生成型 reader：JSON/YAML summary、大文件 reader、Mermaid wrapper/control。

Phase 2 以后可以继续补充更细的 badge、图标、特殊状态和高级装饰 token。

### 布局 Token

- `--reader-document-padding`
- `--reader-document-border-width`
- `--reader-document-border-style`
- `--reader-document-shadow`
- `--reader-section-gap`
- `--reader-scrollbar-thumb`
- `--reader-scrollbar-track`

### 标题 Token

- `--reader-h1-margin` 到 `--reader-h6-margin`
- `--reader-h1-padding` 到 `--reader-h6-padding`
- `--reader-h1-border-width` 到 `--reader-h6-border-width`
- `--reader-heading-text-transform`
- `--reader-heading-letter-spacing`
- `--reader-heading-decoration-color`
- `--reader-heading-decoration-width`

### 排版 Token

- `--reader-body-letter-spacing`
- `--reader-paragraph-indent`
- `--reader-link-decoration`
- `--reader-link-decoration-thickness`
- `--reader-link-underline-offset`
- `--reader-strong-color`
- `--reader-em-color`

### 应用框架 Token

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

### 表格 Token

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

### Callout Token

基础 token：

- `--reader-callout-padding`
- `--reader-callout-title-font`
- `--reader-callout-title-weight`
- `--reader-callout-icon-color`

类型 token：

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
- `--reader-callout-quote-bg`
- `--reader-callout-quote-border`
- `--reader-callout-quote-title`
- `--reader-callout-todo-bg`
- `--reader-callout-todo-border`
- `--reader-callout-todo-title`
- `--reader-callout-abstract-bg`
- `--reader-callout-abstract-border`
- `--reader-callout-abstract-title`

### 代码和语法 Token

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

### 组件尺度 Token

- `--reader-radius-sm`
- `--reader-radius-md`
- `--reader-radius-lg`
- `--reader-radius-pill`
- `--reader-shadow-sm`
- `--reader-shadow-md`
- `--reader-shadow-lg`
- `--reader-shadow-glow`

### 生成型 Reader Token

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

## 稳定 DOM 语义钩子

主题要有明显差异，必须先补稳定的 class / data 属性。否则主题只能通过宽泛选择器覆盖元素，表达力会很弱，也容易被渲染结构变动破坏。

### Markdown 正文钩子

- 标题：`data-heading-level="1"` 到 `data-heading-level="6"`。
- 链接：区分外链、内部相对链接、hash 锚点链接，例如 `data-link-kind="external|relative|hash"`。
- 代码块：`data-language="ts"`、`data-language="json"` 等语言属性。
- 任务项：`data-task-state="todo|done"`；如果后续支持更多 Markdown 任务语法，再扩展为 `cancelled|scheduled|important`。
- 标签：保留稳定 `.tag` / `a[data-tag]`，并允许主题区分 tag 文本。

### Callout 钩子

callout 类型需要统一为：

- `note`
- `info`
- `tip`
- `warning`
- `danger`
- `quote`
- `todo`
- `abstract`

渲染后的 DOM 应提供稳定属性，例如：

```html
<div class="callout" data-callout="warning">
  <div class="callout-title">Warning</div>
  <div class="callout-content">...</div>
</div>
```

主题 CSS 和 typed callout token 都基于 `data-callout` 生效。

### 表格钩子

- 表格 wrapper：`data-table-size="small|medium|large|wide"`。
- 行列统计：`data-row-count`、`data-column-count`。
- 宽表格：`data-table-overflow="true"`。
- 全屏表格面板：稳定 class 保留，并允许通过 table fullscreen token 控制。

### 生成型 Reader 钩子

- JSON summary：稳定 `.json-reader__summary` 和 summary item class。
- YAML summary：与 JSON summary 对齐的稳定 class。
- 大文件 reader：行号、虚拟行、搜索结果、工具栏都要有稳定 class。
- Mermaid：diagram wrapper、zoom controls、fullscreen overlay 都要有稳定 class，并使用对应 token。

这些钩子是主题差异化的前置能力。没有它们，Topaz Lab、ITS Atlas、Terminal Console、Cyber Glow 这几类主题很难真正成立。

## 主题 Profile 模型

10 套主题不能从颜色配置直接生成，必须从风格 profile 生成。每个 profile 至少包含以下维度：

```ts
type ThemeProfile = {
  density: 'compact' | 'comfortable' | 'editorial';
  radius: 'sharp' | 'soft' | 'round';
  chrome: 'quiet' | 'native' | 'glow' | 'terminal';
  heading: 'minimal' | 'editorial' | 'terminal' | 'decorated';
  table: 'plain' | 'data-grid' | 'paper' | 'colorful';
  callout: 'subtle' | 'semantic' | 'card' | 'glow';
  code: 'plain' | 'ide' | 'terminal';
  contentFocus: 'longform' | 'technical' | 'knowledge-base' | 'data-heavy';
};
```

每套主题必须定义：

- 主导特征：用户一眼能记住的视觉点。
- 次级特征：至少两个支撑主导特征的组件区域。
- 禁止项：避免和其他主题重叠的样式策略。
- 预览重点：该主题最应该展示的预览 fixture。

示例：

- Minimal Focus 的主导特征是低噪音和弱边框，禁止使用强色块 callout。
- Typewriter Desk 的主导特征是纸张和文章排版，禁止做高饱和彩色控件。
- Cyber Glow 的主导特征是深色 glow，禁止使用大面积亮色背景。

## 主题包 Schema 变化

当前结构：

```json
{
  "tokens": {},
  "css": ""
}
```

建议升级为：

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

兼容规则：

- 现有主题包继续有效。
- `tokens` 始终应用。
- `lightTokens` 在 reader 解析为浅色模式时应用。
- `darkTokens` 在 reader 解析为深色模式时应用。
- `features` 用于目录筛选和预览徽章。
- `previewFixtures` 声明哪些预览样例最能展示该主题。

明暗 token 合并顺序固定为：

```text
DEFAULT_READER_THEME_TOKENS
→ theme.tokens
→ theme.lightTokens 或 theme.darkTokens
→ theme.css
```

resolved color mode 来自 reader 的颜色模式计算结果：当用户选择浅色或深色时直接使用该模式；当用户选择跟随系统时，使用当前系统匹配结果。options 预览和 reader 实际渲染必须使用同一套 resolved color mode 逻辑。

`features` 和 `previewFixtures` 不只存在于主题包，也必须同步进入远程 `themes/index.json`。原因是远程目录在下载主题包之前就需要展示筛选、徽章和预览信息。

限制调整：

- token 上限从 160 提高到 320。
- CSS 上限先从 64KB 提高到 128KB。
- 继续拒绝 `@import`、`url(...)`、`@font-face`、`javascript:`、`expression(...)` 和 `behavior`。

## 预览要求

远程主题预览必须使用固定且足够丰富的样例文档：

- H1 到 H6
- 普通段落和密集段落
- 有序列表和无序列表
- 任务列表
- blockquote
- note、info、tip、warning、danger、quote、todo、abstract callout
- inline code 和 fenced code
- 带语法高亮的代码
- 宽表格和紧凑表格
- 表格行列统计徽章
- Mermaid 块
- 标签和 mark
- JSON / YAML 摘要面板
- 文件树和 outline 应用框架

这样可以避免主题在包里看起来不同，但在目录预览里几乎一样。

预览输出至少包含：

- 主题目录卡片预览。
- 真实弹窗预览。
- 桌面宽度 reader 截图。
- 窄屏 reader 截图。
- 浅色和深色 resolved mode 截图；只支持单模式的主题需要明确展示单模式效果。
- 表格全屏截图。
- Mermaid 全屏截图。

预览检查不是可选项。只要某套主题在固定预览中无法一眼看出主导特征，就不能进入发布。

## 相似度检查

主题生成后需要输出本地报告，比较：

- token key 重合度
- token value 完全重合度
- 颜色桶相似度
- CSS selector 相似度
- 类别覆盖：标题、表格、callout、代码、列表、应用框架、生成型 reader、控件

相似度公式固定为：

```text
overall =
  0.25 * tokenKeySimilarity +
  0.20 * tokenValueSimilarity +
  0.20 * selectorSimilarity +
  0.15 * colorBucketSimilarity +
  0.20 * featureCoverageSimilarity
```

报告输出到 `themes/previews/theme-similarity-report.json`，并在命令行输出最相似的 10 对主题、最相异的 10 对主题、每套主题的主导特征覆盖。

10 套主题的验收目标：

- 平均整体相似度低于 35%。
- 除非刻意做同家族主题，否则任意一对主题相似度不应超过 65%。
- 至少 8 套主题拥有独立的主导特征类别。
- 每套主题至少覆盖 6 个组件区域。
- 每套主题至少包含 3 个非颜色差异点。
- 每套主题至少有 1 个主题专属视觉记忆点。
- 每套主题在预览首屏内必须能识别出主导特征。

主题专属视觉记忆点示例：

- Minimal Focus：极弱边框和安静标题。
- Typewriter Desk：纸张感和文章排版。
- Topaz Lab：彩色 callout 和标签。
- ITS Atlas：高密度知识库卡片。
- Primary Soft：圆润柔和组件。
- Palette Port：完整语法配色。
- Desktop Native：文件树和 toolbar 像原生应用。
- Terminal Console：等宽字体、终端边框、命令行标题。
- Cyber Glow：霓虹 glow。
- Yin Editorial：黑白强对比和杂志标题。

## 实施阶段

### Phase 1：基础能力

- 给 `DEFAULT_READER_THEME_TOKENS` 增加新 token 默认值。
- 在 `src/reader/App.css` 中应用新 token。
- 扩展主题包解析，支持 `lightTokens`、`darkTokens`、`features` 和 `previewFixtures`。
- 扩展远程主题 index，支持 `features` 和 `previewFixtures`。
- 补充稳定 DOM 语义钩子，至少覆盖 heading、link、code block、callout、table、generated reader。
- 保持现有主题包兼容。
- 提高安全 token 和 CSS 限制。
- 同阶段更新类型、schema 文档、导入/导出逻辑和测试。

### Phase 2：内置主题和现有主题

- 更新内置阅读样式，让它们使用新 token。
- 更新现有远程主题 `ink-focus`、`night-study` 和 `report-grid`。
- 为现有主题补齐 `features` 和 `previewFixtures`。

### Phase 3：主题 Profile

- 用 10 个风格 profile 替代已经删除的 Obsidian 草稿生成器。
- 每个 profile 必须定义 typography、layout、table、callout、code、chrome 和 generated-reader 行为。
- 根据 profile 生成主题包和预览图。
- 生成后立即运行相似度报告，未达标时必须调整 profile，而不是只改颜色。

### Phase 4：验证

- 运行单元测试、typecheck、build、主题索引生成和 dist 验证。
- 运行相似度报告。
- 发布前人工检查生成的预览效果，包括桌面、窄屏、表格全屏和 Mermaid 全屏。

### Phase 5：发布

- 发布 10 个远程主题包和预览。
- 更新远程主题 index。
- 准备发布说明，说明主题系统扩展内容。

## 待确认决策

推荐的第一步是先实施 Phase 1。只有先扩充基础 token 和主题包 schema，再重建 10 套主题，才能避免新主题继续依赖零散 CSS，也能避免再次出现“主题只是换颜色”的问题。
