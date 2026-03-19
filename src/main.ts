import { app, BrowserWindow, Menu, ipcMain, desktopCapturer, globalShortcut, screen } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let screenshotOverlayWindow: BrowserWindow | null = null;
let pinWindows: Set<BrowserWindow> = new Set();

// 判断是否为开发模式
const isDev = () => process.env.NODE_ENV === 'development' || !app.isPackaged;

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

  // 加载渲染进程
  console.log('Loading renderer process...');

  // 开发模式：加载 Vite 开发服务器
  // 生产模式：加载构建后的静态文件

  if (isDev()) {
    // 等待 Vite 开发服务器启动
    const viteUrl = 'http://localhost:5173';
    console.log(`Loading Vite dev server: ${viteUrl}`);
    mainWindow.loadURL(viteUrl);
  } else {
    mainWindow.loadFile('index.html');
  }

  // 开发环境下打开开发者工具
  mainWindow.webContents.openDevTools();

  // 监听窗口关闭事件
  mainWindow.on('closed', () => {
    console.log('Window closed');
    mainWindow = null;
  });

  // 设置中文菜单
  console.log('Setting up menu...');
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        {
          label: '撤销',
          accelerator: 'Ctrl+Z',
          role: 'undo'
        },
        {
          label: '重做',
          accelerator: 'Ctrl+Y',
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          label: '剪切',
          accelerator: 'Ctrl+X',
          role: 'cut'
        },
        {
          label: '复制',
          accelerator: 'Ctrl+C',
          role: 'copy'
        },
        {
          label: '粘贴',
          accelerator: 'Ctrl+V',
          role: 'paste'
        },
        {
          label: '全选',
          accelerator: 'Ctrl+A',
          role: 'selectAll'
        }
      ]
    },
    {
      label: '查看',
      submenu: [
        {
          label: '重新加载',
          accelerator: 'Ctrl+R',
          click: () => mainWindow?.reload()
        },
        {
          label: '强制重新加载',
          accelerator: 'Ctrl+Shift+R',
          click: () => mainWindow?.webContents.reloadIgnoringCache()
        },
        {
          type: 'separator'
        },
        {
          label: '开发者工具',
          accelerator: 'Ctrl+Shift+I',
          click: () => mainWindow?.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: '窗口',
      submenu: [
        {
          label: '最小化',
          accelerator: 'Ctrl+M',
          role: 'minimize'
        },
        {
          label: '关闭',
          accelerator: 'Ctrl+W',
          role: 'close'
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            // 可以添加关于对话框
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  console.log('Window created successfully');
}

// IPC 处理器：请求全屏截图（支持多显示器）
ipcMain.handle('request-screenshot', async () => {
  try {
    const displays = screen.getAllDisplays();

    // 计算所有显示器的总边界
    let maxX = 0;
    let maxY = 0;

    for (const display of displays) {
      const displayRight = display.bounds.x + display.bounds.width;
      const displayBottom = display.bounds.y + display.bounds.height;
      if (displayRight > maxX) maxX = displayRight;
      if (displayBottom > maxY) maxY = displayBottom;
    }

    // 使用实际屏幕尺寸而非 workAreaSize
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxX, height: maxY }
    });

    if (sources.length > 0) {
      return sources[0].thumbnail.toDataURL();
    }
    return null;
  } catch (error) {
    console.error('截图失败:', error);
    return null;
  }
});

// IPC 处理器：区域截图（支持多显示器）
ipcMain.handle('capture-screenshot', async (_event, x: number, y: number, width: number, height: number) => {
  try {
    // 参数验证
    if (width <= 0 || height <= 0) {
      console.error('区域截图失败: 无效的尺寸参数');
      return null;
    }

    const displays = screen.getAllDisplays();

    // 计算所有显示器的总边界
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
    console.error('区域截图失败:', error);
    return null;
  }
});

// IPC 处理器：更新快捷键
let currentShortcut = '';
let shortcutRegistered = false;

// 尝试注册快捷键，如果失败则尝试备用快捷键
function tryRegisterShortcut(shortcutKey: string): boolean {
  try {
    // 先注销旧快捷键
    if (currentShortcut) {
      globalShortcut.unregister(currentShortcut);
    }

    const success = globalShortcut.register(shortcutKey, async () => {
      // 打开截图覆盖窗口
      const imageData = await captureScreen();
      if (imageData) {
        createScreenshotOverlayWindow();
        setTimeout(() => {
          screenshotOverlayWindow?.webContents.send('screenshot-captured', imageData);
        }, 100);
      }
    });

    if (success) {
      currentShortcut = shortcutKey;
      shortcutRegistered = true;
      console.log(`快捷键注册成功: ${shortcutKey}`);
      // 通知渲染进程
      mainWindow?.webContents.send('shortcut-status', { registered: true, shortcut: shortcutKey });
      return true;
    } else {
      console.warn(`快捷键注册失败: ${shortcutKey} (可能被其他应用占用)`);
      shortcutRegistered = false;
      mainWindow?.webContents.send('shortcut-status', { registered: false, shortcut: shortcutKey, error: '快捷键被其他应用占用' });
      return false;
    }
  } catch (error) {
    console.error('注册快捷键时出错:', error);
    shortcutRegistered = false;
    return false;
  }
}

// 注册快捷键，尝试多个备用选项
function registerShortcutWithFallback() {
  // 优先级列表：尝试多个快捷键
  const shortcuts = ['Alt+S', 'Alt+D', 'Ctrl+Shift+S', 'Ctrl+Alt+S'];

  for (const shortcut of shortcuts) {
    if (tryRegisterShortcut(shortcut)) {
      return true;
    }
  }

  console.warn('所有快捷键都注册失败，请手动设置');
  return false;
}

ipcMain.on('update-shortcut', (_event, shortcutKey: string) => {
  if (shortcutKey && shortcutKey.trim()) {
    tryRegisterShortcut(shortcutKey.trim());
  }
});

// IPC 处理器：查询快捷键状态
ipcMain.handle('get-shortcut-status', () => {
  return {
    registered: shortcutRegistered,
    shortcut: currentShortcut
  };
});

// ========== 截图覆盖窗口 ==========

// 捕获屏幕并打开截图覆盖窗口
async function captureScreen(): Promise<string | null> {
  try {
    const displays = screen.getAllDisplays();

    // 计算所有显示器的总边界
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
    console.error('捕获屏幕失败:', error);
    return null;
  }
}

// 创建截图覆盖窗口
function createScreenshotOverlayWindow() {
  if (screenshotOverlayWindow) {
    screenshotOverlayWindow.close();
    screenshotOverlayWindow = null;
  }

  const { width, height } = screen.getPrimaryDisplay().bounds;

  screenshotOverlayWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 加载覆盖窗口页面（带有 overlay 查询参数）
  if (isDev()) {
    screenshotOverlayWindow.loadURL('http://localhost:5173?overlay=true');
  } else {
    screenshotOverlayWindow.loadFile('index.html', { query: { overlay: 'true' } });
  }

  // 开发模式下打开开发者工具
  if (isDev()) {
    screenshotOverlayWindow.webContents.openDevTools({ mode: 'detach' });
  }

  screenshotOverlayWindow.on('closed', () => {
    screenshotOverlayWindow = null;
  });

  // 设置为可点击穿透（除了有内容的区域）
  screenshotOverlayWindow.setIgnoreMouseEvents(false);
}

// IPC: 捕获屏幕
ipcMain.handle('capture-screen', async () => {
  return await captureScreen();
});

// IPC: 打开截图覆盖窗口
ipcMain.handle('open-screenshot-overlay', async () => {
  const imageData = await captureScreen();
  if (imageData) {
    createScreenshotOverlayWindow();
    // 等待窗口加载完成后发送截图数据
    setTimeout(() => {
      screenshotOverlayWindow?.webContents.send('screenshot-captured', imageData);
    }, 100);
    return true;
  }
  return false;
});

// IPC: 关闭截图覆盖窗口
ipcMain.handle('close-screenshot-overlay', () => {
  if (screenshotOverlayWindow) {
    screenshotOverlayWindow.close();
    screenshotOverlayWindow = null;
  }
});

// IPC: 获取截图覆盖窗口的截图数据
ipcMain.handle('get-overlay-screenshot', async () => {
  return await captureScreen();
});

// ========== 置顶窗口 ==========

// 创建置顶窗口
function createPinWindow(imageData: string, ocrText?: string, translatedText?: string) {
  const pinWindow = new BrowserWindow({
    width: 400,
    height: 300,
    minWidth: 200,
    minHeight: 150,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 加载置顶窗口页面（带有 pin 查询参数）
  const params = new URLSearchParams({ pin: 'true' });
  if (isDev()) {
    pinWindow.loadURL(`http://localhost:5173?${params.toString()}`);
  } else {
    pinWindow.loadFile('index.html', { query: { pin: 'true' } });
  }

  // 开发模式下打开开发者工具
  if (isDev()) {
    pinWindow.webContents.openDevTools({ mode: 'detach' });
  }

  pinWindow.on('closed', () => {
    pinWindows.delete(pinWindow);
  });

  pinWindows.add(pinWindow);

  // 窗口加载完成后发送数据
  pinWindow.webContents.once('did-finish-load', () => {
    pinWindow.webContents.send('pin-window-data', {
      imageData,
      ocrText: ocrText || '',
      translatedText: translatedText || ''
    });
  });

  return pinWindow;
}

// IPC: 创建置顶窗口
ipcMain.handle('create-pin-window', async (_event, imageData: string, ocrText?: string, translatedText?: string) => {
  createPinWindow(imageData, ocrText, translatedText);
  return true;
});

// IPC: 设置窗口置顶
ipcMain.handle('set-always-on-top', async (_event, windowId: number, alwaysOnTop: boolean) => {
  const win = BrowserWindow.fromId(windowId);
  if (win) {
    win.setAlwaysOnTop(alwaysOnTop);
    return true;
  }
  return false;
});

// IPC: 关闭置顶窗口
ipcMain.handle('close-pin-window', async (_event, windowId: number) => {
  const win = BrowserWindow.fromId(windowId);
  if (win) {
    win.close();
    return true;
  }
  return false;
});

// IPC: 关闭当前窗口（用于置顶窗口）
ipcMain.handle('close-current-window', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
    return true;
  }
  return false;
});

app.whenReady().then(() => {
  createWindow();

  // 注册全局快捷键（带备用选项）
  registerShortcutWithFallback();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  // 注销所有快捷键
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});