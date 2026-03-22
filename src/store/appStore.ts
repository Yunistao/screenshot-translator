import { create } from 'zustand';
import { SelectionArea, Annotation, LanguagePair, LLMConfig, OCRLine } from '../types/electron';

interface AppState {
  ocrText: string;
  translatedText: string;
  imageData: string | null;
  isProcessing: boolean;
  error: string | null;

  selectionArea: SelectionArea | null;
  isSelecting: boolean;
  screenshotImage: string | null;

  annotations: Annotation[];
  currentAnnotationType: 'rectangle' | 'arrow' | 'brush' | 'text';
  annotationColor: string;

  languagePair: LanguagePair;
  llmConfig: LLMConfig | null;

  showToolbar: boolean;
  toolbarPosition: { x: number; y: number };

  isPinned: boolean;

  showTranslationResult: boolean;
  translationDisplayMode: 'inline' | 'list';

  ocrLines: OCRLine[];
  setOcrLines: (lines: OCRLine[]) => void;
  updateOcrLineTranslation: (index: number, translatedText: string) => void;

  setOcrText: (text: string) => void;
  setTranslatedText: (text: string) => void;
  setImageData: (data: string | null) => void;
  setIsProcessing: (value: boolean) => void;
  setError: (error: string | null) => void;

  setSelectionArea: (area: SelectionArea | null) => void;
  setIsSelecting: (value: boolean) => void;
  setScreenshotImage: (image: string | null) => void;

  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  setCurrentAnnotationType: (type: 'rectangle' | 'arrow' | 'brush' | 'text') => void;
  setAnnotationColor: (color: string) => void;

  setLanguagePair: (pair: LanguagePair) => void;
  setLLMConfig: (config: LLMConfig | null) => void;

  setShowToolbar: (show: boolean) => void;
  setToolbarPosition: (pos: { x: number; y: number }) => void;

  setIsPinned: (pinned: boolean) => void;

  setShowTranslationResult: (show: boolean) => void;
  setTranslationDisplayMode: (mode: 'inline' | 'list') => void;

  clearAll: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  ocrText: '',
  translatedText: '',
  imageData: null,
  isProcessing: false,
  error: null,

  selectionArea: null,
  isSelecting: false,
  screenshotImage: null,

  annotations: [],
  currentAnnotationType: 'rectangle',
  annotationColor: '#ff0000',

  languagePair: { source: 'auto', target: 'zh-Hans' },
  llmConfig: null,

  showToolbar: false,
  toolbarPosition: { x: 0, y: 0 },

  isPinned: false,

  showTranslationResult: false,
  translationDisplayMode: 'inline',

  ocrLines: [],
  setOcrLines: (lines) => set({ ocrLines: lines }),
  updateOcrLineTranslation: (index, translatedText) =>
    set((state) => ({
      ocrLines: state.ocrLines.map((line, i) =>
        i === index ? { ...line, translatedText } : line,
      ),
    })),

  setOcrText: (text) => set({ ocrText: text }),
  setTranslatedText: (text) => set({ translatedText: text }),
  setImageData: (data) => set({ imageData: data }),
  setIsProcessing: (value) => set({ isProcessing: value }),
  setError: (error) => set({ error }),

  setSelectionArea: (area) => set({ selectionArea: area }),
  setIsSelecting: (value) => set({ isSelecting: value }),
  setScreenshotImage: (image) => set({ screenshotImage: image }),

  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [...state.annotations, annotation],
    })),
  updateAnnotation: (id, updates) =>
    set((state) => ({
      annotations: state.annotations.map((annotation) =>
        annotation.id === id ? { ...annotation, ...updates } : annotation,
      ),
    })),
  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((annotation) => annotation.id !== id),
    })),
  clearAnnotations: () => set({ annotations: [] }),
  setCurrentAnnotationType: (type) => set({ currentAnnotationType: type }),
  setAnnotationColor: (color) => set({ annotationColor: color }),

  setLanguagePair: (pair) => set({ languagePair: pair }),
  setLLMConfig: (config) => set({ llmConfig: config }),

  setShowToolbar: (show) => set({ showToolbar: show }),
  setToolbarPosition: (pos) => set({ toolbarPosition: pos }),

  setIsPinned: (pinned) => set({ isPinned: pinned }),

  setShowTranslationResult: (show) => set({ showTranslationResult: show }),
  setTranslationDisplayMode: (mode) => set({ translationDisplayMode: mode }),

  clearAll: () =>
    set({
      ocrText: '',
      translatedText: '',
      ocrLines: [],
      imageData: null,
      isProcessing: false,
      error: null,
      selectionArea: null,
      isSelecting: false,
      screenshotImage: null,
      annotations: [],
      showToolbar: false,
      isPinned: false,
      showTranslationResult: false,
      translationDisplayMode: 'inline',
    }),
}));

if (typeof window !== 'undefined') {
  (window as typeof window & { __APP_STORE__?: typeof useAppStore }).__APP_STORE__ = useAppStore;
}

