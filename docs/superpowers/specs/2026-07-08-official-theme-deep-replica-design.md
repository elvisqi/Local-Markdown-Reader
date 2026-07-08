# 官方主题深度复刻重建设计规格

## 背景

现有 10 套官方远程主题虽然已经具备安装、预览和校验链路，但实际主题包的 CSS 只有约 2.2KB 到 2.5KB，选择器数量集中在 26 到 28 个。生成脚本使用统一共享 CSS 模板，再给每个主题追加少量差异规则，因此这些主题更接近“同一套样式换 token”，不能称为 Obsidian 主题深度复刻。

本次重建的目标是彻底删除旧 10 套混合命名主题，从上游主题 CSS 和视觉结构重新分析并制作 10 套 Local Markdown Reader 官方主题。执行路线采用“许可允许则改编”：能合法改编的主题保留署名和许可证记录；不能合法复制的主题只做原创复刻，不直接搬运源码。

## 目标

- 删除旧 10 套官方主题包、预览、合同和报告，不继续修补。
- 新建 10 套明确对应 Obsidian 主题的官方主题。
- 每套主题同时支持 light 和 dark，不允许官方单模式主题。
- 每套主题都必须覆盖正文、标题、表格、代码、callout、文件树、toolbar、outline，并根据主题特征覆盖 Mermaid、JSON/YAML 或全屏表格。
- 每套主题必须有独立设计合同、许可证审计记录、源 CSS 分析摘要、真实预览截图、相似度报告和官方发布校验结果。
- 官方校验器必须能拒绝“只有 token 换色 + 少量 CSS”的薄主题。
- 保持现有主题包 schema 兼容，不能破坏用户已安装主题。
- 保留阅读宽度设置；主题不得强行设置 `.document-reader` 的宽度或最大宽度。

## 非目标

- 不直接导入完整 Obsidian CSS。
- 不引入远程字体、远程图片、`@import`、`url(...)`、`@font-face`。
- 不让主题依赖 Obsidian 专有 DOM。
- 不删除用户本地已安装的旧主题；只从官方远程主题库移除旧主题。
- 不把 GPL 或无许可证主题源码复制进 Apache-2.0 项目。

## 新 10 套主题

本次使用以下 10 套作为官方主题目标：

1. Minimal
2. Things
3. AnuPpuccin
4. Blue Topaz
5. Catppuccin
6. Everforest
7. ITS Theme
8. Primary
9. Prism
10. Cybertron

## 许可证与改编策略

初步 GitHub API 核查结果如下。实施时必须写入机器可读报告。主题包 `description` 只保留短描述，不能承载长署名；许可证和来源明细默认不写入主题包或远程 index，避免破坏现有 schema。

| 主题 | 上游仓库 | 许可证 | 策略 |
| --- | --- | --- | --- |
| Minimal | `kepano/obsidian-minimal` | MIT | 可署名改编 |
| Things | `colineckert/obsidian-things` | MIT | 可署名改编 |
| AnuPpuccin | `anubisnekhet/AnuPpuccin` | GPL-3.0 | 原创复刻，禁止复制 CSS |
| Blue Topaz | `pkm-er/Blue-Topaz_Obsidian-css` | MIT | 可署名改编 |
| Catppuccin | `catppuccin/obsidian` | MIT | 可署名改编 |
| Everforest | 原 catalog 仓库不可用；改用 `FireIsGood/obsidian-everforest-enchanted` | MIT | 可署名改编 |
| ITS Theme | `SlRvb/Obsidian--ITS-Theme` | GPL-2.0 | 原创复刻，禁止复制 CSS |
| Primary | `primary-theme/obsidian` | GPL-3.0 | 原创复刻，禁止复制 CSS |
| Prism | `damiankorcz/Prism-Theme` | MIT | 可署名改编 |
| Cybertron | `nickmilo/Cybertron` | 无许可证文件 | 原创复刻，禁止复制 CSS |

`themes/references/catalog.json` 需要同步修正 Everforest 来源，并把这 10 个主题的 `license.status`、`usage`、`reviewStatus` 更新为实际状态。

### 来源固定策略

上游主题不得使用浮动的默认分支作为长期构建输入。实施时必须生成 `themes/official/sources/source-manifest.json`，每个来源记录：

- upstream repository
- default branch
- pinned commit SHA
- license SPDX
- license file URL
- license file sha256
- 参与分析的 CSS 文件路径
- 每个 CSS 文件的 sha256 和字节数
- `usage`: `adaptable` 或 `inspiration-only`

默认构建只能读取已 pin 的 source manifest。只有显式执行刷新命令时，才允许重新访问 GitHub 并更新 pinned commit。这样后续主题构建和审计是可复现的。

上游 CSS 源码不提交进仓库，尤其不能把 GPL 或无许可证 CSS 作为 repo 文件保存。需要读取上游 CSS 时，脚本从 pinned raw URL 下载到临时缓存目录，例如 `themes/official/.cache/upstream-css/`；该目录必须加入 `.gitignore`。仓库只保留 source manifest、hash、许可证报告和分析摘要。离线构建可以跳过刷新，但不能伪造许可证或防复制报告。

## 架构

### 目录结构

- `themes/official/sources/`
  - 保存上游许可证审计、CSS 分析摘要、可改编/仅参考状态。
- `themes/official/contracts/`
  - 每套主题一份设计合同。
- `themes/official/definitions/`
  - 每套主题独立定义文件，不再把 10 套写在同一个大数组里。
- `themes/packages/`
  - 最终远程可下载主题包。
- `themes/previews/`
  - SVG/HTML 预览和 release 素材。
- `themes/official/reports/`
  - 许可证报告、CSS 统计报告、相似度报告、视觉报告、官方发布校验报告。
- `scripts/theme-rebuild/`
  - 新增或拆分主题分析、生成和验证脚本。

### 生成链路

1. 下载或读取上游主题 CSS。
2. 提取源 CSS 指标：
   - CSS 字节数
   - 规则数量
   - 选择器数量
   - CSS 变量数量
   - 主要组件选择器分布
   - light/dark 策略
   - callout、table、code、workspace chrome、heading 等重点区域统计
3. 根据许可证策略生成设计合同。
4. 根据设计合同生成 Local Markdown Reader 主题包。
5. 使用共享 AST sanitizer/scoper 校验 CSS。
6. 生成预览、截图和报告。
7. 生成远程 `themes/index.json`。
8. 运行官方发布校验。

### 运行时兼容

运行时仍消费现有 `ReaderThemePackage`：

- `tokens`
- `lightTokens`
- `darkTokens`
- `features`
- `previewFixtures`
- `css`
- sanitizer 生成的 `scopedCss`

不得新增会破坏旧主题包解析的必填字段。许可证、来源、合同和报告属于官方构建资料，不作为用户主题包必填字段。

许可证和来源信息默认不写入 `.mdv-theme.json` 顶层字段，因为当前主题包 schema 会拒绝未知字段；也不写入 `themes/metadata.json` 自定义字段，因为当前远程 index 构建器只消费 tags、preview、deprecated 和 replacement 信息。主题包 `description` 受现有字段长度限制，只写 160 字以内的用户可读描述，不塞入长许可证说明。官方审计信息放在 `themes/official/sources/source-manifest.json` 和 `themes/official/reports/license-audit-report.json` 中。若未来要在远程主题库 UI 里展示 `source` 或 `license`，必须先扩展 `ReaderThemePackage`、远程 index schema、导入解析器、index 构建器和相关测试，并保持旧主题包兼容。

### 官方生成入口

现有 `npm run themes:official` 不能继续调用旧的同模板生成器。实施 Phase 1 时必须完成以下调整：

- 替换或重写 `scripts/build-official-themes.mjs`，让它从 `themes/official/definitions/` 读取新 10 套主题定义。
- 删除旧脚本里的内联 `THEMES` 大数组，避免误生成旧主题。
- 保持 `npm run themes:official` 仍是唯一官方生成入口，内部可以调用新的分析、构建、预览和 index 脚本。
- 增加测试，确认 `themes:official` 生成的主题 ID 只包含新 10 套，不包含旧混合命名主题。

## 主题设计要求

每套主题都必须有独立视觉记忆点，不能只靠颜色区别。

### Minimal

- 目标：低干扰、克制、写作和阅读优先。
- 重点：弱边框、低装饰标题、安静文件树和 outline、正文留白节奏。
- 禁止：大面积彩色块、强阴影、复杂卡片化。

### Things

- 目标：本地应用感、紧凑生产力笔记。
- 重点：圆润控件、清晰任务列表、紧凑文件树、类似 macOS 的按钮和选中状态。
- 禁止：纸张复古感、过高信息密度。

### AnuPpuccin

- 目标：多彩、可爱、圆润、可配置感强。
- 重点：彩色标题层级、柔和面板、tag/callout 语义色、任务和徽章样式。
- 禁止：直接复制 GPL CSS。

### Blue Topaz

- 目标：功能丰富、知识库组件感强、蓝青层级。
- 重点：复杂 callout、醒目表格、结构化摘要、全屏表格和 Mermaid 控件。
- 禁止：只做蓝色换肤。

### Catppuccin

- 目标：忠实移植 Catppuccin 调色逻辑，同时适配阅读器。
- 重点：Mocha/Latte 式 light/dark token、语法色、柔和低对比、语义色一致性。
- 禁止：改成普通紫色主题。

### Everforest

- 目标：低饱和绿色、自然、长时间阅读舒适。
- 重点：暖绿色背景、柔和代码块、field-note 式引用和任务列表。
- 禁止：高饱和科技感。

### ITS Theme

- 目标：高密度知识库、复杂结构化内容。
- 重点：metadata、JSON/YAML、callout、表格、代码块和 dashboard fixture。
- 禁止：复制 GPL CSS。

### Primary

- 目标：柔和、圆润、清晰的设计系统。
- 重点：统一圆角尺度、柔和阴影、toolbar/file-tree/outline 与正文组件一致。
- 禁止：仅做淡紫色换肤。

### Prism

- 目标：彩色结构化笔记和高辨识 heading/callout。
- 重点：标题色阶、mark/highlight、callout 类型、tag、语义色。
- 禁止：颜色很多但组件无差异。

### Cybertron

- 目标：深色知识库、未来感、霓虹强调。
- 重点：深色表面、glow、代码/链接/active 状态发光、Mermaid 和全屏控件融合。
- 禁止：直接复制无许可证 CSS。

Cybertron 上游主要是深色主题。官方版本仍必须提供 light mode，但 light mode 应明确标记为 Local Markdown Reader 的浅色适配版，不声称是上游原样复刻。AnuPpuccin、ITS Theme、Primary 等 GPL 主题同理：只能复刻视觉策略，不能复制源码。

## 官方校验门槛

现有 `scripts/verify-official-themes.mjs` 只检查 token 数和报告存在，必须增强：

- 每套主题 CSS 源码不少于 12KB，除非设计合同明确说明是极简主题；极简主题也不得少于 8KB。
- 每套主题 CSS 规则数量不少于 90；Minimal 可放宽到 70。
- 每套主题必须覆盖至少 8 个组件区域。
- 每套主题必须拥有至少 6 个非颜色差异点。
- 每套主题必须有 `lightTokens` 和 `darkTokens`，且每组不少于 50 个 token。
- 每套主题必须通过 sanitizer。
- 每套主题必须有许可证策略记录。
- MIT 改编主题必须保留 upstream repo、license、licenseUrl、usage=`adaptable`。
- GPL / 无许可证主题必须 usage=`inspiration-only`，并在报告中证明未复制上游 CSS。
- 每套主题必须有组件覆盖矩阵，至少覆盖 8 个组件区域。
- 每个已声明覆盖的核心组件必须有最低 CSS 覆盖：
  - document / headings：至少 10 条规则。
  - table / fullscreen table：至少 12 条规则。
  - code / inline code：至少 10 条规则。
  - callout：至少 12 条规则，且覆盖 typed callout。
  - file tree / toolbar / outline：每类至少 8 条规则。
  - Mermaid / JSON/YAML / dashboard fixture：声明覆盖时至少 6 条规则。
- 每个已声明覆盖的核心组件必须通过 selector reachability 校验：
  - 使用真实 preview DOM fixture 渲染 markdown、table、callout、file-tree、toolbar、outline、Mermaid、JSON/YAML 等区域。
  - 统计主题 CSS 选择器在 fixture DOM 中的命中情况。
  - 每个声明覆盖组件至少 70% 的选择器必须命中真实 DOM；核心组件命中规则数不得低于该组件最低规则数的 60%。
  - 未命中的选择器必须进入报告，不能静默忽略。
- 相似度报告必须包括：
  - token 相似度
  - selector 相似度
  - component coverage overlap
  - CSS size/rule count 分布
- 任何两套主题的 selector 相似度不得高于 0.72。
- 任何两套主题的非颜色差异点重叠不得高于 0.5。

### 受限许可证防复制校验

对 GPL 和无许可证主题，官方报告必须包含源码未复制检测，至少包括：

- declaration block hash 对比：本地主题 CSS 的声明块 hash 不得与上游 CSS 完全匹配，允许的通用单声明块必须进入白名单。
- selector n-gram 相似度：selector 3-gram Jaccard 相似度必须小于等于 0.15；超过即失败，除非该主题为 MIT 改编并在许可证报告中声明。
- 连续文本相似度：本地 CSS 与上游 CSS 不能存在超过 120 个字符的连续相同片段，CSS 变量名、颜色值和通用属性组合可白名单处理。
- 声明块完全匹配数：GPL / 无许可证主题的非白名单声明块完全匹配数必须为 0。
- 规则级来源标注：GPL / 无许可证主题的合同中必须声明 `implementation: "original-replica"`。
- 检测失败时，官方校验器必须失败，而不是只写 warning。

对 MIT 主题，允许改编，但仍不允许直接把整段上游 CSS 原封不动搬入主题包。MIT 主题需要在许可证报告中列出改编范围和署名。

## CSS 安全边界

继续复用 `src/shared/themeCss.js` 的 AST sanitizer/scoper：

- 禁止 `@import`、`@font-face`、`url(...)`、`expression()`、`javascript:`。
- 禁止全局重置选择器。
- 禁止隐藏关键交互元素。
- 禁止覆盖 `.document-reader` 的 `width` / `max-width`。
- 禁止直接覆盖文件树虚拟行高，只能使用 `--reader-file-tree-row-height`。
- 主题 CSS 上限维持 128KB；如果深度主题需要更大，必须另行评审。

## 预览与视觉验收

需要生成两类预览：

- 远程主题库卡片预览：展示主题主视觉、light/dark、组件摘要。
- 真实浏览器截图：使用实际 theme stylesheet 渲染的 HTML fixture 截图，覆盖 desktop 和较窄宽度。

预览不能只截图 SVG mock。必须新增一个真实 DOM 预览页面或 fixture，要求：

- 使用最终 `.mdv-theme.json` 主题包。
- 通过与运行时一致的 token + scoped CSS 生成逻辑渲染样式，等价于 `buildInstalledThemeStylesheet()` 的输出。
- DOM 包含真实的 reader 结构和稳定 hooks，而不是专门为预览写的一套伪 DOM。
- 同一页面展示 light 和 dark 两种模式，或分别截图 light/dark。
- `themes:visual` 必须截图这个真实 DOM 预览，并把截图路径写入 `theme-visual-report.json`。
- SVG 卡片预览可以保留，但只能作为远程主题库缩略图，不能作为官方视觉验收依据。

每套主题至少展示：

- 长文标题和段落
- 表格
- 代码块和 inline code
- callout
- task list
- tag/mark/link
- 文件树
- toolbar
- outline
- 一个主题相关强化 fixture，例如 Mermaid、JSON/YAML、dashboard 或 fullscreen table

## 执行计划

### Phase 1：冻结旧样本、替换生成入口、补齐审计

- 将当前旧 10 套薄主题复制为测试 fixture，例如 `themes/official/fixtures/legacy-thin-themes/`，用于验证新校验器会拒绝薄主题。
- 删除正式目录里的旧 10 套主题包、预览、合同和报告。
- 替换 `npm run themes:official` 背后的旧生成器，确保不会再生成旧混合命名主题。
- 修正 reference catalog，补齐许可证状态。
- 新增许可证审计报告。
- 新增源 CSS 分析脚本。
- 新增 source manifest，固定每个上游仓库 commit 和 CSS hash。
- 新增 upstream CSS 临时缓存目录并加入 `.gitignore`，确保上游 CSS 不进入仓库。

### Phase 2：强化官方校验

- 增强官方校验器。
- 新增 CSS 规则数、字节数、组件覆盖矩阵、许可证策略、相似度门槛。
- 使用 legacy thin theme fixture 验证旧薄主题无法通过。
- 增加 GPL / 无许可证防复制检测。
- 增加真实 DOM selector reachability 校验。

### Phase 3：逐套主题合同

- 为 10 套主题写设计合同。
- 合同必须包含视觉记忆点、light/dark 策略、组件覆盖、非颜色差异、禁止项、参考源。

### Phase 4：逐套实现

- 每套主题独立定义文件。
- MIT 主题可基于上游 CSS 分析结果做署名改编。
- GPL / 无许可证主题只能原创 CSS。
- 每完成 1 套运行 sanitizer 和该主题单项校验。

### Phase 5：预览、截图、发布

- 生成 10 套主题包。
- 生成远程 index。
- 生成预览素材。
- 使用浏览器检查真实 DOM 预览。
- 运行 typecheck、测试、build、主题官方校验。

## 测试与验证

必须运行：

- `npm run themes:references:verify`
- `npm run themes:official`
- `npm run themes:verify`
- `npm run themes:visual`
- `npm run typecheck`
- `npm test -- --run`
- `npm run build`
- `npm run verify:dist`

如果 `themes:visual` 在本地环境无法完成，必须说明原因，并至少提供浏览器截图或替代视觉报告。

## 风险与处理

- **许可证风险**：GPL / 无许可证主题不能复制源码，只能原创复刻。
- **主题过大风险**：CSS 上限 128KB，深度主题必须控制在可安装范围内。
- **DOM 能力不足风险**：如果某主题关键特征无法通过现有 DOM hooks 表达，应先补稳定 hook 和测试，再做主题 CSS。
- **视觉差异不足风险**：官方校验器必须量化 CSS 厚度、组件覆盖和相似度，不能靠主观确认。
- **假覆盖风险**：CSS 规则数量不足以证明生效，必须通过 selector reachability 校验确认规则命中真实 DOM。
- **兼容风险**：主题 schema 扩展只能向后兼容，旧主题包仍可安装。

## 完成标准

- 旧 10 套官方主题已从远程主题库删除。
- 新 10 套官方主题均可安装、可预览、可切换 light/dark。
- 每套主题有独立设计合同、许可证审计、CSS 分析摘要和视觉报告。
- 每套主题通过真实 DOM selector reachability 校验。
- 官方校验器会拒绝薄主题。
- `themes/index.json` 指向新 10 套主题。
- 所有要求的验证命令通过。
