import { expect, test } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';

async function waitForMainWindow(app: ElectronApplication, timeoutMs = 15000): Promise<Page> {
  const end = Date.now() + timeoutMs;

  while (Date.now() < end) {
    for (const page of app.windows()) {
      const url = page.url();
      if (url.includes('localhost:5173') && !url.includes('overlay=true') && !url.includes('pin=true')) {
        return page;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for main window');
}

function getOverlayWindowCount(app: ElectronApplication): number {
  return app.windows().filter((page) => page.url().includes('overlay=true')).length;
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

test('Click cancel quickly after start should not leave gray overlay window', async () => {
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      E2E_MOCK_OVERLAY: '1',
      E2E_OVERLAY_OPEN_DELAY_MS: '350',
      DISABLE_DEVTOOLS: '1',
    },
  });

  try {
    const mainWindow = await waitForMainWindow(app);
    await mainWindow.waitForLoadState('domcontentloaded');

    await mainWindow.locator('.primary-button').click();
    await expect(mainWindow.locator('.secondary-button')).toBeVisible();
    await mainWindow.locator('.secondary-button').click();

    await expect(mainWindow.locator('.secondary-button')).toHaveCount(0);
    await expect(mainWindow.locator('.primary-button')).toBeEnabled();
    await expect.poll(() => isMainWindowMinimized(app)).toBe(false);
    await expect.poll(() => getOverlayWindowCount(app)).toBe(0);

    await new Promise((resolve) => setTimeout(resolve, 500));
    await expect.poll(() => getOverlayWindowCount(app)).toBe(0);
  } finally {
    await app.close();
  }
});
