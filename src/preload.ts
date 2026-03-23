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

  // Screenshot overlay related
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  minimizeCurrentWindow: () => ipcRenderer.invoke('minimize-current-window'),
  openScreenshotOverlay: () => ipcRenderer.invoke('open-screenshot-overlay'),
  closeScreenshotOverlay: (options?: { restoreMainWindow?: boolean }) =>
    ipcRenderer.invoke('close-screenshot-overlay', options),
  getScreenshotOverlayStatus: () => ipcRenderer.invoke('get-screenshot-overlay-status'),
  onScreenshotOverlayStatus: (callback: (status: { active: boolean }) => void) =>
    ipcRenderer.on('screenshot-overlay-status', (_event, status) => callback(status)),
  offScreenshotOverlayStatus: () => ipcRenderer.removeAllListeners('screenshot-overlay-status'),
  onScreenshotCaptured: (callback: (imageData: string) => void) =>
    ipcRenderer.on('screenshot-captured', (_event, imageData) => callback(imageData)),
  offScreenshotCaptured: () => ipcRenderer.removeAllListeners('screenshot-captured'),
  getOverlayScreenshot: () => ipcRenderer.invoke('get-overlay-screenshot'),

  // Translation related
  onTranslationComplete: (callback: (imageData: string, translatedText: string) => void) =>
    ipcRenderer.on('translation-complete', (_event, imageData, translatedText) => callback(imageData, translatedText)),
  offTranslationComplete: () => ipcRenderer.removeAllListeners('translation-complete'),
  onOpenRecentResult: (callback: () => void) =>
    ipcRenderer.on('open-recent-result', () => callback()),
  offOpenRecentResult: () => ipcRenderer.removeAllListeners('open-recent-result'),
  sendTranslationResult: (imageData: string, translatedText: string) =>
    ipcRenderer.send('translation-complete', imageData, translatedText),

  // OCR related
  performOCR: (imageData: string) => ipcRenderer.invoke('perform-ocr', imageData),

  // Shortcut related
  updateShortcut: (shortcutKey: string) => ipcRenderer.send('update-shortcut', shortcutKey),
  getShortcutStatus: () => ipcRenderer.invoke('get-shortcut-status'),
  onShortcutStatus: (callback: (status: { registered: boolean; shortcut: string; error?: string }) => void) =>
    ipcRenderer.on('shortcut-status', (_event, status) => callback(status)),
  offShortcutStatus: () => ipcRenderer.removeAllListeners('shortcut-status'),

  // Pin window related
  createPinWindow: (imageData: string, ocrText?: string, translatedText?: string) =>
    ipcRenderer.invoke('create-pin-window', imageData, ocrText, translatedText),
  setAlwaysOnTop: (windowId: number, alwaysOnTop: boolean) =>
    ipcRenderer.invoke('set-always-on-top', windowId, alwaysOnTop),
  closePinWindow: (windowId: number) =>
    ipcRenderer.invoke('close-pin-window', windowId),
  closeCurrentWindow: () =>
    ipcRenderer.invoke('close-current-window'),
  moveCurrentWindow: (x: number, y: number) =>
    ipcRenderer.invoke('move-current-window', x, y),
  resizeCurrentWindow: (width: number, height: number) =>
    ipcRenderer.invoke('resize-current-window', width, height),
  onPinWindowData: (callback: (data: { imageData: string; ocrText: string; translatedText: string }) => void) =>
    ipcRenderer.on('pin-window-data', (_event, data) => callback(data)),
  offPinWindowData: () => ipcRenderer.removeAllListeners('pin-window-data'),
});
