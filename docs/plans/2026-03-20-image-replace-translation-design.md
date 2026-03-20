# 图像替换翻译功能设计文档

> **创建日期**: 2026-03-20
> **状态**: 待实现

## 概述

在现有截图翻译应用基础上，新增「图像替换」模式：将截图中的英文文字替换为中文翻译，并输出到剪贴板。

## 需求规格

| 项目 | 规格 |
|------|------|
| 触发方式 | 快捷键 → 用户拖选区域 |
| OCR 引擎 | Tesseract.js（保持现有） |
| 翻译引擎 | Microsoft / Google / Baidu / Youdao / **DeepL**（新增） |
| 语言对 | 固定英文 → 中文 |
| 输出方式 | 复制到剪贴板 |

## 用户操作流程

1. 用户按下快捷键（如 Alt+D）启动截图
2. 用户拖选截图区域，松开鼠标
3. 工具栏出现，用户点击「翻译」按钮
4. 系统自动执行：
   - OCR 识别英文文字及位置
   - 调用翻译 API 翻译每行文字
   - 生成图像副本，用矩形色块覆盖原文区域
   - 在覆盖区域绘制译文
   - 将处理后的图片复制到剪贴板
5. 显示简短提示「已复制到剪贴板」，窗口自动关闭

## 图像替换算法

### 核心处理步骤

1. **获取 OCR 行级数据**
   - 使用 `performOCRWithLines()` 获取每行文字的 bbox（边界框）
   - bbox 包含 `{x0, y0, x1, y1}` 坐标

2. **计算覆盖区域**
   - 对每行 OCR 结果，根据 bbox 扩展 2-4px 边距
   - 获取覆盖区域的背景色（取 bbox 四角像素的中位色或平均值）

3. **绘制覆盖层**
   - 在原图副本上，用计算出的背景色填充矩形区域
   - 确保完全覆盖原文

4. **绘制译文**
   - 字体：系统默认中文字体（Microsoft YaHei、PingFang SC）
   - 字号：根据 bbox 高度自动计算（约 bbox 高度的 80%）
   - 颜色：深色（#333）或与背景对比色
   - 位置：水平居中于 bbox，垂直居中或略偏上

5. **输出到剪贴板**
   - 使用 Canvas API 导出为 PNG Blob
   - 通过 `navigator.clipboard.write()` 写入剪贴板

## 架构设计

### 模块划分

```
src/
├── services/
│   ├── imageReplacer.ts      # 新增：图像替换核心逻辑
│   └── translationService.ts  # 修改：新增 DeepL 引擎
│
├── components/
│   └── ToolBar.tsx           # 修改：调整翻译按钮逻辑
│
├── store/
│   └── appStore.ts           # 修改：新增 outputMode 状态
│
└── types/
    └── electron.d.ts         # 修改：新增相关类型
```

### 模块职责

| 模块 | 职责 |
|------|------|
| `imageReplacer.ts` | 接收裁剪图像 + OCR 行数据 + 译文，生成替换后的图像 |
| `translationService.ts` | 新增 `translateDeepL()` 函数 |
| `ToolBar.tsx` | 根据设置模式执行图像替换或显示悬浮层 |
| `appStore.ts` | 新增 `outputMode` 状态 |

### 数据流

```
截图区域 → cropImage() → performOCRWithLines() → translateText()
    ↓
imageReplacer.replaceText() → clipboard.write()
```

## DeepL 翻译集成

### API 规格

- 端点：`https://api.deepl.com/v2/translate`（Pro）或 `https://api-free.deepl.com/v2/translate`（Free）
- 认证：`Authorization: DeepL-Auth-Key <key>`
- 参数：`source_lang=EN`, `target_lang=ZH`, `text=...`

### 接口设计

```typescript
interface DeepLConfig {
  apiKey: string;
  useFreeApi: boolean;
}

export async function translateDeepL(
  text: string,
  sourceLang: string,
  targetLang: string,
  config: DeepLConfig
): Promise<string>
```

## 配置存储

### 新增配置项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `outputMode` | `'overlay' \| 'replace'` | `'replace'` | 输出模式 |
| `translatorEngine` | `string` | `'microsoft'` | 翻译引擎 |
| `deeplApiKey` | `string` | `''` | DeepL API Key |
| `deeplUseFreeApi` | `boolean` | `true` | 使用 DeepL 免费端点 |

### 存储结构

```typescript
interface AppSettings {
  // 现有配置...
  translatorEngine: 'microsoft' | 'google' | 'baidu' | 'youdao' | 'deepl';
  outputMode: 'overlay' | 'replace';
  deeplApiKey?: string;
  deeplUseFreeApi?: boolean;
}
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| OCR 未识别到文字 | 提示「未识别到文字」，不执行后续步骤 |
| 翻译 API 失败 | 提示「翻译失败：{错误原因}」，保留原文图像 |
| 复制到剪贴板失败 | 提示「复制失败」，图像显示在悬浮层 |
| DeepL API Key 未配置 | 选择 DeepL 引擎时提示「请先配置 DeepL API Key」 |

### 边界情况

1. **译文过长**：自动缩小字号或换行
2. **bbox 重叠**：按识别顺序依次处理
3. **背景色检测失败**：使用白色背景，深色字体
4. **中文字体缺失**：降级使用系统默认 sans-serif 字体

### 用户反馈

- 处理过程显示加载状态
- 完成后显示 Toast 提示「已复制到剪贴板」，1.5 秒后消失