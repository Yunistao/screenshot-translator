import { create } from 'zustand';
import { SelectionArea, Annotation, LanguagePair, LLMConfig } from '../types/electron';

interface AppState {
  // OCR 和翻译结果
  ocrText: string;
  translatedText: string;
  imageData: string | null;
  isProcessing: boolean;
  error: string | null;

  // 截图选择状态
  selectionArea: SelectionArea | null;
  isSelecting: boolean;
  screenshotImage: string | null;

  // 标注状态
  annotations: Annotation[];
  currentAnnotationType: 'rectangle' | 'arrow' | 'brush' | 'text';
  annotationColor: string;

  // 语言设置
  languagePair: LanguagePair;

  // LLM 配置
  llmConfig: LLMConfig | null;

  // 工具栏状态
  showToolbar: boolean;
  toolbarPosition: { x: number; y: number };

  // 置顶窗口状态
  isPinned: boolean;

  // OCR 和翻译结果操作
  setOcrText: (text: string) => void;
  setTranslatedText: (text: string) => void;
  setImageData: (data: string | null) => void;
  setIsProcessing: (value: boolean) => void;
  setError: (error: string | null) => void;

  // 截图选择操作
  setSelectionArea: (area: SelectionArea | null) => void;
  setIsSelecting: (value: boolean) => void;
  setScreenshotImage: (image: string | null) => void;

  // 标注操作
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  setCurrentAnnotationType: (type: 'rectangle' | 'arrow' | 'brush' | 'text') => void;
  setAnnotationColor: (color: string) => void;

  // 语言设置操作
  setLanguagePair: (pair: LanguagePair) => void;

  // LLM 配置操作
  setLLMConfig: (config: LLMConfig | null) => void;

  // 工具栏操作
  setShowToolbar: (show: boolean) => void;
  setToolbarPosition: (pos: { x: number; y: number }) => void;

  // 置顶窗口操作
  setIsPinned: (pinned: boolean) => void;

  // 清除所有状态
  clearAll: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // OCR 和翻译结果
  ocrText: '',
  translatedText: '',
  imageData: null,
  isProcessing: false,
  error: null,

  // 截图选择状态
  selectionArea: null,
  isSelecting: false,
  screenshotImage: null,

  // 标注状态
  annotations: [],
  currentAnnotationType: 'rectangle',
  annotationColor: '#ff0000',

  // 语言设置
  languagePair: { source: 'auto', target: 'zh-Hans' },

  // LLM 配置
  llmConfig: null,

  // 工具栏状态
  showToolbar: false,
  toolbarPosition: { x: 0, y: 0 },

  // 置顶窗口状态
  isPinned: false,

  // OCR 和翻译结果操作
  setOcrText: (text) => set({ ocrText: text }),
  setTranslatedText: (text) => set({ translatedText: text }),
  setImageData: (data) => set({ imageData: data }),
  setIsProcessing: (value) => set({ isProcessing: value }),
  setError: (error) => set({ error: error }),

  // 截图选择操作
  setSelectionArea: (area) => set({ selectionArea: area }),
  setIsSelecting: (value) => set({ isSelecting: value }),
  setScreenshotImage: (image) => set({ screenshotImage: image }),

  // 标注操作
  addAnnotation: (annotation) => set((state) => ({
    annotations: [...state.annotations, annotation]
  })),
  updateAnnotation: (id, updates) => set((state) => ({
    annotations: state.annotations.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    )
  })),
  removeAnnotation: (id) => set((state) => ({
    annotations: state.annotations.filter((a) => a.id !== id)
  })),
  clearAnnotations: () => set({ annotations: [] }),
  setCurrentAnnotationType: (type) => set({ currentAnnotationType: type }),
  setAnnotationColor: (color) => set({ annotationColor: color }),

  // 语言设置操作
  setLanguagePair: (pair) => set({ languagePair: pair }),

  // LLM 配置操作
  setLLMConfig: (config) => set({ llmConfig: config }),

  // 工具栏操作
  setShowToolbar: (show) => set({ showToolbar: show }),
  setToolbarPosition: (pos) => set({ toolbarPosition: pos }),

  // 置顶窗口操作
  setIsPinned: (pinned) => set({ isPinned: pinned }),

  // 清除所有状态
  clearAll: () => set({
    ocrText: '',
    translatedText: '',
    imageData: null,
    isProcessing: false,
    error: null,
    selectionArea: null,
    isSelecting: false,
    screenshotImage: null,
    annotations: [],
    showToolbar: false,
    isPinned: false
  }),
}));