import { app, BrowserWindow, Menu, Tray, ipcMain, desktopCapturer, globalShortcut, nativeImage, screen } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let screenshotOverlayWindow: BrowserWindow | null = null;
let pinWindows: Set<BrowserWindow> = new Set();
let tray: Tray | null = null;
let isQuitting = false;
let screenshotOverlayActive = false;
let overlayEscapeShortcutRegistered = false;
let shouldRestoreMainWindowAfterScreenshot = false;
let restoreMainWindowOnOverlayClose = true;
let overlayOpenRequestId = 0;
let overlayOpenCanceledUpToId = 0;
let latestOverlayScreenshot: string | null = null;

// 鍒ゆ柇鏄惁涓哄紑鍙戞ā寮?
const isDev = () => process.env.NODE_ENV === 'development' || !app.isPackaged;
const isE2EMockOverlay = () => process.env.E2E_MOCK_OVERLAY === '1';
const shouldShowMainWindowForE2E = () => process.env.E2E_SHOW_MAIN_WINDOW === '1';
const shouldDisableTrayForE2E = () => process.env.E2E_DISABLE_TRAY === '1';
const e2eOverlayOpenDelayMs = Math.max(0, Number(process.env.E2E_OVERLAY_OPEN_DELAY_MS ?? '0'));
const MOCK_SCREENSHOT_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9oN2l6sAAAAASUVORK5CYII=';
const OVERLAY_ESC_SHORTCUT = 'Escape';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOverlayOpenCanceled(requestId: number): boolean {
  return requestId <= overlayOpenCanceledUpToId;
}

function registerOverlayEscapeShortcut() {
  if (overlayEscapeShortcutRegistered) {
    return;
  }

  const success = globalShortcut.register(OVERLAY_ESC_SHORTCUT, () => {
    if (screenshotOverlayActive) {
      closeScreenshotOverlayWindow();
    }
  });

  if (success) {
    overlayEscapeShortcutRegistered = true;
  } else {
    console.warn('Esc shortcut registration failed for screenshot overlay fallback.');
  }
}

function unregisterOverlayEscapeShortcut() {
  if (!overlayEscapeShortcutRegistered) {
    return;
  }

  globalShortcut.unregister(OVERLAY_ESC_SHORTCUT);
  overlayEscapeShortcutRegistered = false;
}

function setScreenshotOverlayActive(active: boolean) {
  screenshotOverlayActive = active;

  if (active) {
    registerOverlayEscapeShortcut();
  } else {
    unregisterOverlayEscapeShortcut();
  }

  mainWindow?.webContents.send('screenshot-overlay-status', { active });
}

function minimizeWindowForScreenshot(targetWindow: BrowserWindow | null) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  if (!targetWindow.isVisible()) {
    return;
  }

  if (!targetWindow.isMinimized()) {
    if (targetWindow === mainWindow) {
      shouldRestoreMainWindowAfterScreenshot = true;
    }
    targetWindow.minimize();
    setImmediate(() => {
      if (
        shouldRestoreMainWindowAfterScreenshot &&
        targetWindow &&
        !targetWindow.isDestroyed() &&
        !targetWindow.isMinimized() &&
        targetWindow.isVisible()
      ) {
        targetWindow.hide();
      }
    });
  }
}

function minimizeMainWindowForScreenshot() {
  minimizeWindowForScreenshot(mainWindow);
}

function restoreMainWindowAfterScreenshot() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    shouldRestoreMainWindowAfterScreenshot = false;
    return;
  }

  if (!shouldRestoreMainWindowAfterScreenshot) {
    return;
  }

  shouldRestoreMainWindowAfterScreenshot = false;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.focus();
  mainWindow.webContents.focus();
}

function closeScreenshotOverlayWindow(options?: { restoreMainWindow?: boolean }) {
  restoreMainWindowOnOverlayClose = options?.restoreMainWindow ?? true;
  overlayOpenCanceledUpToId = overlayOpenRequestId;
  latestOverlayScreenshot = null;
  if (screenshotOverlayWindow) {
    screenshotOverlayWindow.close();
    return;
  }
  if (restoreMainWindowOnOverlayClose) {
    restoreMainWindowAfterScreenshot();
  }
  setScreenshotOverlayActive(false);
}

function openScreenshotOverlayWithImage(imageData: string, requestId?: number): boolean {
  if (requestId !== undefined && isOverlayOpenCanceled(requestId)) {
    return false;
  }

  latestOverlayScreenshot = imageData;
  createScreenshotOverlayWindow();
  if (!screenshotOverlayWindow) {
    latestOverlayScreenshot = null;
    return false;
  }

  screenshotOverlayWindow?.webContents.once('did-finish-load', () => {
    if (requestId !== undefined && isOverlayOpenCanceled(requestId)) {
      closeScreenshotOverlayWindow({ restoreMainWindow: true });
      return;
    }
    screenshotOverlayWindow?.webContents.send('screenshot-captured', imageData);
  });

  return true;
}

function getRendererUrl(query?: Record<string, string>): string {
  const baseUrl = 'http://localhost:5173';
  if (!query || Object.keys(query).length === 0) {
    return baseUrl;
  }

  const searchParams = new URLSearchParams(query);
  return `${baseUrl}?${searchParams.toString()}`;
}

function getRendererHtmlPath(): string {
  return path.join(__dirname, '../dist/index.html');
}

function loadRendererWindow(targetWindow: BrowserWindow, query?: Record<string, string>) {
  if (isDev()) {
    targetWindow.loadURL(getRendererUrl(query));
    return;
  }

  targetWindow.loadFile(getRendererHtmlPath(), { query });
}

function attachRendererDiagnostics(targetWindow: BrowserWindow, windowName: string) {
  targetWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      console.error(
        `[${windowName}] did-fail-load code=${errorCode} mainFrame=${isMainFrame} url=${validatedURL} error=${errorDescription}`,
      );
    },
  );

  targetWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(
      `[${windowName}] render-process-gone reason=${details.reason} exitCode=${details.exitCode}`,
    );
  });

  targetWindow.webContents.on('console-message', (_event, _level, message) => {
    console.log('[renderer]', message);
  });

  targetWindow.on('unresponsive', () => {
    console.error(`[${windowName}] window became unresponsive`);
  });

  targetWindow.on('responsive', () => {
    console.log(`[${windowName}] window became responsive again`);
  });
}

function showMainWindow(options?: { openRecentResult?: boolean }) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.focus();

  if (!options?.openRecentResult) {
    return;
  }

  const openRecentResult = () => mainWindow?.webContents.send('open-recent-result');
  if (mainWindow.webContents.isLoadingMainFrame()) {
    mainWindow.webContents.once('did-finish-load', openRecentResult);
  } else {
    openRecentResult();
  }
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    width: 420,
    height: 620,
    minWidth: 380,
    minHeight: 520,
    autoHideMenuBar: true,
    resizable: true,
    show: false,
    title: '设置',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
    },
  });
  attachRendererDiagnostics(settingsWindow, 'settings-window');

  loadRendererWindow(settingsWindow, { settings: 'true' });

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
    settingsWindow?.focus();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

function createWindow() {
  const showOnStart = shouldShowMainWindowForE2E();

  mainWindow = new BrowserWindow({
    width: 320,
    height: 200,
    minWidth: 280,
    minHeight: 160,
    maxWidth: 400,
    maxHeight: 300,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
    },
    resizable: true,
    show: showOnStart,
    title: 'Screenshot Translator',
  });
  attachRendererDiagnostics(mainWindow, 'main-window');

  loadRendererWindow(mainWindow);

  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return;
    }
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '\u6587\u4ef6',
      submenu: [
        {
          label: '\u6253\u5f00\u4e3b\u754c\u9762',
          click: () => showMainWindow(),
        },
        {
          label: '\u6253\u5f00\u8bbe\u7f6e',
          click: () => createSettingsWindow(),
        },
        {
          type: 'separator',
        },
        {
          label: '\u9000\u51fa',
          accelerator: 'Ctrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ],
    },
    {
      label: '\u7f16\u8f91',
      submenu: [
        { label: '\u64a4\u9500', accelerator: 'Ctrl+Z', role: 'undo' },
        { label: '\u91cd\u505a', accelerator: 'Ctrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: '\u526a\u5207', accelerator: 'Ctrl+X', role: 'cut' },
        { label: '\u590d\u5236', accelerator: 'Ctrl+C', role: 'copy' },
        { label: '\u7c98\u8d34', accelerator: 'Ctrl+V', role: 'paste' },
        { label: '\u5168\u9009', accelerator: 'Ctrl+A', role: 'selectAll' },
      ],
    },
    {
      label: '\u67e5\u770b',
      submenu: [
        {
          label: '\u91cd\u65b0\u52a0\u8f7d',
          accelerator: 'Ctrl+R',
          click: () => mainWindow?.reload(),
        },
        {
          label: '\u5f3a\u5236\u91cd\u65b0\u52a0\u8f7d',
          accelerator: 'Ctrl+Shift+R',
          click: () => mainWindow?.webContents.reloadIgnoringCache(),
        },
      ],
    },
    {
      label: '\u7a97\u53e3',
      submenu: [
        { label: '\u6700\u5c0f\u5316', accelerator: 'Ctrl+M', role: 'minimize' },
        { label: '\u5173\u95ed', accelerator: 'Ctrl+W', role: 'close' },
      ],
    },
    {
      label: '\u5e2e\u52a9',
      submenu: [
        {
          label: '\u5173\u4e8e',
          enabled: false,
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// IPC 澶勭悊鍣細璇锋眰鍏ㄥ睆鎴浘锛堟敮鎸佸鏄剧ず鍣級
ipcMain.handle('request-screenshot', async () => {
  try {
    const displays = screen.getAllDisplays();

    // 璁＄畻鎵€鏈夋樉绀哄櫒鐨勬€昏竟鐣?
    let maxX = 0;
    let maxY = 0;

    for (const display of displays) {
      const displayRight = display.bounds.x + display.bounds.width;
      const displayBottom = display.bounds.y + display.bounds.height;
      if (displayRight > maxX) maxX = displayRight;
      if (displayBottom > maxY) maxY = displayBottom;
    }

    // 浣跨敤瀹為檯灞忓箷灏哄鑰岄潪 workAreaSize
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxX, height: maxY }
    });

    if (sources.length > 0) {
      return sources[0].thumbnail.toDataURL();
    }
    return null;
  } catch (error) {
    console.error('鎴浘澶辫触:', error);
    return null;
  }
});

// IPC 澶勭悊鍣細鍖哄煙鎴浘锛堟敮鎸佸鏄剧ず鍣級
ipcMain.handle('capture-screenshot', async (_event, x: number, y: number, width: number, height: number) => {
  try {
    // 鍙傛暟楠岃瘉
    if (width <= 0 || height <= 0) {
      console.error('鍖哄煙鎴浘澶辫触: 鏃犳晥鐨勫昂瀵稿弬鏁?');
      return null;
    }

    const displays = screen.getAllDisplays();

    // 璁＄畻鎵€鏈夋樉绀哄櫒鐨勬€昏竟鐣?
    let maxX = 0;
    let maxY = 0;

    for (const display of displays) {
      const displayRight = display.bounds.x + display.bounds.width;
      const displayBottom = display.bounds.y + display.bounds.height;
      if (displayRight > maxX) maxX = displayRight;
      if (displayBottom > maxY) maxY = displayBottom;
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxX, height: maxY }
    });

    if (sources.length > 0) {
      const thumbnail = sources[0].thumbnail;
      const cropped = thumbnail.crop({ x, y, width, height });
      return cropped.toDataURL();
    }
    return null;
  } catch (error) {
    console.error('鍖哄煙鎴浘澶辫触:', error);
    return null;
  }
});

// IPC 澶勭悊鍣細鏇存柊蹇嵎閿?
let currentShortcut = '';
let shortcutRegistered = false;

function hideAuxiliaryWindowsForScreenshot() {
  if (settingsWindow && !settingsWindow.isDestroyed() && settingsWindow.isVisible()) {
    settingsWindow.hide();
  }
}

async function requestOpenScreenshotOverlay(): Promise<boolean> {
  minimizeMainWindowForScreenshot();
  hideAuxiliaryWindowsForScreenshot();
  const requestId = ++overlayOpenRequestId;

  if (e2eOverlayOpenDelayMs > 0) {
    await sleep(e2eOverlayOpenDelayMs);
  }

  if (isOverlayOpenCanceled(requestId)) {
    restoreMainWindowAfterScreenshot();
    return false;
  }

  if (isE2EMockOverlay()) {
    return openScreenshotOverlayWithImage(MOCK_SCREENSHOT_IMAGE, requestId);
  }

  const imageData = await captureScreen();
  if (isOverlayOpenCanceled(requestId)) {
    restoreMainWindowAfterScreenshot();
    return false;
  }

  if (imageData) {
    return openScreenshotOverlayWithImage(imageData, requestId);
  }

  restoreMainWindowAfterScreenshot();
  return false;
}

// 灏濊瘯娉ㄥ唽蹇嵎閿紝濡傛灉澶辫触鍒欏皾璇曞鐢ㄥ揩鎹烽敭
function tryRegisterShortcut(shortcutKey: string): boolean {
  try {
    // 鍏堟敞閿€鏃у揩鎹烽敭
    if (currentShortcut) {
      globalShortcut.unregister(currentShortcut);
    }

    const success = globalShortcut.register(shortcutKey, async () => {
      await requestOpenScreenshotOverlay();
    });

    if (success) {
      currentShortcut = shortcutKey;
      shortcutRegistered = true;
      console.log(`蹇嵎閿敞鍐屾垚鍔? ${shortcutKey}`);
      // 閫氱煡娓叉煋杩涚▼
      mainWindow?.webContents.send('shortcut-status', { registered: true, shortcut: shortcutKey });
      updateTrayMenu();
      return true;
    } else {
      console.warn(`蹇嵎閿敞鍐屽け璐? ${shortcutKey} (鍙兘琚叾浠栧簲鐢ㄥ崰鐢?`);
      shortcutRegistered = false;
      mainWindow?.webContents.send('shortcut-status', { registered: false, shortcut: shortcutKey, error: '蹇嵎閿鍏朵粬搴旂敤鍗犵敤' });
      updateTrayMenu();
      return false;
    }
  } catch (error) {
    console.error('娉ㄥ唽蹇嵎閿椂鍑洪敊:', error);
    shortcutRegistered = false;
    updateTrayMenu();
    return false;
  }
}

// 娉ㄥ唽蹇嵎閿紝灏濊瘯澶氫釜澶囩敤閫夐」
function registerShortcutWithFallback() {
  // 浼樺厛绾у垪琛細灏濊瘯澶氫釜蹇嵎閿?
  const shortcuts = ['Alt+S', 'Alt+D', 'Ctrl+Shift+S', 'Ctrl+Alt+S'];

  for (const shortcut of shortcuts) {
    if (tryRegisterShortcut(shortcut)) {
      return true;
    }
  }

  console.warn('鎵€鏈夊揩鎹烽敭閮芥敞鍐屽け璐ワ紝璇锋墜鍔ㄨ缃?');
  return false;
}

function resolveTrayIcon() {
  const candidates = [
    path.join(app.getAppPath(), 'public', 'icon.png'),
    path.join(process.resourcesPath, 'public', 'icon.png'),
    path.join(process.resourcesPath, 'icon.png'),
  ];

  for (const candidate of candidates) {
    try {
      if (!candidate || !fs.existsSync(candidate)) {
        continue;
      }

      const image = nativeImage.createFromPath(candidate);
      if (!image.isEmpty()) {
        return image;
      }
    } catch (error) {
      console.warn('Failed to load tray icon:', error);
    }
  }

  const fallback = nativeImage.createFromPath(process.execPath);
  if (!fallback.isEmpty()) {
    return fallback;
  }

  return nativeImage.createFromDataURL(MOCK_SCREENSHOT_IMAGE);
}

function updateTrayMenu() {
  if (!tray) {
    return;
  }

  const shortcutHint = currentShortcut
    ? `快捷键：${currentShortcut}`
    : '快捷键：未注册';

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: '\u5f00\u59cb\u622a\u56fe',
      click: () => {
        void requestOpenScreenshotOverlay();
      },
    },
    {
      label: '\u4e3b\u754c\u9762',
      click: () => showMainWindow({ openRecentResult: true }),
    },
    {
      label: '\u8bbe\u7f6e',
      click: () => createSettingsWindow(),
    },
    {
      label: shortcutHint,
      enabled: false,
    },
    {
      label: '\u9000\u51fa',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ];

  tray.setToolTip('Screenshot Translator');
  tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));
}

function setupTray() {
  if (tray || shouldDisableTrayForE2E()) {
    return;
  }

  tray = new Tray(resolveTrayIcon());
  tray.on('click', () => {
    void requestOpenScreenshotOverlay();
  });
  tray.on('right-click', () => {
    tray?.popUpContextMenu();
  });

  updateTrayMenu();
}

ipcMain.on('update-shortcut', (_event, shortcutKey: string) => {
  const nextShortcut = shortcutKey?.trim() || 'Alt+S';
  tryRegisterShortcut(nextShortcut);
});

// IPC 澶勭悊鍣細鏌ヨ蹇嵎閿姸鎬?
ipcMain.handle('get-shortcut-status', () => {
  return {
    registered: shortcutRegistered,
    shortcut: currentShortcut
  };
});

// ========== 鎴浘瑕嗙洊绐楀彛 ==========

// 鎹曡幏灞忓箷骞舵墦寮€鎴浘瑕嗙洊绐楀彛
async function captureScreen(): Promise<string | null> {
  try {
    const displays = screen.getAllDisplays();

    // 璁＄畻鎵€鏈夋樉绀哄櫒鐨勬€昏竟鐣?
    let maxX = 0;
    let maxY = 0;

    for (const display of displays) {
      const displayRight = display.bounds.x + display.bounds.width;
      const displayBottom = display.bounds.y + display.bounds.height;
      if (displayRight > maxX) maxX = displayRight;
      if (displayBottom > maxY) maxY = displayBottom;
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxX, height: maxY }
    });

    if (sources.length > 0) {
      return sources[0].thumbnail.toDataURL();
    }
    return null;
  } catch (error) {
    console.error('鎹曡幏灞忓箷澶辫触:', error);
    return null;
  }
}

// 鍒涘缓鎴浘瑕嗙洊绐楀彛
function createScreenshotOverlayWindow() {
  if (screenshotOverlayWindow) {
    screenshotOverlayWindow.removeAllListeners('closed');
    screenshotOverlayWindow.close();
    screenshotOverlayWindow = null;
  }

  restoreMainWindowOnOverlayClose = true;

  const { width, height } = screen.getPrimaryDisplay().bounds;

  screenshotOverlayWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    show: false,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
    },
  });
  attachRendererDiagnostics(screenshotOverlayWindow, 'overlay-window');

  loadRendererWindow(screenshotOverlayWindow, { overlay: 'true' });

  // 寮€鍙戞ā寮忎笅鎵撳紑寮€鍙戣€呭伐鍏?

  screenshotOverlayWindow.on('closed', () => {
    screenshotOverlayWindow = null;
    latestOverlayScreenshot = null;
    setScreenshotOverlayActive(false);
    if (restoreMainWindowOnOverlayClose) {
      restoreMainWindowAfterScreenshot();
    }
    restoreMainWindowOnOverlayClose = true;
  });

  screenshotOverlayWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      closeScreenshotOverlayWindow();
    }
  });

  screenshotOverlayWindow.once('ready-to-show', () => {
    if (!screenshotOverlayWindow) {
      return;
    }
    screenshotOverlayWindow.show();
    screenshotOverlayWindow.focus();
    screenshotOverlayWindow.webContents.focus();
  });

  // 璁剧疆涓哄彲鐐瑰嚮绌块€忥紙闄や簡鏈夊唴瀹圭殑鍖哄煙锛?
  screenshotOverlayWindow.setIgnoreMouseEvents(false);
  setScreenshotOverlayActive(true);
}

// IPC: 鎹曡幏灞忓箷
ipcMain.handle('capture-screen', async () => {
  return await captureScreen();
});

// IPC: 鎵撳紑鎴浘瑕嗙洊绐楀彛
ipcMain.handle('open-screenshot-overlay', async () => {
  return await requestOpenScreenshotOverlay();
});

ipcMain.handle('minimize-current-window', async (event) => {
  minimizeWindowForScreenshot(BrowserWindow.fromWebContents(event.sender));
  return true;
});

// IPC: 鍏抽棴鎴浘瑕嗙洊绐楀彛
ipcMain.handle('close-screenshot-overlay', (_event, options?: { restoreMainWindow?: boolean }) => {
  closeScreenshotOverlayWindow(options);
});

ipcMain.handle('get-screenshot-overlay-status', () => {
  return { active: screenshotOverlayActive };
});

// IPC: 鑾峰彇鎴浘瑕嗙洊绐楀彛鐨勬埅鍥炬暟鎹?
ipcMain.handle('get-overlay-screenshot', async () => {
  if (latestOverlayScreenshot) {
    return latestOverlayScreenshot;
  }
  return await captureScreen();
});

// ========== 缃《绐楀彛 ==========

function getPinWindowSize(imageData: string): { width: number; height: number } {
  const image = nativeImage.createFromDataURL(imageData);
  const imageSize = image.getSize();
  const workArea = screen.getPrimaryDisplay().workAreaSize;

  const maxWidth = Math.max(240, Math.floor(workArea.width * 0.6));
  const maxHeight = Math.max(160, Math.floor(workArea.height * 0.6));
  const sourceWidth = Math.max(1, imageSize.width);
  const sourceHeight = Math.max(1, imageSize.height);
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);

  return {
    width: Math.max(180, Math.round(sourceWidth * scale)),
    height: Math.max(120, Math.round(sourceHeight * scale)),
  };
}

// 鍒涘缓缃《绐楀彛
function createPinWindow(imageData: string, ocrText?: string, translatedText?: string) {
  const pinSize = getPinWindowSize(imageData);

  const pinWindow = new BrowserWindow({
    width: pinSize.width,
    height: pinSize.height,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    minimizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
    },
  });
  attachRendererDiagnostics(pinWindow, 'pin-window');

  loadRendererWindow(pinWindow, { pin: 'true' });


  pinWindow.on('closed', () => {
    pinWindows.delete(pinWindow);
  });

  pinWindow.on('minimize', () => {
    // Keep pinned windows visible even when "Show Desktop" is triggered.
    setTimeout(() => {
      if (pinWindow.isDestroyed()) {
        return;
      }

      if (pinWindow.isMinimized()) {
        pinWindow.restore();
      }

      pinWindow.setAlwaysOnTop(true, 'screen-saver');
      pinWindow.moveTop();
      pinWindow.showInactive();
    }, 0);
  });

  pinWindows.add(pinWindow);

  // 绐楀彛鍔犺浇瀹屾垚鍚庡彂閫佹暟鎹?
  pinWindow.webContents.once('did-finish-load', () => {
    pinWindow.webContents.send('pin-window-data', {
      imageData,
      ocrText: ocrText || '',
      translatedText: translatedText || ''
    });
  });

  return pinWindow;
}

// IPC: 鍒涘缓缃《绐楀彛
ipcMain.handle('create-pin-window', async (_event, imageData: string, ocrText?: string, translatedText?: string) => {
  createPinWindow(imageData, ocrText, translatedText);
  return true;
});

// IPC: 璁剧疆绐楀彛缃《
ipcMain.handle('set-always-on-top', async (_event, windowId: number, alwaysOnTop: boolean) => {
  const win = BrowserWindow.fromId(windowId);
  if (win) {
    win.setAlwaysOnTop(alwaysOnTop);
    return true;
  }
  return false;
});

// IPC: 鍏抽棴缃《绐楀彛
ipcMain.handle('close-pin-window', async (_event, windowId: number) => {
  const win = BrowserWindow.fromId(windowId);
  if (win) {
    win.close();
    return true;
  }
  return false;
});

// IPC: 鍏抽棴褰撳墠绐楀彛锛堢敤浜庣疆椤剁獥鍙ｏ級
ipcMain.handle('close-current-window', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
    return true;
  }
  return false;
});

ipcMain.handle('move-current-window', async (event, x: number, y: number) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return false;
  }

  win.setPosition(Math.round(x), Math.round(y), false);
  return true;
});

ipcMain.handle('resize-current-window', async (event, width: number, height: number) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return false;
  }

  const nextWidth = Math.max(1, Math.round(width));
  const nextHeight = Math.max(1, Math.round(height));

  const [currentX, currentY] = win.getPosition();
  const [currentWidth, currentHeight] = win.getSize();

  // Keep visual center stable while scaling.
  const nextX = currentX + Math.round((currentWidth - nextWidth) / 2);
  const nextY = currentY + Math.round((currentHeight - nextHeight) / 2);

  win.setBounds(
    {
      x: nextX,
      y: nextY,
      width: nextWidth,
      height: nextHeight,
    },
    false,
  );

  return true;
});

app.whenReady().then(() => {
  createWindow();
  setupTray();

  // 娉ㄥ唽鍏ㄥ眬蹇嵎閿紙甯﹀鐢ㄩ€夐」锛?
  registerShortcutWithFallback();

  app.on('activate', function () {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }
    showMainWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  // 娉ㄩ攢鎵€鏈夊揩鎹烽敭
  globalShortcut.unregisterAll();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});






