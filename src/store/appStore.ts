import { create } from 'zustand';

interface AppState {
  ocrText: string;
  translatedText: string;
  imageData: string | null;
  setOcrText: (text: string) => void;
  setTranslatedText: (text: string) => void;
  setImageData: (data: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  ocrText: '',
  translatedText: '',
  imageData: null,
  setOcrText: (text) => set({ ocrText: text }),
  setTranslatedText: (text) => set({ translatedText: text }),
  setImageData: (data) => set({ imageData: data }),
}));