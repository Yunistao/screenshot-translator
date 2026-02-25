# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

截图翻译工具 - 一个基于 Electron + React + TypeScript 的截图 OCR 识别与翻译应用。

## 常用命令

```bash
# 开发运行
npm run dev

# 构建应用
npm run build

# 分别构建主进程和渲染进程
npm run build:main   # 编译 Electron 主进程 (TypeScript -> dist/main.js)
npm run build:renderer  # 编译渲染进程 (Vite)

# 打包安装包
npm run dist         # 构建所有平台
npm run dist:win     # 构建 Windows 安装包
npm run dist:mac     # 构建 macOS 安装包
npm run dist:linux   # 构建 Linux 安装包

# 直接运行 Electron
npm start
```

## 技术架构

### 进程模型
- **主进程** (`src/main.ts`): Electron 主进程，管理窗口、全局快捷键 (Alt+S)、截图捕获、IPC 通信
- **预加载脚本** (`src/preload.ts`): 通过 contextBridge 安全暴露 IPC API 到渲染进程
- **渲染进程**: React 应用，处理 UI 和业务逻辑

### 前端架构
```
src/
├── components/          # React 组件
│   ├── ScreenshotTool.tsx  # 截图工具组件
│   └── SettingsPanel.tsx  # 设置面板
├── services/            # 业务服务
│   ├── ocrService.ts       # Tesseract.js OCR 识别
│   ├── translationService.ts  # 微软翻译 API
│   └── imageManager.ts    # 图片历史管理 (localStorage)
├── store/               # 状态管理
│   └── appStore.ts       # Zustand 状态管理
├── i18n/                # 国际化
│   ├── I18nContext.tsx
│   └── zh-CN.ts
├── main.ts              # Electron 主进程入口
├── preload.ts           # 预加载脚本
├── renderer.tsx         # 渲染进程入口
└── App.tsx              # 主应用组件
```

### 关键依赖
- **electron**: ^28.2.0 - 桌面应用框架
- **react**: ^18.2.0 + TypeScript - UI 框架
- **vite**: ^5.1.0 - 渲染进程构建工具
- **tesseract.js**: ^5.0.5 - OCR 文字识别
- **@azure-rest/ai-translation-text**: ^1.0.0 - 微软翻译 API
- **zustand**: ^4.5.0 - 轻量级状态管理

### 通信流程
1. 用户按下 Alt+S → 主进程捕获截图
2. 截图数据通过 IPC 发送到渲染进程
3. 渲染进程调用 ocrService 进行 OCR 识别
4. 识别结果调用 translationService 翻译
5. 结果存储到 imageManager (localStorage)
6. 显示翻译结果

## 配置翻译 API

需要配置微软 Azure 翻译 API:
- 在 SettingsPanel 中输入 API Key、Region 和 Endpoint
- 或设置环境变量: TRANSLATOR_API_KEY, TRANSLATOR_REGION, TRANSLATOR_ENDPOINT
