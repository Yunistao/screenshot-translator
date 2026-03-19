// Electron API 类型声明

interface ShortcutStatus {
  registered: boolean;
  shortcut: string;
  error?: string;
}

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

interface ElectronAPI {
  // 截图相关
  onScreenshotRequest: (callback: () => void) => void;
  offScreenshotRequest: () => void;
  onProcessScreenshot: (callback: (imageData: string) => void) => void;
  requestScreenshot: () => Promise<string | null>;
  captureScreenshot: (x: number, y: number, width: number, height: number) => Promise<string | null>;

  // 翻译相关
  onTranslationComplete: (callback: (imageData: string, translatedText: string) => void) => void;
  offTranslationComplete: () => void;
  sendTranslationResult: (imageData: string, translatedText: string) => void;

  // OCR 相关
  performOCR: (imageData: string) => Promise<string>;

  // 快捷键相关
  updateShortcut: (shortcutKey: string) => void;
  getShortcutStatus: () => Promise<ShortcutStatus>;
  onShortcutStatus: (callback: (status: ShortcutStatus) => void) => void;
  offShortcutStatus: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};