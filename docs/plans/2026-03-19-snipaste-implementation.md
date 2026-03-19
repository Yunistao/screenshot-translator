# Snipaste 风格重构实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将截图翻译工具重构为类似 Snipaste 的体验，支持自由区域选择、底部工具栏、标注功能、置顶窗口和 LLM 翻译。

**Architecture:** 主进程管理截图覆盖窗口和置顶窗口，通过 IPC 与渲染进程通信。截图覆盖窗口是一个全屏透明窗口，使用 Canvas 处理区域选择和标注绘制。置顶窗口是独立的 BrowserWindow，支持 alwaysOnTop。

**Tech Stack:** Electron, React, TypeScript, Zustand, Tesseract.js, Canvas 2D API

---

## Task 1: 类型定义扩展

**Files:**
- Modify: `src/types/electron.d.ts`

**Step 1: 添加新的类型定义**

```typescript
// 截图区域
interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 标注类型
type AnnotationType = 'rectangle' | 'arrow' | 'brush' | 'text';

// 标注数据
interface Annotation {
  id: string;
  type: AnnotationType;
  color: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  points?: { x: number; y: number }[];
  text?: string;
  x?: number;
  y?: number;
}

// 语言对
interface LanguagePair {
  source: string;
  target: string;
}

// LLM 配置
interface LLMConfig {
  provider: 'openai' | 'claude' | 'gemini';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}
```

**Step 2: 验证类型定义**

Run: `npm run build:main`
Expected: 编译成功

**Step 3: Commit**

```bash
git add src/types/electron.d.ts
git commit -m "feat(types): add types for screenshot overlay, annotations and LLM config"
```

---

## Task 2: Zustand 状态管理扩展

**Files:**
- Modify: `src/store/appStore.ts`

**Step 1: 扩展状态**

添加截图选择状态、标注状态、语言设置、工具栏状态。

**Step 2: 验证编译**

Run: `npm run build:main`
Expected: 编译成功

**Step 3: Commit**

```bash
git add src/store/appStore.ts
git commit -m "feat(store): extend app state for screenshot selection and annotations"
```

---

## Task 3: LLM 翻译服务

**Files:**
- Create: `src/services/llmTranslation.ts`

**Step 1: 创建 LLM 翻译服务**

实现 OpenAI、Claude、Gemini 三个 LLM 的翻译调用。

**Step 2: 验证编译**

Run: `npm run build:main`
Expected: 编译成功

**Step 3: Commit**

```bash
git add src/services/llmTranslation.ts
git commit -m "feat(services): add LLM translation service for OpenAI, Claude, Gemini"
```

---

## Task 4: 翻译服务集成 LLM

**Files:**
- Modify: `src/services/translationService.ts`

**Step 1: 添加 LLM 引擎选项**

在 TRANSLATOR_ENGINES 数组中添加 openai、claude、gemini。

**Step 2: 集成 LLM 翻译**

在 translateText 函数中添加 LLM 分支。

**Step 3: Commit**

```bash
git add src/services/translationService.ts
git commit -m "feat(translation): integrate LLM translation engines"
```

---

## Task 5: 主进程 - 截图覆盖窗口

**Files:**
- Modify: `src/main.ts`

**Step 1: 添加截图覆盖窗口创建函数**

创建全屏透明窗口，frame: false, transparent: true。

**Step 2: 添加 IPC 处理**

添加 capture-screen、open-screenshot-overlay、close-screenshot-overlay。

**Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(main): add screenshot overlay window management"
```

---

## Task 6: 主进程 - 置顶窗口

**Files:**
- Modify: `src/main.ts`

**Step 1: 添加置顶窗口创建函数**

创建 alwaysOnTop: true 的小窗口。

**Step 2: 添加 IPC 处理**

添加 create-pin-window、set-always-on-top。

**Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(main): add pin window management with always-on-top support"
```

---

## Task 7: Preload 脚本扩展

**Files:**
- Modify: `src/preload.ts`

**Step 1: 添加新 API**

captureScreen, openScreenshotOverlay, closeScreenshotOverlay, createPinWindow, setAlwaysOnTop。

**Step 2: Commit**

```bash
git add src/preload.ts
git commit -m "feat(preload): add new IPC APIs for overlay and pin windows"
```

---

## Task 8: 截图覆盖层组件

**Files:**
- Create: `src/components/ScreenshotOverlay.tsx`
- Create: `src/components/ScreenshotOverlay.css`

**Step 1: 创建截图覆盖层组件**

全屏 Canvas，处理鼠标事件，框选区域。

**Step 2: 创建样式文件**

**Step 3: Commit**

```bash
git add src/components/ScreenshotOverlay.tsx src/components/ScreenshotOverlay.css
git commit -m "feat(components): add screenshot overlay with area selection"
```

---

## Task 9: 工具栏组件

**Files:**
- Create: `src/components/ToolBar.tsx`
- Create: `src/components/ToolBar.css`

**Step 1: 创建工具栏组件**

语言选择下拉菜单、翻译按钮、编辑按钮、置顶按钮、取消按钮。

**Step 2: 创建样式文件**

**Step 3: Commit**

```bash
git add src/components/ToolBar.tsx src/components/ToolBar.css
git commit -m "feat(components): add toolbar with language selector and actions"
```

---

## Task 10: 标注编辑器组件

**Files:**
- Create: `src/components/AnnotationEditor.tsx`
- Create: `src/components/AnnotationEditor.css`

**Step 1: 创建标注编辑器**

矩形、箭头、画笔、文字工具，撤销/重做。

**Step 2: 创建样式文件**

**Step 3: Commit**

```bash
git add src/components/AnnotationEditor.tsx src/components/AnnotationEditor.css
git commit -m "feat(components): add annotation editor with rectangle, arrow, brush tools"
```

---

## Task 11: 置顶窗口组件

**Files:**
- Create: `src/components/PinWindow.tsx`
- Create: `src/components/PinWindow.css`

**Step 1: 创建置顶窗口组件**

可拖动、可缩放、最小化、关闭、复制图片/译文。

**Step 2: 创建样式文件**

**Step 3: Commit**

```bash
git add src/components/PinWindow.tsx src/components/PinWindow.css
git commit -m "feat(components): add pin window with minimize, copy, and text toggle"
```

---

## Task 12: 路由和入口更新

**Files:**
- Modify: `src/App.tsx`

**Step 1: 添加路由**

使用 react-router-dom 添加 /overlay、/pin 路由。

**Step 2: 安装依赖**

Run: `npm install react-router-dom`

**Step 3: Commit**

```bash
git add src/App.tsx package.json package-lock.json
git commit -m "feat(app): add routing for overlay and pin windows"
```

---

## Task 13: 设置面板更新 - LLM 配置

**Files:**
- Modify: `src/components/SettingsPanel.tsx`

**Step 1: 添加 LLM 配置字段**

openaiApiKey, claudeApiKey, geminiApiKey 等。

**Step 2: 添加条件渲染 UI**

根据选择的翻译引擎显示对应配置项。

**Step 3: Commit**

```bash
git add src/components/SettingsPanel.tsx
git commit -m "feat(settings): add LLM configuration fields for OpenAI, Claude, Gemini"
```

---

## Task 14: 集成测试和修复

**Step 1: 运行完整构建**

Run: `npm run build`
Expected: 构建成功

**Step 2: 运行开发服务器测试**

Run: `npm run dev`
Expected: 应用启动，无报错

**Step 3: 测试关键流程**

1. 按快捷键触发截图覆盖窗口
2. 框选区域，验证工具栏显示
3. 测试翻译功能
4. 测试标注功能
5. 测试置顶功能

**Step 4: 修复发现的问题**

**Step 5: 最终提交**

```bash
git add -A
git commit -m "fix: resolve integration issues and polish UI"
```

---

## 执行选项

**Plan complete and saved to `docs/plans/2026-03-19-snipaste-implementation.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**