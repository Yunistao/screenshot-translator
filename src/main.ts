import { app, BrowserWindow, Menu, ipcMain, desktopCapturer, globalShortcut, nativeImage, screen } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let screenshotOverlayWindow: BrowserWindow | null = null;
let pinWindows: Set<BrowserWindow> = new Set();
let screenshotOverlayActive = false;
let overlayEscapeShortcutRegistered = false;
let shouldRestoreMainWindowAfterScreenshot = false;

// 鍒ゆ柇鏄惁涓哄紑鍙戞ā寮?
const isDev = () => process.env.NODE_ENV === 'development' || !app.isPackaged;
const shouldOpenDevTools = () =>
  isDev() && process.env.ENABLE_DEVTOOLS === '1' && process.env.DISABLE_DEVTOOLS !== '1';
const isE2EMockOverlay = () => process.env.E2E_MOCK_OVERLAY === '1';
const MOCK_SCREENSHOT_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9oN2l6sAAAAASUVORK5CYII=';
const OVERLAY_ESC_SHORTCUT = 'Escape';

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

  if (!targetWindow.isMinimized()) {
    shouldRestoreMainWindowAfterScreenshot = true;
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

function closeScreenshotOverlayWindow() {
  if (screenshotOverlayWindow) {
    screenshotOverlayWindow.close();
    return;
  }
  setScreenshotOverlayActive(false);
}

function openScreenshotOverlayWithImage(imageData: string) {
  createScreenshotOverlayWindow();
  screenshotOverlayWindow?.webContents.once('did-finish-load', () => {
    screenshotOverlayWindow?.webContents.send('screenshot-captured', imageData);
  });
}

function createWindow() {
  console.log('Creating window...');
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    resizable: true,
    show: true
  });

  // 鍔犺浇娓叉煋杩涚▼
  console.log('Loading renderer process...');

  // 寮€鍙戞ā寮忥細鍔犺浇 Vite 寮€鍙戞湇鍔″櫒
  // 鐢熶骇妯″紡锛氬姞杞芥瀯寤哄悗鐨勯潤鎬佹枃浠?

  if (isDev()) {
    // 绛夊緟 Vite 寮€鍙戞湇鍔″櫒鍚姩
    const viteUrl = 'http://localhost:5173';
    console.log(`Loading Vite dev server: ${viteUrl}`);
    mainWindow.loadURL(viteUrl);
  } else {
    mainWindow.loadFile('index.html');
  }

  // 寮€鍙戠幆澧冧笅鎵撳紑寮€鍙戣€呭伐鍏?
  if (shouldOpenDevTools()) {
    mainWindow.webContents.openDevTools();
  }

  // 鐩戝惉绐楀彛鍏抽棴浜嬩欢
  mainWindow.on('closed', () => {
    console.log('Window closed');
    mainWindow = null;
  });

  // 璁剧疆涓枃鑿滃崟
  console.log('Setting up menu...');
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '鏂囦欢',
      submenu: [
        {
          label: '閫€鍑?',
          accelerator: 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: '缂栬緫',
      submenu: [
        {
          label: '鎾ら攢',
          accelerator: 'Ctrl+Z',
          role: 'undo'
        },
        {
          label: '閲嶅仛',
          accelerator: 'Ctrl+Y',
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          label: '鍓垏',
          accelerator: 'Ctrl+X',
          role: 'cut'
        },
        {
          label: '澶嶅埗',
          accelerator: 'Ctrl+C',
          role: 'copy'
        },
        {
          label: '绮樿创',
          accelerator: 'Ctrl+V',
          role: 'paste'
        },
        {
          label: '鍏ㄩ€?',
          accelerator: 'Ctrl+A',
          role: 'selectAll'
        }
      ]
    },
    {
      label: '鏌ョ湅',
      submenu: [
        {
          label: '閲嶆柊鍔犺浇',
          accelerator: 'Ctrl+R',
          click: () => mainWindow?.reload()
        },
        {
          label: '寮哄埗閲嶆柊鍔犺浇',
          accelerator: 'Ctrl+Shift+R',
          click: () => mainWindow?.webContents.reloadIgnoringCache()
        },
        {
          type: 'separator'
        },
        {
          label: '寮€鍙戣€呭伐鍏?',
          accelerator: 'Ctrl+Shift+I',
          click: () => mainWindow?.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: '绐楀彛',
      submenu: [
        {
          label: '鏈€灏忓寲',
          accelerator: 'Ctrl+M',
          role: 'minimize'
        },
        {
          label: '鍏抽棴',
          accelerator: 'Ctrl+W',
          role: 'close'
        }
      ]
    },
    {
      label: '甯姪',
      submenu: [
        {
          label: '鍏充簬',
          click: () => {
            // 鍙互娣诲姞鍏充簬瀵硅瘽妗?
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  console.log('Window created successfully');
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

// 灏濊瘯娉ㄥ唽蹇嵎閿紝濡傛灉澶辫触鍒欏皾璇曞鐢ㄥ揩鎹烽敭
function tryRegisterShortcut(shortcutKey: string): boolean {
  try {
    // 鍏堟敞閿€鏃у揩鎹烽敭
    if (currentShortcut) {
      globalShortcut.unregister(currentShortcut);
    }

    const success = globalShortcut.register(shortcutKey, async () => {
      minimizeMainWindowForScreenshot();

      if (isE2EMockOverlay()) {
        openScreenshotOverlayWithImage(MOCK_SCREENSHOT_IMAGE);
        return;
      }

      const imageData = await captureScreen();
      if (imageData) {
        openScreenshotOverlayWithImage(imageData);
      } else {
        restoreMainWindowAfterScreenshot();
      }
    });

    if (success) {
      currentShortcut = shortcutKey;
      shortcutRegistered = true;
      console.log(`蹇嵎閿敞鍐屾垚鍔? ${shortcutKey}`);
      // 閫氱煡娓叉煋杩涚▼
      mainWindow?.webContents.send('shortcut-status', { registered: true, shortcut: shortcutKey });
      return true;
    } else {
      console.warn(`蹇嵎閿敞鍐屽け璐? ${shortcutKey} (鍙兘琚叾浠栧簲鐢ㄥ崰鐢?`);
      shortcutRegistered = false;
      mainWindow?.webContents.send('shortcut-status', { registered: false, shortcut: shortcutKey, error: '蹇嵎閿鍏朵粬搴旂敤鍗犵敤' });
      return false;
    }
  } catch (error) {
    console.error('娉ㄥ唽蹇嵎閿椂鍑洪敊:', error);
    shortcutRegistered = false;
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

ipcMain.on('update-shortcut', (_event, shortcutKey: string) => {
  if (shortcutKey && shortcutKey.trim()) {
    tryRegisterShortcut(shortcutKey.trim());
  }
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
    },
  });

  // 鍔犺浇瑕嗙洊绐楀彛椤甸潰锛堝甫鏈?overlay 鏌ヨ鍙傛暟锛?
  if (isDev()) {
    screenshotOverlayWindow.loadURL('http://localhost:5173?overlay=true');
  } else {
    screenshotOverlayWindow.loadFile('index.html', { query: { overlay: 'true' } });
  }

  // 寮€鍙戞ā寮忎笅鎵撳紑寮€鍙戣€呭伐鍏?
  if (shouldOpenDevTools()) {
    screenshotOverlayWindow.webContents.openDevTools({ mode: 'detach' });
  }

  screenshotOverlayWindow.on('closed', () => {
    screenshotOverlayWindow = null;
    setScreenshotOverlayActive(false);
    restoreMainWindowAfterScreenshot();
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
  minimizeMainWindowForScreenshot();

  if (isE2EMockOverlay()) {
    openScreenshotOverlayWithImage(MOCK_SCREENSHOT_IMAGE);
    return true;
  }

  const imageData = await captureScreen();
  if (imageData) {
    openScreenshotOverlayWithImage(imageData);

    return true;
  }

  restoreMainWindowAfterScreenshot();
  return false;
});

ipcMain.handle('minimize-current-window', async (event) => {
  minimizeWindowForScreenshot(BrowserWindow.fromWebContents(event.sender));
  return true;
});

// IPC: 鍏抽棴鎴浘瑕嗙洊绐楀彛
ipcMain.handle('close-screenshot-overlay', () => {
  closeScreenshotOverlayWindow();
});

ipcMain.handle('get-screenshot-overlay-status', () => {
  return { active: screenshotOverlayActive };
});

// IPC: 鑾峰彇鎴浘瑕嗙洊绐楀彛鐨勬埅鍥炬暟鎹?
ipcMain.handle('get-overlay-screenshot', async () => {
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 鍔犺浇缃《绐楀彛椤甸潰锛堝甫鏈?pin 鏌ヨ鍙傛暟锛?
  const params = new URLSearchParams({ pin: 'true' });
  if (isDev()) {
    pinWindow.loadURL(`http://localhost:5173?${params.toString()}`);
  } else {
    pinWindow.loadFile('index.html', { query: { pin: 'true' } });
  }

  pinWindow.on('closed', () => {
    pinWindows.delete(pinWindow);
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

  // 娉ㄥ唽鍏ㄥ眬蹇嵎閿紙甯﹀鐢ㄩ€夐」锛?
  registerShortcutWithFallback();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  // 娉ㄩ攢鎵€鏈夊揩鎹烽敭
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});




