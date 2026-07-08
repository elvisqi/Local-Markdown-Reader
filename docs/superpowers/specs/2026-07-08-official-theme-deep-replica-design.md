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

初步 GitHub API 核查结果如下。实施时必须写入机器可读报告，并在主题包描述或 metadata 中保留来源和策略。

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
- 相似度报告必须包括：
  - token 相似度
  - selector 相似度
  - component coverage overlap
  - CSS size/rule count 分布
- 任何两套主题的 selector 相似度不得高于 0.72。
- 任何两套主题的非颜色差异点重叠不得高于 0.5。

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
- 真实浏览器截图：使用实际 options/preview 页面或独立预览页面截图，覆盖 desktop 和较窄宽度。

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

### Phase 1：清理旧主题与补齐审计

- 删除旧 10 套主题包、预览、合同和报告。
- 修正 reference catalog，补齐许可证状态。
- 新增许可证审计报告。
- 新增源 CSS 分析脚本。

### Phase 2：强化官方校验

- 增强官方校验器。
- 新增 CSS 规则数、字节数、组件覆盖、许可证策略、相似度门槛。
- 先验证旧薄主题无法通过。

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
- 使用浏览器检查真实预览。
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
- **兼容风险**：主题 schema 扩展只能向后兼容，旧主题包仍可安装。

## 完成标准

- 旧 10 套官方主题已从远程主题库删除。
- 新 10 套官方主题均可安装、可预览、可切换 light/dark。
- 每套主题有独立设计合同、许可证审计、CSS 分析摘要和视觉报告。
- 官方校验器会拒绝薄主题。
- `themes/index.json` 指向新 10 套主题。
- 所有要求的验证命令通过。
