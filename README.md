# 截图翻译小工具

一款便捷的截图翻译工具，支持OCR文字识别和多语言翻译功能。

## 功能特点

- **截图功能**：使用 `Alt+S` 快捷键快速截图
- **OCR识别**：自动识别截图中的文字内容
- **智能翻译**：支持多种语言互译
- **历史记录**：保存翻译历史便于查阅
- **自定义设置**：可配置快捷键、翻译语言等参数
- **置顶显示**：翻译结果窗口可保持置顶

## 技术架构

- 应用框架: Electron
- 前端: React + TypeScript
- OCR引擎: Tesseract.js
- 翻译服务: 微软翻译API
- 构建工具: Vite
- 状态管理: Zustand

## 安装依赖

```bash
npm install
```

## 开发运行

```bash
npm run dev
```

## 构建应用

```bash
npm run build
```

## 配置翻译API

要使用翻译功能，请配置微软翻译API：

1. 注册Azure账号并获取翻译API密钥
2. 在应用设置中输入API密钥和区域信息
3. 点击保存即可使用

## 使用方法

1. 启动应用
2. 按 `Alt+S` 开始截图
3. 拖拽选择需要翻译的区域
4. 松开鼠标完成截图
5. 应用将自动进行OCR识别和翻译
6. 查看翻译结果

## 文件结构

```
src/
├── main.ts                 # Electron主进程
├── renderer.tsx           # 渲染进程入口
├── App.tsx                # 主应用组件
├── components/            # 组件目录
│   ├── ScreenshotTool.tsx # 截图工具组件
│   └── SettingsPanel.tsx  # 设置面板组件
├── services/              # 服务目录
│   ├── ocrService.ts      # OCR识别服务
│   ├── translationService.ts # 翻译服务
│   └── imageManager.ts    # 图片管理服务
├── store/                 # 状态管理
│   └── appStore.ts        # 应用状态
├── utils/                 # 工具目录
│   └── keyListener.ts     # 全局热键监听
└── index.css              # 样式文件
```

## 环境要求

- Node.js >= 16
- npm 或 yarn

## 许可证

MIT