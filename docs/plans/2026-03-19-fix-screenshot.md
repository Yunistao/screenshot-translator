# 截图功能修复计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**问题诊断：**
- "开始截图"按钮调用了错误的 API（`requestScreenshot` 而不是 `openScreenshotOverlay`）
- 快捷键逻辑正确，但需要验证是否正常工作

**目标：** 修复截图功能，使其正常显示覆盖窗口、区域选择和工具栏。

---

## Task 1: 修复 ScreenshotTool 按钮

**Files:**
- Modify: `src/components/ScreenshotTool.tsx`

**Step 1: 修改按钮点击逻辑**

将 `captureScreenshotFromMain` 函数改为调用 `openScreenshotOverlay` API：

```typescript
const startScreenshot = async () => {
  clearError();

  if (!window.electronAPI?.openScreenshotOverlay) {
    setErrorMessage('截图功能不可用');
    return;
  }

  await window.electronAPI.openScreenshotOverlay();
};
```

**Step 2: 验证编译**

Run: `npm run build:main`

**Step 3: Commit**

```bash
git add src/components/ScreenshotTool.tsx
git commit -m "fix: use openScreenshotOverlay API for screenshot button"
```

---

## Task 2: 验证覆盖窗口加载

**Step 1: 运行开发服务器测试**

Run: `npm run dev`

**Step 2: 测试快捷键触发截图**

按 Alt+S 或点击"开始截图"按钮，验证：
- 是否出现全屏变暗的覆盖窗口
- 是否可以拖动选择区域
- 是否显示工具栏

**Step 3: 如果有问题，进行调试修复**

---

## Task 3: 修复发现的问题

根据测试结果修复任何发现的问题。

---

## 执行选项

**直接在当前会话执行修复**