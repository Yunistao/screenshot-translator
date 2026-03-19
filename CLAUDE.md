# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## 项目概述

截图翻译工具 - 一个基于 Electron + React + TypeScript 的截图 OCR 识别与翻译应用。

## 常用命令

```bash
# 开发运行 (同时监视主进程编译并启动 Electron)
npm run dev

# 构建应用
npm run build                    # 完整构建 (主进程 + 渲染进程)
npm run build:main              # 仅编译 Electron 主进程 (tsc -p tsconfig.main.json)
npm run build:renderer          # 仅编译渲染进程 (Vite)

# 开发时监视主进程变化
npm run build:watch             # tsc -w，持续编译主进程

# 打包安装包
npm run dist:win                # Windows NSIS 安装包
npm run dist:mac                # macOS 安装包
npm run dist:linux              # Linux AppImage
```

## 技术架构

### 构建系统

项目使用两套独立的 TypeScript 配置:
- **主进程**: `tsconfig.main.json` → 输出到 `dist/main.js`, `dist/preload.js`
- **渲染进程**: `tsconfig.json` + Vite → 输出到 `dist/assets/`

主进程使用 CommonJS 模块，渲染进程使用 ESM。

### 进程模型

```
主进程 (src/main.ts)
    │
    ├── 窗口管理 (BrowserWindow)
    ├── 菜单设置
    └── IPC 通信
            │
            ▼
    预加载脚本 (src/preload.ts)
    contextBridge.exposeInMainWorld('electronAPI', {...})
            │
            ▼
    渲染进程 (React 应用)
```

### IPC API (preload.ts)

渲染进程通过 `window.electronAPI` 访问:

| 方法 | 用途 |
|------|------|
| `captureScreenshot(x, y, w, h)` | 捕获指定区域截图 |
| `onProcessScreenshot(callback)` | 监听截图完成事件 |
| `onTranslationComplete(callback)` | 监听翻译完成事件 |
| `performOCR(imageData)` | 在主进程执行 OCR |

### 翻译引擎

支持四种翻译服务，通过 `localStorage` 存储配置:
- **Microsoft** (默认): `translator_api_key`, `translator_region`, `translator_endpoint`
- **Google**: `google_translate_api_key`
- **Baidu**: `baidu_translate_app_id`, `baidu_translate_app_key`
- **Youdao**: `youdao_translate_app_key`, `youdao_translate_app_secret`

### 状态管理

使用 Zustand (`src/store/appStore.ts`) 管理全局状态:
- `ocrText`: OCR 识别文本
- `translatedText`: 翻译结果
- `imageData`: 截图 base64 数据

### 关键依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| electron | ^28.2.0 | 桌面应用框架 |
| react | ^18.2.0 | UI 框架 |
| vite | ^5.1.0 | 渲染进程构建 |
| tesseract.js | ^5.0.5 | OCR 文字识别 |
| zustand | ^4.5.0 | 状态管理 |

## 文件结构要点

```
src/
├── main.ts              # Electron 主进程入口
├── preload.ts           # 预加载脚本，暴露 IPC API
├── renderer.tsx         # 渲染进程入口
├── App.tsx              # 主应用组件
├── components/
│   ├── ScreenshotTool.tsx   # 截图交互组件
│   └── SettingsPanel.tsx    # API 配置面板
├── services/
│   ├── ocrService.ts        # Tesseract.js OCR
│   ├── translationService.ts # 多引擎翻译
│   └── imageManager.ts      # localStorage 历史管理
├── store/appStore.ts        # Zustand 状态
└── i18n/                    # 国际化 (中文)
```

## 配置 API

在应用设置面板或通过环境变量配置:
- Microsoft: `TRANSLATOR_API_KEY`, `TRANSLATOR_REGION`, `TRANSLATOR_ENDPOINT`