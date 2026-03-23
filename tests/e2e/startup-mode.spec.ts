import { expect, test } from '@playwright/test';
import { _electron as electron, ElectronApplication } from 'playwright';

async function waitForMainWindowId(app: ElectronApplication, timeoutMs = 15000): Promise<number> {
  const end = Date.now() + timeoutMs;

  while (Date.now() < end) {
    const id = await app.evaluate(({ BrowserWindow }) => {
      const windows = BrowserWindow.getAllWindows().filter((candidate) => !candidate.isDestroyed());
      const win = windows.find((candidate) => {
        const url = candidate.webContents.getURL();
        return !url.includes('overlay=true') && !url.includes('pin=true');
      });
      return win?.id ?? null;
    });

    if (id !== null) {
      return id;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for main window id');
}

test('App should start in tray mode with hidden main window by default', async () => {
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      E2E_DISABLE_TRAY: '1',
      DISABLE_DEVTOOLS: '1',
    },
  });

  try {
    const mainWindowId = await waitForMainWindowId(app);
    const visible = await app.evaluate(({ BrowserWindow }, targetId) => {
      const win = BrowserWindow.fromId(targetId);
      return win ? win.isVisible() : null;
    }, mainWindowId);

    expect(visible).toBe(false);
  } finally {
    try {
      await app.evaluate(({ app: electronApp }) => {
        electronApp.quit();
      });
    } catch {
      // Ignore failures when app is already closing.
    }
    await app.close();
  }
});

