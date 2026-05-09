# Privacy Policy / 隐私权政策

Effective date / 生效日期: 2026-05-09

Product / 产品: Local Markdown Reader / 本地 Markdown 阅读器

This policy explains how Local Markdown Reader handles data when you use the browser extension. This policy is provided for transparency and should be reviewed by a qualified legal professional before publication.

本政策说明本地 Markdown 阅读器浏览器扩展在使用过程中如何处理数据。本政策用于透明披露，正式发布前建议由合格法律专业人士审核。

## 1. Developer And Contact / 开发者与联系方式

Developer / 开发者: Elvis Qi

Privacy contact / 隐私联系邮箱: shuaiqy@gmail.com

## 2. Summary / 摘要

Local Markdown Reader is a local-first Chrome/Edge extension for reading Markdown files from folders selected by the user.

本地 Markdown 阅读器是一个本地优先的 Chrome/Edge 扩展，用于阅读用户主动选择的本地文件夹中的 Markdown 文件。

- The extension does not require an account.
- The extension does not collect analytics.
- The extension does not sell personal data.
- The extension does not transmit Markdown document contents to the developer or to a remote server.
- Local folder access only occurs after the user explicitly selects a folder through the browser's folder picker.

- 本扩展不需要用户账号。
- 本扩展不收集分析统计数据。
- 本扩展不出售个人数据。
- 本扩展不会把 Markdown 文档内容传输给开发者或远程服务器。
- 只有在用户通过浏览器文件夹选择器明确选择文件夹后，本扩展才会读取该本地文件夹。

## 3. Information The Extension Handles / 本扩展处理的信息

The extension may handle the following data locally in the user's browser:

本扩展可能在用户浏览器本地处理以下数据：

- Markdown file contents from folders explicitly selected by the user.
- Local file and folder names needed to display the file list and current document title.
- Reading settings, such as theme, reading width, reading style, outline visibility, and raw Markdown mode.
- Last opened document state, including the selected folder handle, folder name, file path, and last updated timestamp, so the extension can restore the previous reading session when permission is still available.

- 用户明确选择的文件夹中的 Markdown 文件内容。
- 为展示文件列表和当前文档标题所需的本地文件名和文件夹名。
- 阅读设置，例如主题、正文宽度、阅读样式、大纲显示状态和 Raw Markdown 模式。
- 上次打开文档的状态，包括已选择的文件夹句柄、文件夹名称、文件路径和更新时间戳，用于在浏览器仍保留授权时恢复上次阅读会话。

## 4. How Information Is Collected / 信息如何产生或读取

The extension reads local Markdown documents only after the user chooses a folder using the browser-provided File System Access API. The extension scans the selected folder to find Markdown files and reads the selected Markdown file for rendering.

本扩展只有在用户通过浏览器提供的 File System Access API 选择文件夹后，才会读取本地 Markdown 文档。本扩展会扫描已选择文件夹中的 Markdown 文件，并读取用户选中的 Markdown 文件用于渲染。

The extension also uses browser extension storage to save user preferences. It may use IndexedDB to remember the last opened local document state.

本扩展还会使用浏览器扩展存储保存用户偏好设置，并可能使用 IndexedDB 记住上次打开的本地文档状态。

## 5. How Information Is Used / 信息用途

The extension uses locally handled information only to provide its reader features:

本扩展仅将本地处理的信息用于提供阅读器功能：

- Rendering Markdown documents as readable HTML.
- Generating a document outline from Markdown headings.
- Displaying a local Markdown file list for the selected folder.
- Switching between Markdown files in the selected folder.
- Restoring the last opened document when browser permission is still available.
- Applying user-selected reading settings.

- 将 Markdown 文档渲染为可阅读的 HTML。
- 根据 Markdown 标题生成文档大纲。
- 展示已选择文件夹中的本地 Markdown 文件列表。
- 在已选择文件夹内切换 Markdown 文件。
- 在浏览器仍保留授权时恢复上次打开的文档。
- 应用用户选择的阅读设置。

## 6. Data Sharing / 数据共享

The extension does not send Markdown file contents, folder contents, filenames, reading settings, or last opened document state to the developer, analytics providers, advertising networks, or other third parties.

本扩展不会把 Markdown 文件内容、文件夹内容、文件名、阅读设置或上次打开文档状态发送给开发者、分析服务商、广告网络或其它第三方。

The extension does not sell, rent, or trade user data.

本扩展不会出售、出租或交易用户数据。

## 7. Remote Services And Tracking / 远程服务与追踪

The extension does not include analytics tracking, advertising SDKs, remote logging, payment processing, account login, or marketing pixels.

本扩展不包含分析追踪、广告 SDK、远程日志、支付处理、账号登录或营销像素。

The extension's use of information is limited to providing or improving its local Markdown reading functionality. The extension's use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

本扩展对信息的使用仅限于提供或改进本地 Markdown 阅读功能。本扩展对从 Chrome API 获得的信息的使用遵守 Chrome Web Store User Data Policy，包括 Limited Use 要求。

If future versions add any remote service or third-party integration, this policy will be updated before release, and the Chrome Web Store privacy disclosure will be updated accordingly.

如果未来版本增加任何远程服务或第三方集成，本政策会在发布前更新，Chrome 网上应用店中的隐私披露也会同步更新。

## 8. Permissions / 权限说明

The extension requests the following permissions:

本扩展请求以下权限：

- `storage`: used to save reader settings such as theme, style, width, outline visibility, and raw Markdown mode.
- `scripting`: used by the extension's Manifest V3 architecture when opening and coordinating extension pages.
- `file:///*` host permission: used to support local file compatibility and allow the extension to provide a reader entry for local Markdown files. This permission does not by itself allow the extension to enumerate arbitrary local folders. Folder enumeration occurs only after the user explicitly grants folder access through the browser folder picker.

- `storage`：用于保存阅读器设置，例如主题、样式、正文宽度、大纲显示状态和 Raw Markdown 模式。
- `scripting`：用于扩展 Manifest V3 架构下打开和协调扩展页面。
- `file:///*` 主机权限：用于支持本地文件兼容性，并为本地 Markdown 文件提供阅读入口。该权限本身不会让扩展枚举任意本地文件夹；只有用户通过浏览器文件夹选择器明确授权后，扩展才会枚举该文件夹。

## 9. Data Retention / 数据保留

Markdown document contents are read locally for display and are not stored by the extension as separate copies.

Markdown 文档内容仅在本地读取并用于展示，扩展不会另行保存文档副本。

Reading settings are retained in browser extension storage until the user changes them, clears browser extension data, removes the extension, or resets browser profile data.

阅读设置会保存在浏览器扩展存储中，直到用户修改设置、清除浏览器扩展数据、卸载扩展或重置浏览器用户资料。

Last opened document state may be retained in browser local storage mechanisms such as IndexedDB until the user clears site/extension data, removes the extension, or the browser revokes access.

上次打开文档状态可能会保存在 IndexedDB 等浏览器本地存储机制中，直到用户清除站点/扩展数据、卸载扩展，或浏览器撤销访问权限。

## 10. User Controls / 用户控制

Users can control the extension's access and stored data in the following ways:

用户可以通过以下方式控制扩展访问权限和已保存数据：

- Choose whether to grant folder access when prompted by the browser.
- Decline folder access or close the folder picker.
- Clear extension data from the browser settings.
- Remove the extension from the browser.
- Change reading preferences from the extension popup or options page.

- 在浏览器提示时自行决定是否授予文件夹访问权限。
- 拒绝文件夹访问或关闭文件夹选择器。
- 在浏览器设置中清除扩展数据。
- 从浏览器中移除本扩展。
- 在扩展弹窗或选项页中修改阅读偏好。

## 11. Security / 安全

The extension is designed to process Markdown documents locally in the browser. It does not transmit document contents to external servers. Access to local folders is mediated by browser permission prompts and the browser's File System Access API.

本扩展设计为在浏览器本地处理 Markdown 文档，不会将文档内容传输到外部服务器。本地文件夹访问由浏览器权限提示和浏览器 File System Access API 管理。

No software system can guarantee absolute security. Users should only grant folder access to extensions they trust and may revoke access or remove the extension at any time through browser settings.

任何软件系统都无法保证绝对安全。用户应只向可信扩展授予文件夹访问权限，并可随时通过浏览器设置撤销访问或移除扩展。

## 12. Children's Privacy / 儿童隐私

The extension is not directed to children under 13 and does not knowingly collect personal information from children.

本扩展并非面向 13 岁以下儿童，也不会有意收集儿童个人信息。

## 13. International Users / 国际用户

Because the extension is local-first and does not transmit user documents to developer-controlled servers, the extension is not designed to perform international transfers of user document data.

由于本扩展本地优先，且不会把用户文档传输到开发者控制的服务器，本扩展并非设计用于跨境传输用户文档数据。

If the user synchronizes browser extension settings through their browser account, that synchronization is handled by the browser provider under that provider's own policies and account settings.

如果用户通过浏览器账号同步扩展设置，该同步由浏览器提供商根据其自身政策和账号设置处理。

## 14. Changes To This Policy / 政策变更

This policy may be updated when the extension changes its data handling practices, permissions, or third-party integrations. The effective date at the top of this policy will be updated when changes are made.

当扩展的数据处理方式、权限或第三方集成发生变化时，本政策可能会更新。政策变更时，顶部的生效日期也会同步更新。

## 15. Contact / 联系方式

For privacy questions or requests, contact:

如有隐私相关问题或请求，请联系：

shuaiqy@gmail.com

## 16. Legal Review Notes / 法律审核提示

Before publication, verify that the developer name and privacy contact email are correct. If you publish this extension under a company, add the company's legal name and registered address if required by your jurisdiction.

发布前，请确认开发者名称和隐私联系邮箱准确无误。如果以公司名义发布，请根据适用司法辖区要求补充公司法定名称和注册地址。

This policy should be reviewed if the extension later adds remote sync, user accounts, analytics, crash reporting, cloud rendering, AI features, advertising, payments, or any third-party SDK.

如果本扩展未来增加远程同步、用户账号、分析统计、崩溃报告、云端渲染、AI 功能、广告、支付或任何第三方 SDK，应重新审核本政策。
