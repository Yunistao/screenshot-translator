import { app, BrowserWindow, globalShortcut, ipcMain, screen, desktopCapturer } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow;
let translateWindow: BrowserWindow | undefined = undefined;
let isCapturing = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    resizable: true,
    icon: path.join(__dirname, '../public/icon.png'), // 如果有图标的话
  });

  // 加载渲染进程
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  } else {
    mainWindow.loadFile('index.html');
  }

  // 开发环境下打开开发者工具
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

// 创建翻译结果显示窗口
function createTranslateWindow(imageData: string, translatedText: string) {
  if (translateWindow && !translateWindow.isDestroyed()) {
    translateWindow.destroy(); // 使用destroy()而不是close()确保完全清理
  }

  translateWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    alwaysOnTop: true,
    resizable: true,
    frame: true,
  });

  // 发送图像数据和翻译结果到新窗口
  translateWindow.loadFile('index.html'); // 或者创建专门的HTML文件

  if (translateWindow) {
    translateWindow.webContents.once('dom-ready', () => {
      if (translateWindow && !translateWindow.isDestroyed()) {
        translateWindow.webContents.send('translation-result', imageData, translatedText);
      }
    });

    translateWindow.show();
  }
}

// 注册截图快捷键
function registerScreenshotShortcut() {
  const ret = globalShortcut.register('Alt+S', () => {
    if (isCapturing) return; // 防止重复触发

    isCapturing = true;

    // 请求渲染进程开始截图
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('screenshot-request');
    }

    setTimeout(() => {
      isCapturing = false;
    }, 1000); // 防抖延时
  });

  if (!ret) {
    console.log('截图快捷键注册失败');
  } else {
    console.log('截图快捷键 Alt+S 已注册');
  }
}

app.whenReady().then(() => {
  createWindow();
  registerScreenshotShortcut();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 监听来自渲染进程的翻译结果
ipcMain.on('translation-complete', (_event, imageData: string, translatedText: string) => {
  createTranslateWindow(imageData, translatedText);
});

// 监听截图完成事件
ipcMain.on('screenshot-captured', (_event, imageData: string) => {
  // 将截图数据发送到渲染进程进行OCR和翻译
  mainWindow.webContents.send('process-screenshot', imageData);
});

// 处理截图请求
ipcMain.handle('request-screenshot', async () => {
  try {
    // 获取所有屏幕源
    const sources = await desktopCapturer.getSources({ types: ['screen'] });

    // 获取第一个屏幕（通常是主屏幕）
    const screenSource = sources[0];

    // 创建临时窗口进行截图
    const screenshotWindow = new BrowserWindow({
      width: screenSource.display_id ? screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).bounds.width : 800,
      height: screenSource.display_id ? screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).bounds.height : 600,
      show: false,
      frame: false,
      closable: true,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // 获取截图
    const screenshot = await screenshotWindow.webContents.capturePage();
    const screenshotBase64 = screenshot.toDataURL();

    // 关闭临时窗口
    screenshotWindow.close();

    return screenshotBase64;
  } catch (error) {
    console.error('截图失败:', error);
    throw error;
  }
});