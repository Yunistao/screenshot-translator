import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Screenshot related
  onScreenshotRequest: (callback: () => void) => ipcRenderer.on('screenshot-request', callback),
  offScreenshotRequest: () => ipcRenderer.removeAllListeners('screenshot-request'),
  onProcessScreenshot: (callback: (imageData: string) => void) =>
    ipcRenderer.on('process-screenshot', (_event, imageData) => callback(imageData)),
  requestScreenshot: () => ipcRenderer.invoke('request-screenshot'),
  captureScreenshot: (x: number, y: number, width: number, height: number) => ipcRenderer.invoke('capture-screenshot', x, y, width, height),

  // Translation related
  onTranslationComplete: (callback: (imageData: string, translatedText: string) => void) =>
    ipcRenderer.on('translation-complete', (_event, imageData, translatedText) => callback(imageData, translatedText)),
  sendTranslationResult: (imageData: string, translatedText: string) =>
    ipcRenderer.send('translation-complete', imageData, translatedText),

  // OCR related
  performOCR: (imageData: string) => ipcRenderer.invoke('perform-ocr', imageData),
});