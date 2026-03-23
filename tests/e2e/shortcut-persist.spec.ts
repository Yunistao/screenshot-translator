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

test('Should re-apply saved custom shortcut after renderer reload', async () => {
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      E2E_SHOW_MAIN_WINDOW: '1',
      E2E_DISABLE_TRAY: '1',
      DISABLE_DEVTOOLS: '1',
    },
  });

  try {
    const mainWindow = await waitForMainWindow(app);
    await mainWindow.waitForLoadState('domcontentloaded');

    await mainWindow.evaluate(() => {
      const settings = {
        shortcutKey: 'Ctrl+Shift+X',
      };
      localStorage.setItem('screenshotTranslatorSettings', JSON.stringify(settings));
      window.electronAPI?.updateShortcut?.('Alt+D');
    });

    await expect(mainWindow.locator('.shortcut-status')).toContainText('Alt+D');

    await mainWindow.reload();
    await mainWindow.waitForLoadState('domcontentloaded');

    await expect(mainWindow.locator('.shortcut-status')).toContainText('Ctrl+Shift+X');
  } finally {
    await app.close();
  }
});
