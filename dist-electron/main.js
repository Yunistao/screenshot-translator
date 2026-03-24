"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let mainWindow = null;
let settingsWindow = null;
let screenshotOverlayWindow = null;
let pinWindows = new Set();
let tray = null;
let isQuitting = false;
let screenshotOverlayActive = false;
let overlayEscapeShortcutRegistered = false;
let shouldRestoreMainWindowAfterScreenshot = false;
let restoreMainWindowOnOverlayClose = true;
let overlayOpenRequestId = 0;
let overlayOpenCanceledUpToId = 0;
let latestOverlayScreenshot = null;
const isDev = () => process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
const isE2EMockOverlay = () => process.env.E2E_MOCK_OVERLAY === '1';
const shouldShowMainWindowForE2E = () => process.env.E2E_SHOW_MAIN_WINDOW === '1';
const shouldDisableTrayForE2E = () => process.env.E2E_DISABLE_TRAY === '1';
const e2eOverlayOpenDelayMs = Math.max(0, Number(process.env.E2E_OVERLAY_OPEN_DELAY_MS ?? '0'));
const MOCK_SCREENSHOT_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9oN2l6sAAAAASUVORK5CYII=';
const OVERLAY_ESC_SHORTCUT = 'Escape';
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isOverlayOpenCanceled(requestId) {
    return requestId <= overlayOpenCanceledUpToId;
}
function registerOverlayEscapeShortcut() {
    if (overlayEscapeShortcutRegistered) {
        return;
    }
    const success = electron_1.globalShortcut.register(OVERLAY_ESC_SHORTCUT, () => {
        if (screenshotOverlayActive) {
            closeScreenshotOverlayWindow();
        }
    });
    if (success) {
        overlayEscapeShortcutRegistered = true;
    }
    else {
        console.warn('Esc shortcut registration failed for screenshot overlay fallback.');
    }
}
function unregisterOverlayEscapeShortcut() {
    if (!overlayEscapeShortcutRegistered) {
        return;
    }
    electron_1.globalShortcut.unregister(OVERLAY_ESC_SHORTCUT);
    overlayEscapeShortcutRegistered = false;
}
function setScreenshotOverlayActive(active) {
    screenshotOverlayActive = active;
    if (active) {
        registerOverlayEscapeShortcut();
    }
    else {
        unregisterOverlayEscapeShortcut();
    }
    mainWindow?.webContents.send('screenshot-overlay-status', { active });
}
function minimizeWindowForScreenshot(targetWindow) {
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
            if (shouldRestoreMainWindowAfterScreenshot &&
                targetWindow &&
                !targetWindow.isDestroyed() &&
                !targetWindow.isMinimized() &&
                targetWindow.isVisible()) {
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
function closeScreenshotOverlayWindow(options) {
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
function openScreenshotOverlayWithImage(imageData, requestId) {
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
function getRendererUrl(query) {
    const baseUrl = 'http://localhost:5173';
    if (!query || Object.keys(query).length === 0) {
        return baseUrl;
    }
    const searchParams = new URLSearchParams(query);
    return `${baseUrl}?${searchParams.toString()}`;
}
function getRendererHtmlPath() {
    return path.join(__dirname, '../dist/index.html');
}
function loadRendererWindow(targetWindow, query) {
    if (isDev()) {
        targetWindow.loadURL(getRendererUrl(query));
        return;
    }
    targetWindow.loadFile(getRendererHtmlPath(), { query });
}
function attachRendererDiagnostics(targetWindow, windowName) {
    targetWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        console.error(`[${windowName}] did-fail-load code=${errorCode} mainFrame=${isMainFrame} url=${validatedURL} error=${errorDescription}`);
    });
    targetWindow.webContents.on('render-process-gone', (_event, details) => {
        console.error(`[${windowName}] render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
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
function showMainWindow(options) {
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
    }
    else {
        openRecentResult();
    }
}
function createSettingsWindow() {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.show();
        settingsWindow.focus();
        return settingsWindow;
    }
    settingsWindow = new electron_1.BrowserWindow({
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
            devTools: false,
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
    mainWindow = new electron_1.BrowserWindow({
        width: 380,
        height: 360,
        minWidth: 340,
        minHeight: 320,
        maxWidth: 520,
        maxHeight: 620,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            devTools: false,
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
    const template = [
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
                        electron_1.app.quit();
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
    electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate(template));
}
electron_1.ipcMain.handle('request-screenshot', async () => {
    try {
        const displays = electron_1.screen.getAllDisplays();
        let maxX = 0;
        let maxY = 0;
        for (const display of displays) {
            const displayRight = display.bounds.x + display.bounds.width;
            const displayBottom = display.bounds.y + display.bounds.height;
            if (displayRight > maxX)
                maxX = displayRight;
            if (displayBottom > maxY)
                maxY = displayBottom;
        }
        const sources = await electron_1.desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: maxX, height: maxY }
        });
        if (sources.length > 0) {
            return sources[0].thumbnail.toDataURL();
        }
        return null;
    }
    catch (error) {
        console.error('鎴浘澶辫触:', error);
        return null;
    }
});
electron_1.ipcMain.handle('capture-screenshot', async (_event, x, y, width, height) => {
    try {
        if (width <= 0 || height <= 0) {
            console.error('鍖哄煙鎴浘澶辫触: 鏃犳晥鐨勫昂瀵稿弬鏁?');
            return null;
        }
        const displays = electron_1.screen.getAllDisplays();
        let maxX = 0;
        let maxY = 0;
        for (const display of displays) {
            const displayRight = display.bounds.x + display.bounds.width;
            const displayBottom = display.bounds.y + display.bounds.height;
            if (displayRight > maxX)
                maxX = displayRight;
            if (displayBottom > maxY)
                maxY = displayBottom;
        }
        const sources = await electron_1.desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: maxX, height: maxY }
        });
        if (sources.length > 0) {
            const thumbnail = sources[0].thumbnail;
            const cropped = thumbnail.crop({ x, y, width, height });
            return cropped.toDataURL();
        }
        return null;
    }
    catch (error) {
        console.error('鍖哄煙鎴浘澶辫触:', error);
        return null;
    }
});
let currentShortcut = '';
let shortcutRegistered = false;
function hideAuxiliaryWindowsForScreenshot() {
    if (settingsWindow && !settingsWindow.isDestroyed() && settingsWindow.isVisible()) {
        settingsWindow.hide();
    }
}
async function requestOpenScreenshotOverlay() {
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
function tryRegisterShortcut(shortcutKey) {
    try {
        if (currentShortcut) {
            electron_1.globalShortcut.unregister(currentShortcut);
        }
        const success = electron_1.globalShortcut.register(shortcutKey, async () => {
            await requestOpenScreenshotOverlay();
        });
        if (success) {
            currentShortcut = shortcutKey;
            shortcutRegistered = true;
            console.log(`蹇嵎閿敞鍐屾垚鍔? ${shortcutKey}`);
            mainWindow?.webContents.send('shortcut-status', { registered: true, shortcut: shortcutKey });
            updateTrayMenu();
            return true;
        }
        else {
            console.warn(`蹇嵎閿敞鍐屽け璐? ${shortcutKey} (鍙兘琚叾浠栧簲鐢ㄥ崰鐢?`);
            shortcutRegistered = false;
            mainWindow?.webContents.send('shortcut-status', { registered: false, shortcut: shortcutKey, error: '蹇嵎閿鍏朵粬搴旂敤鍗犵敤' });
            updateTrayMenu();
            return false;
        }
    }
    catch (error) {
        console.error('娉ㄥ唽蹇嵎閿椂鍑洪敊:', error);
        shortcutRegistered = false;
        updateTrayMenu();
        return false;
    }
}
function registerShortcutWithFallback() {
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
        path.join(electron_1.app.getAppPath(), 'public', 'icon.png'),
        path.join(process.resourcesPath, 'public', 'icon.png'),
        path.join(process.resourcesPath, 'icon.png'),
    ];
    for (const candidate of candidates) {
        try {
            if (!candidate || !fs.existsSync(candidate)) {
                continue;
            }
            const image = electron_1.nativeImage.createFromPath(candidate);
            if (!image.isEmpty()) {
                return image;
            }
        }
        catch (error) {
            console.warn('Failed to load tray icon:', error);
        }
    }
    const fallback = electron_1.nativeImage.createFromPath(process.execPath);
    if (!fallback.isEmpty()) {
        return fallback;
    }
    return electron_1.nativeImage.createFromDataURL(MOCK_SCREENSHOT_IMAGE);
}
function updateTrayMenu() {
    if (!tray) {
        return;
    }
    const shortcutHint = currentShortcut
        ? `快捷键：${currentShortcut}`
        : '快捷键：未注册';
    const menuTemplate = [
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
                electron_1.app.quit();
            },
        },
    ];
    tray.setToolTip('Screenshot Translator');
    tray.setContextMenu(electron_1.Menu.buildFromTemplate(menuTemplate));
}
function setupTray() {
    if (tray || shouldDisableTrayForE2E()) {
        return;
    }
    tray = new electron_1.Tray(resolveTrayIcon());
    tray.on('click', () => {
        void requestOpenScreenshotOverlay();
    });
    tray.on('right-click', () => {
        tray?.popUpContextMenu();
    });
    updateTrayMenu();
}
electron_1.ipcMain.on('update-shortcut', (_event, shortcutKey) => {
    const nextShortcut = shortcutKey?.trim() || 'Alt+S';
    tryRegisterShortcut(nextShortcut);
});
electron_1.ipcMain.handle('get-shortcut-status', () => {
    return {
        registered: shortcutRegistered,
        shortcut: currentShortcut
    };
});
async function captureScreen() {
    try {
        const displays = electron_1.screen.getAllDisplays();
        let maxX = 0;
        let maxY = 0;
        for (const display of displays) {
            const displayRight = display.bounds.x + display.bounds.width;
            const displayBottom = display.bounds.y + display.bounds.height;
            if (displayRight > maxX)
                maxX = displayRight;
            if (displayBottom > maxY)
                maxY = displayBottom;
        }
        const sources = await electron_1.desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: maxX, height: maxY }
        });
        if (sources.length > 0) {
            return sources[0].thumbnail.toDataURL();
        }
        return null;
    }
    catch (error) {
        console.error('鎹曡幏灞忓箷澶辫触:', error);
        return null;
    }
}
function createScreenshotOverlayWindow() {
    if (screenshotOverlayWindow) {
        screenshotOverlayWindow.removeAllListeners('closed');
        screenshotOverlayWindow.close();
        screenshotOverlayWindow = null;
    }
    restoreMainWindowOnOverlayClose = true;
    const { width, height } = electron_1.screen.getPrimaryDisplay().bounds;
    screenshotOverlayWindow = new electron_1.BrowserWindow({
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
            devTools: false,
        },
    });
    attachRendererDiagnostics(screenshotOverlayWindow, 'overlay-window');
    loadRendererWindow(screenshotOverlayWindow, { overlay: 'true' });
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
    screenshotOverlayWindow.setIgnoreMouseEvents(false);
    setScreenshotOverlayActive(true);
}
electron_1.ipcMain.handle('capture-screen', async () => {
    return await captureScreen();
});
electron_1.ipcMain.handle('open-screenshot-overlay', async () => {
    return await requestOpenScreenshotOverlay();
});
electron_1.ipcMain.handle('minimize-current-window', async (event) => {
    minimizeWindowForScreenshot(electron_1.BrowserWindow.fromWebContents(event.sender));
    return true;
});
electron_1.ipcMain.handle('close-screenshot-overlay', (_event, options) => {
    closeScreenshotOverlayWindow(options);
});
electron_1.ipcMain.handle('get-screenshot-overlay-status', () => {
    return { active: screenshotOverlayActive };
});
electron_1.ipcMain.handle('get-overlay-screenshot', async () => {
    if (latestOverlayScreenshot) {
        return latestOverlayScreenshot;
    }
    return await captureScreen();
});
function getPinWindowSize(imageData) {
    const image = electron_1.nativeImage.createFromDataURL(imageData);
    const imageSize = image.getSize();
    const workArea = electron_1.screen.getPrimaryDisplay().workAreaSize;
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
function createPinWindow(imageData, ocrText, translatedText) {
    const pinSize = getPinWindowSize(imageData);
    const pinWindow = new electron_1.BrowserWindow({
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
            devTools: false,
        },
    });
    attachRendererDiagnostics(pinWindow, 'pin-window');
    loadRendererWindow(pinWindow, { pin: 'true' });
    pinWindow.on('closed', () => {
        pinWindows.delete(pinWindow);
    });
    pinWindow.on('minimize', () => {
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
    pinWindow.webContents.once('did-finish-load', () => {
        pinWindow.webContents.send('pin-window-data', {
            imageData,
            ocrText: ocrText || '',
            translatedText: translatedText || ''
        });
    });
    return pinWindow;
}
electron_1.ipcMain.handle('create-pin-window', async (_event, imageData, ocrText, translatedText) => {
    createPinWindow(imageData, ocrText, translatedText);
    return true;
});
electron_1.ipcMain.handle('set-always-on-top', async (_event, windowId, alwaysOnTop) => {
    const win = electron_1.BrowserWindow.fromId(windowId);
    if (win) {
        win.setAlwaysOnTop(alwaysOnTop);
        return true;
    }
    return false;
});
electron_1.ipcMain.handle('close-pin-window', async (_event, windowId) => {
    const win = electron_1.BrowserWindow.fromId(windowId);
    if (win) {
        win.close();
        return true;
    }
    return false;
});
electron_1.ipcMain.handle('close-current-window', async (event) => {
    const win = electron_1.BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.close();
        return true;
    }
    return false;
});
electron_1.ipcMain.handle('move-current-window', async (event, x, y) => {
    const win = electron_1.BrowserWindow.fromWebContents(event.sender);
    if (!win) {
        return false;
    }
    win.setPosition(Math.round(x), Math.round(y), false);
    return true;
});
electron_1.ipcMain.handle('resize-current-window', async (event, width, height) => {
    const win = electron_1.BrowserWindow.fromWebContents(event.sender);
    if (!win) {
        return false;
    }
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    const [currentX, currentY] = win.getPosition();
    const [currentWidth, currentHeight] = win.getSize();
    const nextX = currentX + Math.round((currentWidth - nextWidth) / 2);
    const nextY = currentY + Math.round((currentHeight - nextHeight) / 2);
    win.setBounds({
        x: nextX,
        y: nextY,
        width: nextWidth,
        height: nextHeight,
    }, false);
    return true;
});
electron_1.app.whenReady().then(() => {
    createWindow();
    setupTray();
    registerShortcutWithFallback();
    electron_1.app.on('activate', function () {
        if (!mainWindow || mainWindow.isDestroyed()) {
            createWindow();
            return;
        }
        showMainWindow();
    });
});
electron_1.app.on('before-quit', () => {
    isQuitting = true;
});
electron_1.app.on('will-quit', () => {
    electron_1.globalShortcut.unregisterAll();
    if (tray) {
        tray.destroy();
        tray = null;
    }
});
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin' && isQuitting) {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=main.js.map