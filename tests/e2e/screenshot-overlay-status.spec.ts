import { test, expect } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';

async function waitForWindow(
  app: ElectronApplication,
  predicate: (url: string) => boolean,
  timeoutMs = 15000,
): Promise<Page> {
  const end = Date.now() + timeoutMs;

  while (Date.now() < end) {
    for (const page of app.windows()) {
      const url = page.url();
      if (predicate(url)) {
        return page;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for target window');
}

function getOverlayWindowCount(app: ElectronApplication): number {
  return app.windows().filter((page) => page.url().includes('overlay=true')).length;
}

function getPinWindowCount(app: ElectronApplication): number {
  return app.windows().filter((page) => page.url().includes('pin=true')).length;
}

async function getPinWindowBounds(
  app: ElectronApplication,
): Promise<{ width: number; height: number; x: number; y: number } | null> {
  return await app.evaluate(({ BrowserWindow }) => {
    const pinWindow = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().includes('pin=true'));
    if (!pinWindow) {
      return null;
    }
    return pinWindow.getBounds();
  });
}

async function getClipboardImageSize(
  app: ElectronApplication,
): Promise<{ width: number; height: number } | null> {
  return await app.evaluate(({ clipboard }) => {
    const image = clipboard.readImage();
    if (image.isEmpty()) {
      return null;
    }
    return image.getSize();
  });
}

async function getClipboardImagePixel(
  app: ElectronApplication,
  x: number,
  y: number,
): Promise<number[] | null> {
  return await app.evaluate(({ clipboard, nativeImage }, point) => {
    const image = clipboard.readImage();
    if (image.isEmpty()) {
      return null;
    }

    const size = image.getSize();
    if (point.x < 0 || point.y < 0 || point.x >= size.width || point.y >= size.height) {
      return null;
    }

    const pngBase64 = image.toPNG().toString('base64');
    const parsed = nativeImage.createFromDataURL(`data:image/png;base64,${pngBase64}`);
    const bitmap = parsed.toBitmap();
    const index = (point.y * size.width + point.x) * 4;
    return Array.from(bitmap.slice(index, index + 4));
  }, { x, y });
}

async function getApplicationMenuLabels(app: ElectronApplication): Promise<string[]> {
  return await app.evaluate(({ Menu }) => {
    const menu = Menu.getApplicationMenu();
    return menu ? menu.items.map((item) => item.label) : [];
  });
}

async function isMainWindowMinimized(app: ElectronApplication): Promise<boolean> {
  return await app.evaluate(({ BrowserWindow }) => {
    const mainWindow = BrowserWindow.getAllWindows().find((win) => {
      const url = win.webContents.getURL();
      return url.includes('localhost:5173') && !url.includes('overlay=true') && !url.includes('pin=true');
    });

    return mainWindow
      ? mainWindow.isMinimized() || !mainWindow.isVisible() || !mainWindow.isFocused()
      : false;
  });
}

async function sendEscapeToFocusedWindow(app: ElectronApplication): Promise<boolean> {
  return await app.evaluate(({ BrowserWindow }) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow) {
      return false;
    }

    focusedWindow.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
    focusedWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
    return true;
  });
}

async function isOverlayWindowFocused(app: ElectronApplication): Promise<boolean> {
  return await app.evaluate(({ BrowserWindow }) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow) {
      return false;
    }
    return focusedWindow.webContents.getURL().includes('overlay=true');
  });
}

async function selectRectOnOverlay(overlayWindow: Page): Promise<void> {
  const canvas = overlayWindow.locator('canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await canvas.hover({ position: { x: 80, y: 80 } });
  await overlayWindow.mouse.down();
  await overlayWindow.mouse.move(260, 220);
  await overlayWindow.mouse.up();
}

async function seedOverlayState(overlayWindow: Page, state: Record<string, unknown>): Promise<void> {
  await overlayWindow.evaluate((nextState) => {
    const appStore = (window as Window & { __APP_STORE__?: { setState: (state: Record<string, unknown>) => void } }).__APP_STORE__;
    appStore?.setState(nextState);
  }, state);
}

test.describe('Screenshot Overlay / Pin / Translation Modes', () => {
  let app: ElectronApplication;
  let mainWindow: Page;

  test.beforeEach(async () => {
    app = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        E2E_MOCK_OVERLAY: '1',
        E2E_SHOW_MAIN_WINDOW: '1',
        E2E_DISABLE_TRAY: '1',
        DISABLE_DEVTOOLS: '1',
      },
    });

    mainWindow = await waitForWindow(
      app,
      (url) => url.includes('localhost:5173') && !url.includes('overlay=true') && !url.includes('pin=true'),
    );
    await mainWindow.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    if (!app) {
      return;
    }

    try {
      await app.evaluate(({ app: electronApp }) => {
        electronApp.quit();
      });
    } catch {
      // Ignore failures when app is already closing.
    }

    await app.close();
  });

  test('Alt+S start should focus overlay, then ESC closes without any selection', async () => {
    const primaryButton = mainWindow.locator('.primary-button');
    const cancelButton = mainWindow.locator('.secondary-button');

    await mainWindow.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 's',
          altKey: true,
          bubbles: true,
        }),
      );
    });

    await expect(primaryButton).toBeDisabled();
    await expect(cancelButton).toBeVisible();
    await expect.poll(() => isMainWindowMinimized(app)).toBe(true);

    await waitForWindow(app, (url) => url.includes('overlay=true'));
    await expect.poll(() => isOverlayWindowFocused(app)).toBe(true);
    await expect.poll(() => sendEscapeToFocusedWindow(app)).toBe(true);

    await expect.poll(() => getOverlayWindowCount(app)).toBe(0);
    await expect.poll(() => isMainWindowMinimized(app)).toBe(false);
    await expect(primaryButton).toBeEnabled();
    await expect(cancelButton).toHaveCount(0);
  });

  test('ESC closes overlay after making a selection rectangle', async () => {
    const primaryButton = mainWindow.locator('.primary-button');

    await primaryButton.click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');
    await expect.poll(() => isMainWindowMinimized(app)).toBe(true);

    await selectRectOnOverlay(overlayWindow);
    await expect(overlayWindow.locator('.toolbar')).toBeVisible();

    await expect.poll(() => sendEscapeToFocusedWindow(app)).toBe(true);
    await expect.poll(() => getOverlayWindowCount(app)).toBe(0);
    await expect.poll(() => isMainWindowMinimized(app)).toBe(false);
    await expect(primaryButton).toBeEnabled();
  });

  test('Cancel button closes overlay after making a selection rectangle', async () => {
    const primaryButton = mainWindow.locator('.primary-button');

    await primaryButton.click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');
    await expect.poll(() => isMainWindowMinimized(app)).toBe(true);

    await selectRectOnOverlay(overlayWindow);
    await expect(overlayWindow.locator('.toolbar')).toBeVisible();
    await overlayWindow.getByRole('button', { name: '取消' }).click().catch(() => {});

    await expect.poll(() => getOverlayWindowCount(app)).toBe(0);
    await expect.poll(() => isMainWindowMinimized(app)).toBe(false);
    await expect(primaryButton).toBeEnabled();
  });

  test('Pin window should render image-only content and close on double click', async () => {
    const primaryButton = mainWindow.locator('.primary-button');

    await primaryButton.click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');

    await selectRectOnOverlay(overlayWindow);
    await overlayWindow.locator('[data-testid="pin-button"]').first().click();

    const pinWindow = await waitForWindow(app, (url) => url.includes('pin=true'));
    await pinWindow.waitForLoadState('domcontentloaded');
    await expect.poll(() => getPinWindowCount(app)).toBe(1);

    await expect(pinWindow.locator('.pin-root')).toBeVisible();
    await expect(pinWindow.locator('[data-testid="pin-context-menu"]')).toHaveCount(0);

    await pinWindow.locator('.pin-root').dispatchEvent('dblclick').catch(() => {});
    await expect.poll(() => getPinWindowCount(app)).toBe(0);
  });

  test('Pinned image should include existing annotations', async () => {
    const primaryButton = mainWindow.locator('.primary-button');

    await primaryButton.click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');

    await overlayWindow.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to create test image');
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 120);

      const imageData = canvas.toDataURL('image/png');
      const appStore = (window as Window & { __APP_STORE__?: { setState: (state: Record<string, unknown>) => void } }).__APP_STORE__;
      appStore?.setState({
        screenshotImage: imageData,
        selectionArea: { x: 0, y: 0, width: 200, height: 120 },
        showToolbar: true,
        toolbarPosition: { x: 20, y: 20 },
        annotations: [
          {
            id: 'annotation-1',
            type: 'rectangle',
            color: '#ff0000',
            startX: 20,
            startY: 20,
            endX: 180,
            endY: 100,
          },
        ],
      });
    });

    await overlayWindow.locator('[data-testid="pin-button"]').first().click();

    const pinWindow = await waitForWindow(app, (url) => url.includes('pin=true'));
    await pinWindow.waitForLoadState('domcontentloaded');

    const pixel = await pinWindow.locator('img').evaluate((img) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to read pinned image');
      }

      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(20, 20, 1, 1).data;
      return Array.from(data);
    });

    expect(pixel[0]).toBeGreaterThan(200);
    expect(pixel[1]).toBeLessThan(80);
    expect(pixel[2]).toBeLessThan(80);
    expect(pixel[3]).toBeGreaterThan(0);

    await pinWindow.locator('.pin-root').dispatchEvent('dblclick').catch(() => {});
  });

  test('Pin window context menu should expose zoom, copy and destroy actions', async () => {
    const primaryButton = mainWindow.locator('.primary-button');

    await primaryButton.click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');

    await selectRectOnOverlay(overlayWindow);
    await overlayWindow.locator('[data-testid="pin-button"]').first().click();

    const pinWindow = await waitForWindow(app, (url) => url.includes('pin=true'));
    await pinWindow.waitForLoadState('domcontentloaded');
    await expect.poll(() => getPinWindowCount(app)).toBe(1);

    await pinWindow.locator('.pin-root').click({ button: 'right' });
    await expect(pinWindow.locator('[data-testid="pin-context-menu"]')).toBeVisible();
    await expect(pinWindow.locator('[data-testid="pin-context-menu-edit"]')).toHaveCount(0);
    await expect(pinWindow.locator('[data-testid="pin-context-menu-copy"]')).toBeVisible();
    await expect(pinWindow.locator('[data-testid="pin-context-menu-zoom-in"]')).toBeVisible();
    await expect(pinWindow.locator('[data-testid="pin-context-menu-zoom-out"]')).toBeVisible();
    await expect(pinWindow.locator('[data-testid="pin-context-menu-destroy"]')).toBeVisible();

    await pinWindow.locator('[data-testid="pin-context-menu-zoom-in"]').click();
    await expect(pinWindow.locator('.pin-root')).toHaveAttribute('data-scale', /1\.[1-9]/);

    await pinWindow.locator('.pin-root').click({ button: 'right' });
    await expect(pinWindow.locator('[data-testid="pin-context-menu"]')).toBeVisible();
    await pinWindow.locator('[data-testid="pin-context-menu-destroy"]').dispatchEvent('pointerdown').catch(() => {});
    await expect.poll(() => getPinWindowCount(app)).toBe(0);
  });

  test('Pin zoom-out should reduce real window bounds and still allow context actions', async () => {
    const primaryButton = mainWindow.locator('.primary-button');

    await primaryButton.click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');

    await overlayWindow.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to create test image');
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 240, 160);

      const imageData = canvas.toDataURL('image/png');
      const appStore = (window as Window & { __APP_STORE__?: { setState: (state: Record<string, unknown>) => void } }).__APP_STORE__;
      appStore?.setState({
        screenshotImage: imageData,
        selectionArea: { x: 0, y: 0, width: 240, height: 160 },
        showToolbar: true,
        toolbarPosition: { x: 20, y: 20 },
      });
    });

    await overlayWindow.locator('[data-testid="pin-button"]').first().click();

    const pinWindow = await waitForWindow(app, (url) => url.includes('pin=true'));
    await pinWindow.waitForLoadState('domcontentloaded');
    await expect.poll(() => getPinWindowCount(app)).toBe(1);

    const initialBounds = await getPinWindowBounds(app);
    expect(initialBounds).not.toBeNull();

    await pinWindow.locator('.pin-root').click({ button: 'right' });
    await pinWindow.locator('[data-testid="pin-context-menu-zoom-out"]').click();
    await expect(pinWindow.locator('.pin-root')).toHaveAttribute('data-scale', /0\.[0-9]+/);

    await expect
      .poll(async () => {
        const nextBounds = await getPinWindowBounds(app);
        return nextBounds?.width ?? 0;
      })
      .toBeLessThan(initialBounds!.width);

    await expect
      .poll(async () => {
        const nextBounds = await getPinWindowBounds(app);
        return nextBounds?.height ?? 0;
      })
      .toBeLessThan(initialBounds!.height);

    await pinWindow.locator('.pin-root').click({ button: 'right' });
    await expect(pinWindow.locator('[data-testid="pin-context-menu"]')).toBeVisible();
    await expect(pinWindow.locator('[data-testid="pin-context-menu-edit"]')).toHaveCount(0);
    await expect(pinWindow.locator('[data-testid="pin-context-menu-copy"]')).toBeVisible();
  });

  test('Translation result defaults to inline mode and can toggle to list mode and back', async () => {
    const primaryButton = mainWindow.locator('.primary-button');

    await primaryButton.click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');
    await overlayWindow.locator('canvas').first().waitFor({ state: 'visible' });

    await overlayWindow.evaluate(() => {
      const appStore = (window as Window & { __APP_STORE__?: { setState: (state: Record<string, unknown>) => void } }).__APP_STORE__;
      appStore?.setState({
        selectionArea: { x: 80, y: 80, width: 320, height: 200 },
        showToolbar: true,
        toolbarPosition: { x: 100, y: 300 },
        showTranslationResult: true,
        translationDisplayMode: 'inline',
        ocrLines: [
          {
            text: 'Hello world',
            translatedText: 'hello world translated',
            bbox: { x0: 20, y0: 20, x1: 180, y1: 45 },
          },
          {
            text: 'How are you',
            translatedText: 'how are you translated',
            bbox: { x0: 20, y0: 60, x1: 190, y1: 85 },
          },
        ],
      });
    });

    await expect(overlayWindow.locator('.translation-inline-layer')).toBeVisible();
    await overlayWindow.locator('[data-testid="translation-mode-toggle"]').click();
    await expect(overlayWindow.locator('.translation-card')).toBeVisible();

    await overlayWindow.locator('[data-testid="translation-mode-toggle"]').click();
    await expect(overlayWindow.locator('.translation-inline-layer')).toBeVisible();
  });

  test('Settings panel should show readable Chinese labels for translation configuration', async () => {
    await mainWindow.getByRole('button', { name: '显示设置' }).click();

    await expect(mainWindow.getByRole('heading', { name: '设置', exact: true })).toBeVisible();
    await expect(mainWindow.getByText('翻译引擎')).toBeVisible();
    await expect(mainWindow.getByLabel('微软翻译 API 密钥')).toHaveCount(0);
    await expect(mainWindow.getByLabel('微软区域')).toHaveCount(0);
    await expect(mainWindow.getByRole('heading', { name: 'OCR 设置' })).toBeVisible();
    await expect(mainWindow.getByLabel('OCR 语言')).toBeVisible();

    const engineOptions = await mainWindow.locator('#translatorEngine option').allTextContents();
    expect(engineOptions).toEqual(
      expect.arrayContaining(['Google 翻译', '百度翻译', '有道翻译', 'OpenAI 兼容']),
    );
    expect(engineOptions).not.toContain('微软翻译');
  });

  test('Settings should migrate legacy microsoft engine to openai-compatible and persist it', async () => {
    await mainWindow.evaluate(() => {
      localStorage.setItem(
        'screenshotTranslatorSettings',
        JSON.stringify({
          translatorEngine: 'microsoft',
        }),
      );
    });

    await mainWindow.getByRole('button', { name: '显示设置' }).click();
    await expect(mainWindow.locator('#translatorEngine')).toHaveValue('openai-compatible');

    const migratedEngine = await mainWindow.evaluate(() => {
      const raw = localStorage.getItem('screenshotTranslatorSettings');
      if (!raw) {
        return null;
      }

      try {
        const parsed = JSON.parse(raw) as { translatorEngine?: string };
        return parsed.translatorEngine ?? null;
      } catch {
        return null;
      }
    });

    expect(migratedEngine).toBe('openai-compatible');
  });

  test('Main app should not expose history panel entry button', async () => {
    await expect(mainWindow.getByRole('button', { name: '显示历史记录' })).toHaveCount(0);
    await expect(mainWindow.getByRole('button', { name: '隐藏历史记录' })).toHaveCount(0);
  });

  test('Copy should close overlay, keep main window hidden, and export annotations to clipboard', async () => {
    const primaryButton = mainWindow.locator('.primary-button');

    await primaryButton.click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');
    await expect.poll(() => isMainWindowMinimized(app)).toBe(true);

    await seedOverlayState(overlayWindow, {
      screenshotImage: await overlayWindow.evaluate(async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to create test image');
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 200, 120);
        return canvas.toDataURL('image/png');
      }),
      selectionArea: { x: 0, y: 0, width: 200, height: 120 },
      showToolbar: true,
      toolbarPosition: { x: 20, y: 20 },
      annotations: [
        {
          id: 'annotation-copy-arrow',
          type: 'arrow',
          color: '#ff0000',
          startX: 20,
          startY: 20,
          endX: 160,
          endY: 20,
        },
      ],
    });

    await overlayWindow.getByRole('button', { name: '复制' }).click();

    await expect.poll(() => getOverlayWindowCount(app)).toBe(0);
    await expect.poll(() => isMainWindowMinimized(app)).toBe(true);
    await expect.poll(() => getClipboardImageSize(app)).toEqual({ width: 200, height: 120 });

    const pixel = await getClipboardImagePixel(app, 20, 20);
    expect(pixel).not.toBeNull();
    expect(pixel![2]).toBeGreaterThan(180);
    expect(pixel![1]).toBeLessThan(100);
    expect(pixel![0]).toBeLessThan(100);
    expect(pixel![3]).toBeGreaterThan(0);
  });

  test('Pin should export visible translation overlay even when UI is in list mode', async () => {
    const primaryButton = mainWindow.locator('.primary-button');

    await primaryButton.click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');
    await expect.poll(() => isMainWindowMinimized(app)).toBe(true);

    await seedOverlayState(overlayWindow, {
      screenshotImage: await overlayWindow.evaluate(async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 220;
        canvas.height = 140;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to create test image');
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 220, 140);
        ctx.fillStyle = '#e6e6e6';
        ctx.fillRect(20, 20, 120, 28);
        return canvas.toDataURL('image/png');
      }),
      selectionArea: { x: 0, y: 0, width: 220, height: 140 },
      showToolbar: true,
      toolbarPosition: { x: 20, y: 20 },
      showTranslationResult: true,
      translationDisplayMode: 'list',
      ocrLines: [
        {
          text: 'origin',
          translatedText: 'translated',
          bbox: { x0: 20, y0: 20, x1: 140, y1: 48 },
        },
      ],
    });

    await overlayWindow.locator('[data-testid="pin-button"]').click();

    const pinWindow = await waitForWindow(app, (url) => url.includes('pin=true'));
    await pinWindow.waitForLoadState('domcontentloaded');
    await expect.poll(() => getOverlayWindowCount(app)).toBe(0);
    await expect.poll(() => isMainWindowMinimized(app)).toBe(true);

    const pixel = await pinWindow.locator('img').evaluate((img) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to read pinned image');
      }

      ctx.drawImage(img, 0, 0);
      return Array.from(ctx.getImageData(40, 30, 1, 1).data);
    });

    expect(pixel[0]).toBeLessThan(170);
    expect(pixel[1]).toBeLessThan(170);
    expect(pixel[2]).toBeLessThan(170);
    expect(pixel[3]).toBeGreaterThan(150);

    await pinWindow.locator('.pin-root').dispatchEvent('dblclick').catch(() => {});
  });

  test('Annotation editor should not expose text tool and app menu should use readable Chinese labels', async () => {
    const primaryButton = mainWindow.locator('.primary-button');

    await primaryButton.click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');

    await selectRectOnOverlay(overlayWindow);
    await overlayWindow.getByRole('button', { name: '编辑' }).click();

    await expect(overlayWindow.locator('button[title="文本"]')).toHaveCount(0);
    await expect(overlayWindow.getByText(/^T$/)).toHaveCount(0);

    const labels = await getApplicationMenuLabels(app);
    expect(labels).toEqual(expect.arrayContaining(['文件', '编辑', '查看', '窗口', '帮助']));
  });
});

