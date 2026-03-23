import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';

const SMOKE_SCREENSHOT_DIR = path.resolve(process.cwd(), 'test-results', 'windows-smoke');

async function waitForWindow(
  app: ElectronApplication,
  predicate: (url: string) => boolean,
  timeoutMs = 15000,
): Promise<Page> {
  const end = Date.now() + timeoutMs;

  while (Date.now() < end) {
    for (const page of app.windows()) {
      if (predicate(page.url())) {
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

async function seedOverlayState(overlayWindow: Page, state: Record<string, unknown>): Promise<void> {
  await overlayWindow.evaluate((nextState) => {
    const appStore = (window as Window & { __APP_STORE__?: { setState: (state: Record<string, unknown>) => void } }).__APP_STORE__;
    appStore?.setState(nextState);
  }, state);
}

async function createWhiteImageData(overlayWindow: Page, width: number, height: number): Promise<string> {
  return await overlayWindow.evaluate(async (size) => {
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create test image');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size.width, size.height);
    return canvas.toDataURL('image/png');
  }, { width, height });
}

async function saveShot(page: Page, fileName: string): Promise<void> {
  fs.mkdirSync(SMOKE_SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SMOKE_SCREENSHOT_DIR, fileName),
    fullPage: true,
  });
}

test.describe('Windows smoke', () => {
  let app: ElectronApplication;
  let mainWindow: Page;

  test.beforeEach(async () => {
    app = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        E2E_MOCK_OVERLAY: '1',
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
    await app.close();
  });

  test('copy flow: close overlay, keep main hidden, clipboard has image', async () => {
    await mainWindow.locator('.primary-button').click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');

    await seedOverlayState(overlayWindow, {
      screenshotImage: await createWhiteImageData(overlayWindow, 240, 140),
      selectionArea: { x: 0, y: 0, width: 240, height: 140 },
      showToolbar: true,
      toolbarPosition: { x: 20, y: 20 },
      annotations: [
        {
          id: 'smoke-copy-arrow',
          type: 'arrow',
          color: '#ff0000',
          startX: 20,
          startY: 20,
          endX: 200,
          endY: 20,
        },
      ],
    });

    await saveShot(overlayWindow, '01-copy-before.png');
    await overlayWindow.getByRole('button', { name: '\u590d\u5236' }).click();

    await expect.poll(() => getOverlayWindowCount(app)).toBe(0);
    await expect.poll(() => isMainWindowMinimized(app)).toBe(true);
    await expect.poll(() => getClipboardImageSize(app)).toEqual({ width: 240, height: 140 });
  });

  test('pin flow: export image and keep main hidden', async () => {
    await mainWindow.locator('.primary-button').click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');

    await seedOverlayState(overlayWindow, {
      screenshotImage: await createWhiteImageData(overlayWindow, 260, 160),
      selectionArea: { x: 0, y: 0, width: 260, height: 160 },
      showToolbar: true,
      toolbarPosition: { x: 20, y: 20 },
    });

    await saveShot(overlayWindow, '02-pin-before.png');
    await overlayWindow.locator('[data-testid="pin-button"]').click();

    const pinWindow = await waitForWindow(app, (url) => url.includes('pin=true'));
    await pinWindow.waitForLoadState('domcontentloaded');
    await saveShot(pinWindow, '02-pin-window.png');

    await expect.poll(() => getOverlayWindowCount(app)).toBe(0);
    await expect.poll(() => getPinWindowCount(app)).toBe(1);
    await expect.poll(() => isMainWindowMinimized(app)).toBe(true);

    await pinWindow.locator('.pin-root').dispatchEvent('dblclick').catch(() => {});
  });

  test('translation toggle flow: inline and list mode both visible', async () => {
    await mainWindow.locator('.primary-button').click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');

    await seedOverlayState(overlayWindow, {
      screenshotImage: await createWhiteImageData(overlayWindow, 320, 200),
      selectionArea: { x: 0, y: 0, width: 320, height: 200 },
      showToolbar: true,
      toolbarPosition: { x: 30, y: 30 },
      showTranslationResult: true,
      translationDisplayMode: 'inline',
      ocrLines: [
        {
          text: 'Hello world',
          translatedText: 'hello world translated',
          bbox: { x0: 30, y0: 30, x1: 200, y1: 60 },
        },
      ],
    });

    await expect(overlayWindow.locator('.translation-inline-layer')).toBeVisible();
    await saveShot(overlayWindow, '03-translation-inline.png');

    await overlayWindow.locator('[data-testid="translation-mode-toggle"]').click();
    await expect(overlayWindow.locator('.translation-card')).toBeVisible();
    await saveShot(overlayWindow, '03-translation-list.png');

    await overlayWindow.locator('[data-testid="translation-mode-toggle"]').click();
    await expect(overlayWindow.locator('.translation-inline-layer')).toBeVisible();
  });

  test('show desktop flow: pin window auto-restores after minimize event', async () => {
    await mainWindow.locator('.primary-button').click();
    const overlayWindow = await waitForWindow(app, (url) => url.includes('overlay=true'));
    await overlayWindow.waitForLoadState('domcontentloaded');

    await seedOverlayState(overlayWindow, {
      screenshotImage: await createWhiteImageData(overlayWindow, 220, 140),
      selectionArea: { x: 0, y: 0, width: 220, height: 140 },
      showToolbar: true,
      toolbarPosition: { x: 20, y: 20 },
    });

    await overlayWindow.locator('[data-testid="pin-button"]').click();
    const pinWindow = await waitForWindow(app, (url) => url.includes('pin=true'));
    await pinWindow.waitForLoadState('domcontentloaded');
    await saveShot(pinWindow, '04-show-desktop-before.png');

    const minimized = await app.evaluate(({ BrowserWindow }) => {
      const pin = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().includes('pin=true'));
      if (!pin) {
        return false;
      }
      pin.minimize();
      return true;
    });
    expect(minimized).toBe(true);

    await expect
      .poll(async () => {
        return await app.evaluate(({ BrowserWindow }) => {
          const pin = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().includes('pin=true'));
          if (!pin) {
            return 'missing';
          }
          return pin.isMinimized() ? 'minimized' : pin.isVisible() ? 'visible' : 'hidden';
        });
      })
      .toBe('visible');

    await saveShot(pinWindow, '04-show-desktop-after.png');
    await pinWindow.locator('.pin-root').dispatchEvent('dblclick').catch(() => {});
  });
});
