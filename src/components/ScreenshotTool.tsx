import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface ShortcutStatus {
  registered: boolean;
  shortcut: string;
  error?: string;
}

const DEFAULT_SHORTCUT = 'Alt+S';

function normalizeShortcutKey(rawKey: string): string {
  const key = rawKey.trim().toLowerCase();
  if (key === 'esc') {
    return 'escape';
  }
  if (key === 'space' || key === 'spacebar') {
    return ' ';
  }
  return key;
}

function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return false;
  }

  const shortcutKey = normalizeShortcutKey(parts[parts.length - 1]);
  const modifierParts = parts.slice(0, -1).map((part) => part.toLowerCase());

  const expectCtrl = modifierParts.includes('ctrl') || modifierParts.includes('control');
  const expectAlt = modifierParts.includes('alt') || modifierParts.includes('option');
  const expectShift = modifierParts.includes('shift');
  const expectMeta =
    modifierParts.includes('meta') ||
    modifierParts.includes('cmd') ||
    modifierParts.includes('command') ||
    modifierParts.includes('win');

  if (event.ctrlKey !== expectCtrl) return false;
  if (event.altKey !== expectAlt) return false;
  if (event.shiftKey !== expectShift) return false;
  if (event.metaKey !== expectMeta) return false;

  return normalizeShortcutKey(event.key) === shortcutKey;
}

function getShortcutFromStorage(): string | null {
  try {
    const raw = localStorage.getItem('screenshotTranslatorSettings');
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { shortcutKey?: unknown };
    if (typeof parsed.shortcutKey !== 'string') {
      return null;
    }

    const normalized = parsed.shortcutKey.trim();
    return normalized || DEFAULT_SHORTCUT;
  } catch {
    return null;
  }
}

const ScreenshotTool: React.FC = () => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shortcutStatus, setShortcutStatus] = useState<ShortcutStatus>({
    registered: false,
    shortcut: '',
  });
  const { tNested } = useI18n();

  const activeShortcut = useMemo(
    () => shortcutStatus.shortcut?.trim() || DEFAULT_SHORTCUT,
    [shortcutStatus.shortcut],
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const startScreenshot = useCallback(async (): Promise<boolean> => {
    clearError();

    if (!window.electronAPI?.openScreenshotOverlay) {
      const errorMsg = '截图功能不可用：请确保在 Electron 环境中运行此应用';
      console.error(errorMsg);
      setErrorMessage(errorMsg);
      setTimeout(clearError, 5000);
      return false;
    }

    await window.electronAPI?.minimizeCurrentWindow?.();
    const opened = await window.electronAPI.openScreenshotOverlay();
    if (!opened) {
      setIsSelecting(false);
    }
    return opened;
  }, [clearError]);

  const cancelScreenshot = useCallback(async () => {
    setLoading(false);
    setProcessingProgress('');
    setProgressPercentage(0);

    try {
      await window.electronAPI?.closeScreenshotOverlay?.();
    } catch (error) {
      console.error('关闭截图覆盖层失败:', error);
    }

    setIsSelecting(false);
    setErrorMessage('操作已取消');
    setTimeout(clearError, 2000);
  }, [clearError]);

  useEffect(() => {
    if (!window.electronAPI) {
      console.error('Electron API 未加载，请确保在 Electron 环境中运行');
      setErrorMessage('Electron API 未加载，请重启应用');
      return;
    }

    window.electronAPI.onShortcutStatus?.((status) => {
      setShortcutStatus(status);
    });

    const preferredShortcut = getShortcutFromStorage();
    if (preferredShortcut) {
      window.electronAPI.updateShortcut?.(preferredShortcut);
    }

    window.electronAPI.getShortcutStatus?.().then((status) => {
      setShortcutStatus(status);
    });

    window.electronAPI.getScreenshotOverlayStatus?.().then((status) => {
      setIsSelecting(Boolean(status?.active));
    });

    window.electronAPI.onScreenshotOverlayStatus?.((status) => {
      const active = Boolean(status?.active);
      setIsSelecting(active);
      if (!active) {
        setLoading(false);
        setProcessingProgress('');
        setProgressPercentage(0);
      }
    });

    return () => {
      window.electronAPI?.offShortcutStatus?.();
      window.electronAPI?.offScreenshotOverlayStatus?.();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input,textarea,select,[contenteditable="true"]')) {
        return;
      }

      if (matchesShortcut(event, activeShortcut)) {
        event.preventDefault();
        if (!loading && !isSelecting) {
          await startScreenshot();
        }
        return;
      }

      if (event.key === 'Escape' && (loading || isSelecting)) {
        event.preventDefault();
        await cancelScreenshot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeShortcut, startScreenshot, cancelScreenshot, loading, isSelecting]);

  const handleClickStart = async () => {
    setIsSelecting(true);
    const opened = await startScreenshot();
    if (!opened) {
      setIsSelecting(false);
    }
  };

  return (
    <div className="screenshot-tool">
      {shortcutStatus.shortcut && (
        <div className={`shortcut-status ${shortcutStatus.registered ? 'success' : 'warning'}`}>
          {shortcutStatus.registered
            ? `快捷键 ${shortcutStatus.shortcut} 已启用`
            : `快捷键 ${shortcutStatus.shortcut} 注册失败，请检查是否被其他应用占用，或在设置中更换快捷键`}
        </div>
      )}

      <div className="button-group">
        <button
          onClick={handleClickStart}
          disabled={isSelecting || loading}
          className="primary-button"
        >
          {loading
            ? tNested('screenshot.processing')
            : isSelecting
              ? tNested('screenshot.selecting')
              : `${tNested('screenshot.start')}${shortcutStatus.registered ? ` (${shortcutStatus.shortcut})` : ''}`}
        </button>
        {(loading || isSelecting) && (
          <button onClick={cancelScreenshot} className="secondary-button">
            {tNested('screenshot.cancel')}
          </button>
        )}
      </div>

      {processingProgress && (
        <div className="processing-indicator">
          <div className="progress-text">{processingProgress}</div>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progressPercentage}%` }} />
          </div>
          <div className="progress-percentage">{progressPercentage}%</div>
        </div>
      )}

      {errorMessage && (
        <div className="error-message">
          {errorMessage}
          <button onClick={clearError} className="error-close">
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ScreenshotTool;
