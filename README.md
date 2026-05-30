# CrossPost

多平台内容发布浏览器扩展。输入一份内容，AI 自动适配各平台风格并一键发布。

> 🏷️ 七牛云 X Engineer 2026 · 题目二

## 功能概览

| 功能 | 说明 |
|------|------|
| 内容输入 | Markdown 编辑器 + 标题 + 标签，内容 2 秒自动保存 |
| AI 风格改写 | DeepSeek API 将同一内容改写为 4 种平台风格 |
| 多平台预览 | 知乎/B站/公众号/小红书 四栏 Tab 切换预览 |
| 一键发布 | 直连各平台编辑器，自动填入并发布 |
| 智能标签页复用 | 检测已打开的编辑器页面，不重复弹窗 |

## 支持平台

| 平台 | 入口 | 编辑器技术 | 注入方式 |
|------|------|-----------|----------|
| 知乎 | 文章编辑器 | Draft.js (React) | fiber 遍历 → EditorState.push |
| B站 | 专栏编辑器 | ProseMirror (TipTap) | editor.chain().setContent() |
| 公众号 | 图文编辑器 | UEditor / contenteditable | UE API → iframe → innerHTML |
| 小红书 | 写长文 | ProseMirror (TipTap) | editor.chain().setContent() |

## 技术栈

| 技术 | 用途 |
|------|------|
| Plasmo 0.90.5 | 浏览器扩展框架 (Manifest V3) |
| React 18 + TypeScript 5.6 | 弹窗 UI |
| DeepSeek API (deepseek-chat) | AI 内容改写 |
| chrome.scripting | 页面注入 (MAIN world) |
| chrome.storage | 草稿自动保存 |

## 第三方依赖清单

| 依赖 | 版本 | 用途 | 许可证 |
|------|------|------|--------|
| plasmo | 0.90.5 | 扩展框架 | MIT |
| react | 18.3.1 | UI 框架 | MIT |
| react-dom | 18.3.1 | React DOM | MIT |
| typescript | 5.6.3 | 类型系统 | Apache-2.0 |
| @types/chrome | ^0.1.42 | Chrome API 类型 | MIT |
| @types/react | 18.3.12 | React 类型 | MIT |

## 目录结构

```
src/
├── ai/
│   ├── prompts/         # 四平台 AI Prompt 模板
│   │   ├── zhihu.ts     #   知乎：理性克制，长段落论述
│   │   ├── bilibili.ts  #   B站：半口语化，价值前置
│   │   ├── wechat.ts    #   公众号：专业克制，分段加粗
│   │   └── xiaohongshu.ts # 小红书：短句+emoji，钩子开头
│   ├── transformer.ts   # DeepSeek API 调用（超时+重试+回退）
│   └── index.ts
├── platforms/           # 平台适配器（核心架构）
│   ├── interface.ts     # IPlatformAdapter 接口
│   ├── registry.ts      # 适配器注册中心
│   ├── index.ts         # 统一注册
│   ├── zhihu/
│   │   ├── adapter.ts   # 发布逻辑（标签页管理+注入）
│   │   ├── inject.ts    # 注入脚本（Draft.js fiber）
│   │   ├── formatter.ts # 内容格式化
│   │   └── selectors.ts # DOM 选择器常量
│   ├── bilibili/        # 同上结构（ProseMirror）
│   ├── wechat/          # 同上结构（UEditor）
│   └── xiaohongshu/     # 同上结构（ProseMirror 写长文）
├── components/Layout/   # React UI 组件
│   ├── AppLayout.tsx    # 主布局 + 状态管理 + 存储
│   ├── InputPanel.tsx   # 左侧输入面板
│   ├── PreviewPanel.tsx # 右侧预览面板
│   └── TopBar.tsx       # 顶部工具栏
├── storage/
│   └── index.ts         # chrome.storage 持久化
├── types/
│   └── index.ts         # 共享类型定义
└── popup.tsx            # 弹窗入口
```

## 扩展更多平台的架构设计

### IPlatformAdapter 接口

所有平台适配器实现统一接口：

```typescript
interface IPlatformAdapter {
  readonly displayName: string  // 中文名称
  readonly key: PlatformKey     // 平台标识
  readonly icon: string         // 图标 emoji

  formatContent(input: ContentInput): PlatformDraft  // 格式化
  renderPreview(draft: PlatformDraft): PreviewData   // 预览
  publish(draft: PlatformDraft, credentials): Promise<PublishResult>  // 发布
}
```

### 三步新增平台

**Step 1：创建 AI Prompt**（`src/ai/prompts/<platform>.ts`）
- 定义平台风格画像、受众、语气、句式结构
- 返回结构化 JSON：`{title, body, tags}`
- 在 `transformer.ts` 的 `PROMPT_BUILDERS` 中注册

**Step 2：创建平台适配器目录**（`src/platforms/<platform>/`）
```
<platform>/
├── selectors.ts   # DOM 选择器（标题/正文/发布按钮）
├── formatter.ts   # 格式约束（标题字数限制等）
├── inject.ts      # 注入脚本（serializable, no async/await）
└── adapter.ts     # 发布编排（标签页管理 + executeScript）
```

**Step 3：注册 + 权限 + 按钮**
- `src/platforms/index.ts`：`platformRegistry.register(new XxxAdapter())`
- `package.json` `host_permissions`：添加平台域名
- `src/components/Layout/InputPanel.tsx`：添加发布按钮
- `src/components/Layout/AppLayout.tsx`：添加 handler
- `src/components/Layout/PreviewPanel.tsx`：添加 `PLATFORM_NAMES`
- `src/types/index.ts`：添加 `PlatformKey`

### 注入脚本设计原则

`inject.ts` 通过 `chrome.scripting.executeScript({ func, args, world: "MAIN" })` 序列化注入，必须满足：

1. **完全自包含**：无 `async/await`，无闭包引用，纯 `function` 声明
2. **防御性轮询**：`poll(selector, timeout=30s, interval=200ms)` 等待 DOM 就绪
3. **原生事件触发**：`Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val)` 后用 `dispatchEvent(new Event('input'))` 通知框架
4. **框架感知注入**：

| 编辑器类型 | 注入方式 |
|-----------|---------|
| Draft.js (React) | fiber 遍历 → `ContentState.createFromText` → `EditorState.push` → `props.onChange()` |
| ProseMirror (TipTap) | `pmEl.editor.chain().focus().setContent(html).run()` |
| UEditor / iframe | `UE.getEditor().setContent()` → `iframe.contentDocument.body.innerHTML` |
| contenteditable | `execCommand('insertHTML')` → `ClipboardEvent('paste')` |

5. **诊断日志**：`[CrossPost:平台名]` 前缀，每步输出到页面 console

### 架构优势

- **接口统一**：所有平台共享 `IPlatformAdapter`，预览/发布逻辑复用
- **注册即用**：`platformRegistry.register()` 后自动出现在 UI 和 AI 改写管线
- **注入隔离**：MAIN world 注入不受 content script 沙箱限制，可访问 React fiber / ProseMirror / iframe document
- **标签页智能复用**：当前页 → 已有页 → 新建页，三阶段优先级检测

## 本地运行

```bash
# 安装依赖
npm install

# 开发模式（热更新）
npm run dev

# 构建
npm run build

# 加载扩展
# Chrome → chrome://extensions → 开发者模式 → 加载已解压的扩展
# 选择 build/chrome-mv3-dev 目录
```

## 开发流程

- 所有功能通过 Pull Request 合入 main
- PR 标题遵循 Conventional Commits：`feat(scope): / fix(scope): / chore: / docs:`
- 合入使用 Squash Merge，PR 描述作为 commit body
- 每 PR 包含：功能描述、实现思路、测试方式、复用声明

## 许可证

MIT
