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
- 10 套官方主题必须同时支持浅色和深色模式，不能发布单模式主题。
- 官方主题必须达到产品内置质量：视觉特征明确、组件覆盖完整、真实页面预览通过，而不是“能安装的示例主题”。
- 官方主题必须通过“反换色”门槛：去掉颜色后仍然要有足够多的排版、结构、密度、边框、组件和交互特征。

## 非目标

- 不导入完整的 Obsidian 上游主题 CSS。
- 不支持远程字体加载，也不允许主题 CSS 使用任意 `url(...)` 资源。
- 不把现有的“跟随系统 / 浅色 / 深色”颜色模式替换成“主题”概念。
- 不让这些主题依赖 Obsidian 专属插件 DOM 结构。
- 不把单模式主题作为官方主题交付标准；第三方主题未来可以保留单模式兼容能力，但官方主题不能这样做。

## 核心判断

本次重建不能只理解为“扩充 token”。如果只有更多颜色、间距和圆角变量，10 套主题仍然可能看起来只是轻微换肤。要稳定做出差异明显的主题，必须同时具备四类能力：

1. **组件级 token**：主题必须能控制正文、标题、表格、代码、callout、标签、任务、文件树、outline、toolbar、Mermaid、JSON/YAML 摘要等区域。
2. **稳定 DOM 语义钩子**：主题需要根据内容类型和组件状态写样式，不能只能笼统选择 `table`、`pre`、`.callout`。
3. **风格 profile**：每套主题必须有明确的密度、圆角、标题、表格、callout、代码和应用框架策略，不能从颜色表直接生成。
4. **非颜色特征证据**：每套主题必须声明可审计的非颜色特征，并在 CSS、DOM 命中报告和截图验收中提供证据。
5. **视觉与相似度验收**：发布前必须同时通过机器相似度报告和人工预览检查。

因此，Phase 1 的目标不是“把 token 数量做大”，而是建立一个能表达结构差异的主题系统。官方主题不能以颜色替换作为主要差异来源；如果把颜色声明剥离后仍然无法识别主题身份，该主题不得发布。

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

### 实现边界

DOM 钩子按信息来源分两类实现：

- **Markdown 渲染阶段生成**：标题级别、链接类型、代码语言、任务状态、callout 类型。这些信息来自 Markdown AST 或渲染器上下文，应该在 HTML 生成时写入，避免后处理猜测。
- **DOM 后处理阶段生成**：表格尺寸、行列统计、overflow 状态、全屏表格 wrapper。这些信息依赖真实 DOM 或布局测量，应该由 table fullscreen / table stats 后处理逻辑写入。
- **组件直接输出**：JSON/YAML reader、大文件 reader、Mermaid wrapper、文件树、outline、toolbar 这类 React 组件应直接输出稳定 class 和 data 属性。

这个边界需要写入测试。后续如果渲染器替换或 DOM 结构调整，稳定钩子必须保持兼容。

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

### 非颜色特征字典

为了避免主题再次退化成“同一套 CSS 换颜色”，官方主题不能只写自然语言差异点。Phase 1 需要建立受控的 `NonColorFeatureDictionary`，后续合同、CSS 指标、相似度报告、截图验收和官方发布校验都引用同一批 feature id。

非颜色特征指的是去掉颜色、渐变、透明度和色彩 token 后仍然可观察的样式差异，包括排版、密度、边框策略、圆角、阴影形态、组件结构、控件尺寸、交互状态和应用框架布局。颜色可以支撑主题气质，但不能单独算作非颜色特征。

建议字典初始提供以下受控 id。数量可以继续扩展，但官方 10 套主题只能引用字典内 id，不能临时写自由文本绕过校验。

**排版与正文**

- `type-body-serif`
- `type-body-sans`
- `type-body-mono`
- `type-heading-serif`
- `type-heading-mono`
- `type-heading-display`
- `type-compact-line-height`
- `type-editorial-line-height`
- `type-paragraph-air`
- `type-first-line-indent`
- `type-list-rhythm`
- `type-link-underline-thick`

**标题系统**

- `heading-quiet-scale`
- `heading-editorial-scale`
- `heading-command-prefix`
- `heading-numbered-marker`
- `heading-bottom-rule`
- `heading-left-rail`
- `heading-caps-transform`
- `heading-kicker-spacing`
- `heading-block-surface`
- `heading-hierarchy-colorless`

**应用框架**

- `chrome-quiet-flat`
- `chrome-native-toolbar`
- `chrome-terminal-frame`
- `chrome-glow-frame`
- `chrome-panel-surface`
- `chrome-compact-sidebar`
- `chrome-roomy-sidebar`
- `chrome-resize-handle-themed`
- `chrome-scrollbar-themed`
- `chrome-floating-actions`
- `chrome-border-grid`
- `chrome-soft-shadow`

**表格**

- `table-dense-grid`
- `table-spacious-grid`
- `table-sticky-header-frame`
- `table-zebra-structure`
- `table-hover-row`
- `table-metric-badges`
- `table-fullscreen-toolbar`
- `table-cell-borderless`
- `table-dataview-density`
- `table-scroll-shadow`

**Callout 与引用**

- `callout-left-rail`
- `callout-card`
- `callout-title-band`
- `callout-icon-chip`
- `callout-typed-shape`
- `callout-glow-border`
- `callout-compact`
- `callout-quote-style`
- `callout-dashboard-block`
- `callout-low-noise`

**代码**

- `code-editor-frame`
- `code-terminal-block`
- `code-header-strip`
- `code-inline-pill`
- `code-grid-border`
- `code-soft-panel`
- `code-language-badge`
- `code-dense-line-height`

**文件树**

- `tree-compact-rows`
- `tree-roomy-rows`
- `tree-disclosure-themed`
- `tree-active-left-bar`
- `tree-active-pill`
- `tree-icon-sized`
- `tree-indent-strong`
- `tree-low-noise`

**大纲**

- `outline-compact-list`
- `outline-editorial-list`
- `outline-active-rail`
- `outline-active-pill`
- `outline-hierarchy-indent`
- `outline-quiet-hover`

**控件与交互态**

- `control-sharp-buttons`
- `control-rounded-buttons`
- `control-pill-buttons`
- `control-pressed-state`
- `control-focus-ring`
- `control-soft-shadow`
- `control-glow-focus`
- `control-disabled-muted`

**生成型 reader、Mermaid 和全屏**

- `yaml-summary-panel`
- `json-key-value-grid`
- `mermaid-framed-surface`
- `mermaid-floating-controls`
- `fullscreen-table-docked-actions`
- `fullscreen-table-corner-actions`
- `theme-preview-overlay`
- `selection-themed`

每个 feature id 必须有一条机器可校验的定义：

```ts
type NonColorFeatureDefinition = {
  id: string;
  category:
    | 'typography'
    | 'heading'
    | 'chrome'
    | 'table'
    | 'callout'
    | 'code'
    | 'file-tree'
    | 'outline'
    | 'control'
    | 'generated-reader';
  description: string;
  evidenceSelectors: string[];
  evidenceProperties: string[];
  requiresScreenshotEvidence: boolean;
};
```

`evidenceProperties` 不能只包含 `color`、`background-color`、`border-color`、`box-shadow` 中的颜色部分或 CSS 变量颜色赋值。可以使用 `box-shadow` 证明 glow / elevation，但必须同时有 blur、spread、offset 或容器结构证据，不能只靠 shadow 颜色变化。

每套主题必须定义：

- 主导特征：用户一眼能记住的视觉点。
- 次级特征：至少两个支撑主导特征的组件区域。
- 禁止项：避免和其他主题重叠的样式策略。
- 预览重点：该主题最应该展示的预览 fixture。

示例：

- Minimal Focus 的主导特征是低噪音和弱边框，禁止使用强色块 callout。
- Typewriter Desk 的主导特征是纸张和文章排版，禁止做高饱和彩色控件。
- Cyber Glow 的主导特征是深色 glow，禁止使用大面积亮色背景。

### 每套主题设计合同

10 套官方主题不能只靠自然语言描述推进。每套主题在生成主题包前都必须先写一份设计合同，作为实现和验收的共同输入。

建议结构：

```ts
type OfficialThemeContract = {
  schemaVersion: 1;
  id: string;
  name: string;
  references: string[];
  profile: ThemeProfile;
  dominantMemoryPoint: string;
  signatureFeatureIds: string[];
  lightModeStrategy: string;
  darkModeStrategy: string;
  requiredComponentCoverage: Array<
    | 'document'
    | 'heading'
    | 'table'
    | 'callout'
    | 'code'
    | 'file-tree'
    | 'toolbar'
    | 'outline'
    | 'generated-reader'
    | 'mermaid'
  >;
  nonColorFeatureIds: string[];
  nonColorFeatureEvidence: Array<{
    featureId: string;
    component: string;
    selectors: string[];
    properties: string[];
    visibleInScreenshots: string[];
  }>;
  requiredFixtures: Array<
    | 'longform'
    | 'technical'
    | 'data-table'
    | 'fullscreen-table'
    | 'mermaid'
    | 'json-yaml'
    | 'chrome'
    | 'narrow-screen'
  >;
  forbiddenOverlap: Array<{
    themeId: string;
    forbiddenSimilarity: string;
  }>;
  screenshotAcceptance: Array<{
    file: string;
    expectedVisibleFeatureIds: string[];
    evidenceRegion: string;
  }>;
  releaseDescription: {
    bestFor: string;
    visualSignature: string;
    notBestFor: string;
  };
};
```

合同要求：

- 合同文件必须放在 `themes/official/contracts/<theme-id>.json`。
- `contract.schemaVersion` 初始为 `1`；未来合同字段升级必须提升版本并保留迁移说明。
- `contract.id`、主题包 `id`、远程 index entry `id` 必须完全一致。
- `contract.name` 和主题包 `name` 可以有展示差异，但官方发布校验器必须在报告中列出差异。
- `dominantMemoryPoint` 必须能在主题弹窗预览首屏看到。
- `signatureFeatureIds` 至少 3 项，必须来自 `NonColorFeatureDictionary`，用于定义用户一眼能记住的招牌特征。
- `lightModeStrategy` 和 `darkModeStrategy` 必须分别描述，而不是写“反色”或“同浅色”。
- `requiredComponentCoverage` 至少 7 项，并且必须和实际 token / CSS 覆盖报告一致。
- `nonColorFeatureIds` 至少 18 项，必须来自 `NonColorFeatureDictionary`。
- `nonColorFeatureEvidence` 必须覆盖全部 `signatureFeatureIds` 和至少 18 个 `nonColorFeatureIds`；每项 evidence 都要能在 selector reachability 或 CSS metrics 中找到对应命中。
- `forbiddenOverlap` 用来防止两个主题在同一方向上重复，例如 Minimal Focus 和 Yin Editorial 都不能只表现为“黑白简洁”。
- `screenshotAcceptance` 明确每张真实浏览器截图里要看到哪些 feature id 和截图区域，人工验收时逐项勾选。
- 每套主题至少 10 个非颜色 feature id 必须能在真实截图里被人工确认，其中至少 3 个来自 `signatureFeatureIds`。
- 每套主题必须回答发布前问题：“去掉颜色后，这套主题还剩下什么独特性？”答案写入 release description 或 visual report，空泛回答视为失败。

如果主题包实现和设计合同不一致，应该调整主题包或合同，不能只修改相似度阈值来通过验收。

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
  "previewFixtures": ["longform", "technical", "data-table"],
  "signatureFeatureIds": ["heading-command-prefix", "table-dense-grid", "code-terminal-block"]
}
```

兼容规则：

- 现有主题包继续有效。
- `tokens` 始终应用。
- `lightTokens` 在 reader 解析为浅色模式时应用。
- `darkTokens` 在 reader 解析为深色模式时应用。
- `features` 用于目录筛选和预览徽章。
- `previewFixtures` 声明哪些预览样例最能展示该主题。
- `signatureFeatureIds` 用于远程主题详情、预览弹窗和发布报告展示主题招牌特征；第三方旧主题缺失该字段时继续兼容，官方主题必须提供。
- 官方主题必须同时提供 `lightTokens` 和 `darkTokens`，且两套模式都要有对应预览截图和人工验收记录。

明暗 token 合并顺序固定为：

```text
DEFAULT_READER_THEME_TOKENS
→ theme.tokens
→ theme.lightTokens 或 theme.darkTokens
→ theme.css
```

resolved color mode 来自 reader 的颜色模式计算结果：当用户选择浅色或深色时直接使用该模式；当用户选择跟随系统时，使用当前系统匹配结果。options 预览和 reader 实际渲染必须使用同一套 resolved color mode 逻辑。

`features`、`previewFixtures` 和 `signatureFeatureIds` 不只存在于主题包，也必须同步进入远程 `themes/index.json`。原因是远程目录在下载主题包之前就需要展示筛选、徽章、预览信息和主题招牌特征。

字段约束：

- `features` 和 `previewFixtures` 都是受控字符串数组。
- `signatureFeatureIds` 必须引用 `NonColorFeatureDictionary`，官方主题至少 3 项，第三方主题最多展示 6 项。
- 解析时必须去重、排序，并限制最大数量。
- 未识别值应在导入或 index 生成时失败，不能静默忽略。

`features` 允许值：

- `minimal`
- `editorial`
- `tables`
- `callouts`
- `chrome`
- `code`
- `terminal`
- `glow`
- `palette`
- `data-heavy`
- `longform`
- `knowledge-base`

`previewFixtures` 允许值：

- `longform`
- `technical`
- `data-table`
- `fullscreen-table`
- `mermaid`
- `json-yaml`
- `chrome`
- `narrow-screen`

限制调整：

- token 上限从 160 提高到 320。
- CSS 上限先从 64KB 提高到 128KB。
- 继续拒绝 `@import`、`url(...)`、`@font-face`、`javascript:`、`expression(...)` 和 `behavior`。

### CSS 布局权限边界

官方主题允许通过受控 scoped CSS 调整文件树、toolbar 和 outline 的布局尺寸。原因是这三块属于主题视觉身份的一部分，如果只能改颜色，Desktop Native、Terminal Console、Primary Soft、Topaz Lab 等主题很难形成足够明显的应用框架差异。

允许调整：

- toolbar 高度、按钮尺寸、按钮间距、分组间距、边框和背景层次。
- 文件树行高、缩进、图标尺寸、展开箭头尺寸、节点 padding、选中态 indicator 尺寸。
- outline 宽度相关的内部 padding、按钮行高、层级缩进、active indicator、resize handle 厚度和视觉样式。
- reader 周边框架的 gap、分隔线、滚动条样式和局部 sticky 控件尺寸。

文件树虚拟滚动联动规则：

- 文件树实际行高必须以 `--reader-file-tree-row-height` 为唯一来源。
- 虚拟滚动 item size 必须从同一个值读取，不能在 JS 中保留独立硬编码高度。
- 主题 CSS 可以改变 `--reader-file-tree-row-height`，但不能直接对虚拟行写固定 `height`、`min-height` 或 `line-height` 来绕开该变量。
- `--reader-file-tree-row-height` 需要有最小和最大限制，例如 22px 到 40px；超出范围时主题导入或官方发布校验必须失败。
- `--reader-file-tree-row-height` 在 Phase 1 只允许明确的 px 数值，例如 `28px`；暂不允许 `calc()`、`var()`、`em`、`rem`、百分比或关键字，避免 JS item size 解析和继承结果不稳定。
- 文件树缩进、图标尺寸、展开箭头尺寸也应优先通过 token / CSS 变量表达，例如 `--reader-file-tree-indent`、`--reader-file-tree-icon-size`、`--reader-file-tree-disclosure-size`。
- 虚拟树测试必须覆盖至少 22px、28px、36px 三档行高，验证滚动位置、点击命中、展开收起、当前文件高亮不偏移。

约束：

- 不能强行固定正文阅读宽度，必须继续服从“阅读宽度”设置。
- 不能使用 fixed / absolute 把主题元素覆盖到 reader 外部主流程之外，除非是已有的全屏表格、Mermaid 全屏或受控浮动按钮容器。
- 文件树、toolbar、outline 的高度和宽度调整必须设置合理 min/max 或响应式约束，不能导致窄屏无法操作。
- 不能隐藏基础交互元素：文件树展开箭头、当前文件高亮、toolbar 主按钮、outline 当前标题状态必须可见。
- 不能禁用 pointer events、selection、scroll、resize 等核心交互。

这些规则需要进入 CSS sanitizer / scoper 的测试矩阵。主题可以有布局个性，但不能破坏文件树懒加载、虚拟滚动、outline 定位、表格全屏和 Mermaid 全屏。

### CSS Allow / Deny 清单

远程主题 CSS 不能只靠字符串黑名单判断安全性。Phase 1 需要把 sanitizer 扩展为声明级校验，至少覆盖属性名、属性值、选择器和 at-rule。

解析与复用约束：

- CSS 校验必须基于 CSS AST parser，例如 PostCSS 或 CSSTree，不能继续依赖正则和字符串扫描作为主逻辑。
- 运行时导入、远程 index 构建、options 预览、SVG/PNG 预览生成、官方主题发布校验器必须复用同一个 sanitizer / scoper 模块。
- sanitizer 输出必须包含结构化诊断：规则位置、selector、property、value、失败原因、所属主题 id。
- 任何路径使用了不同 sanitizer 实现都视为失败；否则会出现构建通过、运行时拒绝，或预览通过、安装失败的问题。

运行位置：

- 主题导入、安装、远程 index 构建、官方发布校验必须运行完整 AST sanitizer。
- reader 实际渲染阶段不应重复加载完整 CSS parser；reader 只消费已经通过校验并被 scope 后的 CSS。
- 已安装主题需要存储或缓存 sanitized/scoped CSS，以及 sanitizer 版本、source CSS hash、scoped CSS hash。sanitizer 版本升级时，需要重新校验已安装主题。
- options 预览使用同一份 sanitized/scoped CSS，不能使用未校验的原始 CSS 直接预览。

允许的 at-rule：

- `@media`
- `@supports`
- 未来如果引入容器查询，可以增加 `@container`

禁止的 at-rule：

- `@import`
- `@font-face`
- `@keyframes`
- `@property`
- `@namespace`
- 任何会加载外部资源或创建全局副作用的规则

禁止的选择器：

- `html`、`body`、`:root` 以外逃逸到主题 scope 外部的选择器。
- `*` 全局重置选择器，除非 scoper 能保证只影响主题根下且不作用于交互控件。
- `iframe`、`script`、`style`、`link`、`meta` 等非 reader 内容节点。
- 针对扩展宿主页面、浏览器页面或 options 根节点的选择器。

受控布局容器 allowlist：

只有以下容器允许使用更强的布局能力，例如局部 `position: absolute`、局部 indicator 尺寸和局部浮层位置。Phase 1 如果现有 DOM 没有这些 data hook，需要先补 hook，再开放对应 CSS 能力。

- `[data-theme-layout-scope="table-actions"]`：表格正文右侧 action、行列统计、最大化按钮。
- `[data-theme-layout-scope="table-fullscreen-actions"]`：全屏表格里的底部或角落 action。
- `[data-theme-layout-scope="mermaid-actions"]`：Mermaid 缩放、最大化、重置按钮。
- `[data-theme-layout-scope="file-tree-indicator"]`：文件树节点内部选中态 indicator、展开箭头和图标区域。
- `[data-theme-layout-scope="toolbar-group"]`：toolbar 内部分组、按钮间距和按钮尺寸。
- `[data-theme-layout-scope="outline-indicator"]`：outline 当前标题 indicator 和层级缩进。
- `[data-theme-layout-scope="theme-preview-overlay"]`：options 主题预览卡片内部浮层。

allowlist 只开放容器内部布局，不开放逃逸到页面级 overlay。所有选择器仍然必须被主题 root scope 包裹。

匹配规则：

- 使用受限布局属性的 selector 必须显式包含对应 `[data-theme-layout-scope="..."]`。
- 该 selector 被 scope 后必须仍位于主题 root 之下，不能通过 `:has()`、`:is()`、`:where()` 或 selector list 间接匹配主题 root 外部节点。
- 对 selector list 逐项校验；只要其中一个 selector 不满足 allowlist，整条规则失败。
- 受控容器只能放宽容器内部布局属性，不放宽全局交互限制，例如隐藏核心按钮、禁用 pointer events、破坏主滚动容器仍然禁止。

禁止或限制的属性和值：

- `position: fixed` 全面禁止。
- `position: absolute` 只允许在已有受控容器内使用，例如表格全屏 action、Mermaid 控件、主题预览卡片内部浮层；其他区域禁止。
- `z-index` 必须限制在产品定义范围内，例如 0 到 20；全屏 overlay 使用产品内置样式，不由主题 CSS 自行拔高。
- `display: none`、`visibility: hidden`、`opacity: 0` 不能作用于关键交互节点，包括文件树展开箭头、当前文件标识、toolbar 主按钮、outline active 状态、表格全屏按钮、Mermaid 缩放按钮。
- `pointer-events: none`、`user-select: none`、`touch-action: none` 不能作用于文件树、toolbar、outline、正文、全屏控件等核心区域。
- `overflow: hidden` 不能作用于主滚动容器、文件树滚动容器、outline 滚动容器、表格滚动容器。
- `width` / `max-width` 不能作用于 `.document-reader` 的阅读宽度；阅读宽度继续由产品设置控制。
- `height` / `min-height` / `line-height` 不能直接覆盖虚拟文件树行高，必须通过 `--reader-file-tree-row-height`。
- `transform` 不能作用于主 reader、文件树滚动容器、outline 滚动容器和虚拟列表内部定位容器，避免破坏测量和点击命中。

允许的布局类属性应集中在受控组件内：

- margin、padding、gap、border、border-radius、box-shadow、background、color、font、line-height、letter-spacing。
- toolbar、文件树、outline 的尺寸 token 和内部 spacing token。
- 表格、callout、代码块、Mermaid、JSON/YAML reader 的组件级布局属性。

官方主题发布校验必须把 CSS deny 命中作为硬失败，而不是只在控制台警告。

## Token 回退规则

所有新增 token 都必须有明确回退链，避免主题包必须一次性定义全部变量。

通用回退顺序：

```text
typed/component token
→ base component token
→ DEFAULT_READER_THEME_TOKENS
→ CSS fallback literal
```

示例：

- `--reader-callout-warning-bg` 未定义时，回退到 `--reader-callout-bg`。
- `--reader-table-fullscreen-panel-bg` 未定义时，回退到 `--reader-surface`。
- `--reader-control-hover-bg` 未定义时，回退到基于 `--reader-link` 和 `--reader-surface` 的 `color-mix(...)`。
- `--reader-h3-margin` 未定义时，回退到现有 H3 默认 margin。

主题生成脚本可以生成完整 token，但导入器和运行时不能要求第三方主题一次性覆盖全部 token。

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
- 浅色和深色 resolved mode 截图；10 套官方主题必须同时提供两种模式截图。
- 表格全屏截图。
- Mermaid 全屏截图。

预览检查不是可选项。只要某套主题在固定预览中无法一眼看出主导特征，就不能进入发布。

### 视觉验收工具链

静态 SVG 预览只能作为目录卡片素材，不能作为唯一验收依据。主题发布前必须通过浏览器自动化生成真实页面截图。

工具链要求：

- 使用 Playwright 或等价浏览器自动化打开本地构建后的 options 和 reader 页面。
- 输出目录为 `themes/previews/screenshots/<theme-id>/`。
- 每个主题至少输出：
  - `catalog-card.png`
  - `options-preview-light.png`
  - `options-preview-dark.png`
  - `reader-desktop-light.png`
  - `reader-desktop-dark.png`
  - `reader-narrow.png`
  - `table-fullscreen.png`
  - `mermaid-fullscreen.png`
- 单模式主题只作为第三方兼容能力存在；10 套官方主题必须输出 light 和 dark 全部截图。
- 截图脚本需要生成 `themes/previews/theme-visual-report.json`，记录每张截图路径、viewport、resolved color mode、主题 id、是否成功。

`theme-visual-report.json` 不能只记录截图文件存在。每张截图必须记录：

- `themeId`
- `mode`
- `viewport`
- `screenshotPath`
- `themeCssHash`
- `sourceCssHash`
- `scopedCssHash`
- `resolvedTokensHash`
- `domAssertions`
- `pixelAssertions`
- `fullscreenState`
- `expectedVisibleFeatureIds`
- `visibleFeatureEvidence`
- `missingFeatureIds`
- `manualAcceptance`

自动断言要求：

- DOM 中的 theme id 必须等于目标主题 id。
- 应用到页面的 `sourceCssHash` 必须和主题包原始 css hash 对应。
- 应用到页面的 `scopedCssHash` 必须和 sanitizer / scoper 输出对应，用于排查主题包正确但注入结果不一致的问题。
- 截图核心区域不能为空白，且非背景像素比例必须超过最小阈值。
- `table-fullscreen.png` 必须断言全屏表格容器存在且处于打开状态。
- `mermaid-fullscreen.png` 必须断言 Mermaid 全屏容器存在且处于打开状态。
- light 和 dark 截图需要输出差异摘要，例如背景、文字、accent、surface token 至少有一组实际差异。
- `expectedVisibleFeatureIds` 必须来自设计合同的 `screenshotAcceptance`，不能由截图脚本临时生成。
- `visibleFeatureEvidence` 必须记录每个 feature id 的截图区域、关联 selector 和人工验收状态；不能只记录“截图存在”。

人工验收要求：

- 人工验收结果写回 `manualAcceptance`，至少包含 `accepted`、`reviewer`、`reviewedAt`、`notes`、`acceptedFeatureIds`、`rejectedFeatureIds`。
- 如果人工验收拒绝，官方主题发布校验器必须失败。
- 如果自动断言通过但人工认为主题视觉记忆点不明显，应调整主题而不是只改合同描述。
- 每套主题至少 10 个非颜色 feature id 必须被人工接受；少于 10 个视为“视觉差异不足”。
- `signatureFeatureIds` 必须全部被人工接受，否则不得发布。

失败标准：

- 截图为空白或核心区域未渲染。
- 主题 CSS 未应用到 reader 或 options 预览。
- 表格全屏或 Mermaid 全屏截图没有进入全屏状态。
- 预览首屏无法展示该主题的主导视觉记忆点。
- 视觉报告没有逐项列出非颜色 feature id 的证据。
- `acceptedFeatureIds` 少于 10 个，或缺少任一 `signatureFeatureIds`。

## 相似度检查

主题生成后需要输出本地报告，比较：

- token key 覆盖率
- token value 完全重合度
- 颜色桶相似度
- CSS selector 相似度
- 类别覆盖：标题、表格、callout、代码、列表、应用框架、生成型 reader、控件
- 非颜色声明比例
- 非颜色 feature id 重叠度
- 去色后 CSS profile 相似度

token key 不纳入整体相似度公式。原因是 10 套主题应该共同覆盖最小能力集，key 重合高是好事，不代表视觉相似。token key 只作为覆盖率检查：每套主题必须覆盖足够多的组件区域。

整体相似度公式固定为：

```text
overall =
  0.15 * tokenValueSimilarity +
  0.15 * selectorSimilarity +
  0.05 * colorBucketSimilarity +
  0.20 * featureCoverageSimilarity +
  0.25 * nonColorProfileSimilarity +
  0.20 * profileDistanceSimilarity
```

`profileDistanceSimilarity` 根据 `ThemeProfile` 的维度计算。两个主题在 density、radius、chrome、heading、table、callout、code、contentFocus 上越一致，相似度越高。

`nonColorProfileSimilarity` 基于剥离颜色后的 CSS 和合同 feature id 计算，包括：

- 非颜色声明集合相似度。
- 非颜色 feature id Jaccard 相似度。
- 组件内结构属性相似度，例如 spacing、radius、border width、shadow geometry、row height、toolbar height。
- selector 命中到同一组件区域后的布局属性相似度。

颜色相似度权重保持很低。两套主题只要非颜色 profile 高度相似，即使颜色完全不同，也必须判定为风险对。

报告输出到 `themes/previews/theme-similarity-report.json`，并在命令行输出最相似的 10 对主题、最相异的 10 对主题、每套主题的主导特征覆盖。

10 套主题的验收目标：

- 平均整体相似度低于 35%。
- 除非刻意做同家族主题，否则任意一对主题相似度不应超过 65%。
- 任意一对主题的非颜色 profile 相似度不得超过 55%。
- 任意一对主题的非颜色 feature id 重叠度不得超过 50%。
- 至少 8 套主题拥有独立的主导特征类别。
- 每套主题至少覆盖 7 个组件区域。
- 每套主题至少包含 18 个非颜色 feature id。
- 每套主题至少有 3 个主题招牌 feature id。
- 每套主题至少有 10 个截图可见的非颜色 feature id。
- 每套主题 CSS 的非颜色声明比例不得低于 45%；颜色声明、token 赋值和纯色彩变量不能计入。
- 每套主题在预览首屏内必须能识别出主导特征。
- 每套官方主题的 light 和 dark 模式都必须独立通过上述验收，不能只保证其中一种模式有特色。

## 官方主题质量门槛

10 套主题按官方主题交付，不按示例包交付。每套主题发布前必须满足：

- 同时具备浅色和深色模式，且不是简单反色；两种模式都要有完整 token、CSS、截图和人工验收记录。
- 至少覆盖正文、标题、表格、callout、代码、文件树、toolbar、outline、生成型 reader 中的 7 个区域。
- 至少包含 18 个受控非颜色 feature id，例如密度、圆角、边框策略、标题节奏、表格结构、callout 形态、代码块布局、应用框架尺寸。
- 至少 3 个首屏可识别的招牌 feature id，且必须能在远程主题弹窗预览里看到。
- 至少 10 个非颜色 feature id 在真实浏览器截图中有人工验收证据。
- CSS 非颜色声明比例不得低于 45%；如果 CSS 体积达标但主要由颜色变量、重复选择器或未命中规则组成，仍然失败。
- 任意两套主题的非颜色 profile 相似度不得超过 55%，非颜色 feature id 重叠度不得超过 50%。
- 所有截图必须来自真实浏览器渲染，不能只依赖静态 SVG。
- 桌面、窄屏、宽表格全屏、Mermaid 全屏、JSON/YAML reader、文件树展开状态都不能出现布局遮挡、文字溢出、交互控件不可见。
- 主题 CSS 不能靠过度复杂选择器堆叠制造差异；如果需要大量 CSS，必须能说明它们分别服务于哪些组件特征。
- 每套主题都要有一段发布说明，明确它适合的阅读场景、主导特征和不适合的场景。
- 每套主题都要回答“去掉颜色后，这套主题还剩下什么独特性？”并在发布报告中列出证据。

如果一套主题只是替换颜色、背景和少量字体，即使相似度报告通过，也不能发布为官方主题。

### 官方主题发布校验器

第三方主题导入器需要保持兼容，但官方 10 套主题必须额外通过发布校验器。建议新增脚本：

```bash
npm run themes:validate-official
```

该脚本负责读取：

- `themes/official/contracts/*.json`
- `themes/packages/*.mdv-theme.json`
- `themes/index.json`
- `themes/previews/theme-similarity-report.json`
- `themes/previews/theme-visual-report.json`

硬性失败条件：

- 官方主题数量不是 10。
- 任一官方主题缺少设计合同。
- 任一官方主题缺少 `lightTokens` 或 `darkTokens`。
- 任一官方主题没有进入远程 `themes/index.json`。
- 任一官方主题缺少 light / dark 的 options 预览截图和 reader 真实截图。
- 任一官方主题缺少窄屏、表格全屏、Mermaid 全屏截图。
- 任一官方主题截图缺少 DOM 断言、像素断言、主题 CSS hash、resolved token hash 或人工验收记录。
- 任一官方主题截图的 `expectedVisibleFeatureIds`、`visibleFeatureEvidence` 和设计合同不一致。
- 任一官方主题截图自动断言失败，或人工验收未通过。
- 任一官方主题 `requiredComponentCoverage` 少于 7 项。
- 任一官方主题 `signatureFeatureIds` 少于 3 项，或任一 id 不在 `NonColorFeatureDictionary` 中。
- 任一官方主题 `nonColorFeatureIds` 少于 18 项，或证据覆盖不足 18 项。
- 任一官方主题截图人工接受的非颜色 feature id 少于 10 项。
- 任一官方主题 CSS 非颜色声明比例低于 45%。
- 任一官方主题的 CSS 命中 deny 清单。
- 任一官方主题相似度超过阈值，且没有在合同中明确说明同家族关系。
- 任一官方主题发布说明缺少适合场景、视觉签名或不适合场景。

输出：

- `themes/previews/official-theme-validation-report.json`
- 命令行列出失败主题、失败原因、缺失截图、相似度最高的主题对。

发布 10 套官方主题前，`npm run themes:validate-official` 必须和 build、typecheck 一样作为必跑步骤。

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

## 远程主题缓存失效策略

远程主题发布必须考虑 CDN 和浏览器缓存。之前已经出现过远程 `index.json` 更新后浏览器仍读取旧内容的问题，所以主题系统需要内置缓存失效规则。

请求策略：

- 手动点击“刷新远程主题”时必须强制使用新的 cache-busting 参数，例如 `?refresh=<Date.now()>`。
- options 首次打开或后台自动刷新不应无条件追加 `Date.now()`；默认使用 TTL 策略，例如 10 到 30 分钟内复用缓存结果，超过 TTL 后使用 `cache: no-cache` 或带 app/catalog version 的请求。
- 自动后台刷新可以使用较弱的缓存策略，但界面需要展示 `fetchedAt` 和缓存状态，避免用户误以为已经拿到最新远程内容。
- 如果远程 `catalogVersion` 变化，下一次主题包和预览图请求必须使用 index 中的新版本化 URL，不依赖旧 URL 的缓存刷新。
- 如果用户手动刷新后 `updatedAt` 或 `catalogVersion` 仍未变化，界面可以提示“远程目录未变化”，不能把它当作刷新失败。

发布策略：

- 主题包 URL 应包含版本号，例如 `themes/packages/minimal-focus@2.4.0.mdv-theme.json`，或者在 index 中使用带内容 hash 的 URL。
- 预览图 URL 应包含版本号或内容 hash，避免用户看到旧预览但安装到新主题。
- `themes/index.json` 必须包含 `updatedAt`、`schemaVersion`、`catalogVersion`。
- 每个主题条目必须包含 `version`、`packageUrl`、`previewUrl`、`screenshots`、`features`、`previewFixtures`。

界面排查信息：

- options 远程主题区域应展示远程源地址、`updatedAt`、`fetchedAt` 和当前 catalog version。
- 刷新失败时展示错误来源：网络失败、JSON 解析失败、schema 校验失败、主题包下载失败、缓存疑似未更新。
- 已安装主题和远程主题版本不一致时，远程卡片应显示“可更新”状态，而不是只显示“已安装”。

发布验收：

- 发布后使用无缓存请求验证远程 `index.json`。
- 再使用普通浏览器刷新路径验证 UI 能看到新 catalog version。
- 如果远程源在 CDN 后面，发布说明中记录 CDN 刷新时间和验证时间。

## 实施阶段

### Phase 1：基础能力

- 给 `DEFAULT_READER_THEME_TOKENS` 增加新 token 默认值。
- 在 `src/reader/App.css` 中应用新 token。
- 扩展主题包解析，支持 `lightTokens`、`darkTokens`、`features` 和 `previewFixtures`。
- 扩展远程主题 index，支持 `features` 和 `previewFixtures`。
- 补充稳定 DOM 语义钩子，至少覆盖 heading、link、code block、callout、table、generated reader。
- 明确并测试 scoped CSS 的布局权限边界，允许文件树、toolbar 和 outline 主题化布局尺寸，但不能破坏核心交互。
- 将文件树虚拟滚动 item size 改为读取 `--reader-file-tree-row-height`，确保主题化行高和滚动计算一致。
- 扩展 CSS sanitizer / scoper，加入 at-rule、selector、property、value 的 allow / deny 校验。
- 将 CSS sanitizer / scoper 抽成共享模块，确保运行时导入、远程 index 构建、options 预览、预览生成和官方校验器复用同一实现。
- 将完整 CSS AST sanitizer 放在主题导入、安装、index 构建、预览生成和官方校验路径；reader 渲染阶段只消费已校验的 scoped CSS。
- 为已安装主题记录 sanitizer 版本、source CSS hash、scoped CSS hash，sanitizer 升级后触发重新校验。
- 补齐受控布局容器 data hook，例如 `data-theme-layout-scope="table-actions"`、`mermaid-actions`、`file-tree-indicator`、`toolbar-group` 和 `outline-indicator`。
- 为受限布局属性实现 selector allowlist 匹配：selector 必须显式包含对应 `data-theme-layout-scope`，selector list 逐项校验。
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
- 为每套官方主题创建设计合同，写清楚双模式策略、主导视觉记忆点、组件覆盖、非颜色 feature id、证据 selector、禁止重叠项和截图验收点。
- 校验 `themes/official/contracts/<theme-id>.json`、主题包 id 和远程 index id 三者一致。
- 根据 profile 生成主题包和预览图。
- 生成后立即运行相似度报告，未达标时必须调整 profile，而不是只改颜色。

### Phase 4：验证

- 运行单元测试、typecheck、build、主题索引生成和 dist 验证。
- 运行相似度报告。
- 运行真实浏览器截图生成，输出包含 DOM 断言、像素断言、CSS hash、token hash、全屏状态和人工验收记录的 `themes/previews/theme-visual-report.json`。
- 运行官方主题发布校验器，输出 `themes/previews/official-theme-validation-report.json`。
- 发布前人工检查生成的预览效果，包括桌面、窄屏、表格全屏和 Mermaid 全屏。

### Phase 5：发布

- 发布 10 个远程主题包和预览。
- 更新远程主题 index，并确认 `updatedAt`、`schemaVersion`、`catalogVersion`、版本化 package / preview URL 已同步。
- 验证 options 页面手动刷新通过 cache-busting 请求拿到新 catalog version，并验证自动刷新遵循 TTL / `cache: no-cache` 策略。
- 准备发布说明，说明主题系统扩展内容。

## 待确认决策

推荐的第一步是先实施 Phase 1。只有先扩充基础 token 和主题包 schema，再重建 10 套主题，才能避免新主题继续依赖零散 CSS，也能避免再次出现“主题只是换颜色”的问题。
