import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';

const ScreenshotTool: React.FC = () => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shortcutStatus, setShortcutStatus] = useState<{ registered: boolean; shortcut: string }>({ registered: false, shortcut: '' });
  const { tNested } = useI18n();

  // 清除错误信息
  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // 打开截图覆盖窗口
  const startScreenshot = useCallback(async () => {
    clearError();

    // 检查 Electron API 是否可用
    if (!window.electronAPI?.openScreenshotOverlay) {
      const errorMsg = '截图功能不可用：请确保在 Electron 环境中运行此应用';
      console.error(errorMsg);
      setErrorMessage(errorMsg);
      setTimeout(clearError, 5000);
      return;
    }

    // 打开截图覆盖窗口
    await window.electronAPI.openScreenshotOverlay();
  }, [clearError]);

  // 取消截图操作
  const cancelScreenshot = useCallback(() => {
    setLoading(false);
    setIsSelecting(false);
    setProcessingProgress('');
    setProgressPercentage(0);
    setErrorMessage('操作已取消');
    setTimeout(clearError, 2000);
  }, [clearError]);

  // 加载设置并检查 Electron API
  useEffect(() => {
    // 检查 Electron API 是否可用
    if (!window.electronAPI) {
      console.error('Electron API 未加载，请确保在 Electron 环境中运行');
      setErrorMessage('Electron API 未加载，请重启应用');
    } else {
      // 获取快捷键状态
      window.electronAPI.getShortcutStatus?.().then(status => {
        setShortcutStatus(status);
      });

      // 监听快捷键状态变化
      window.electronAPI.onShortcutStatus?.((status) => {
        setShortcutStatus(status);
      });
    }
  }, []);

  // 注册本地键盘事件处理器（备用）
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!loading && !isSelecting) {
          await startScreenshot();
        }
      }
      // 按ESC取消操作
      if (e.key === 'Escape' && (loading || isSelecting)) {
        e.preventDefault();
        cancelScreenshot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [startScreenshot, cancelScreenshot, loading, isSelecting]);

  const handleClickStart = async () => {
    setIsSelecting(true);
    await startScreenshot();
  };

  return (
    <div className="screenshot-tool">
      {/* 快捷键状态提示 */}
      {shortcutStatus.shortcut && (
        <div className={`shortcut-status ${shortcutStatus.registered ? 'success' : 'warning'}`}>
          {shortcutStatus.registered
            ? `快捷键 ${shortcutStatus.shortcut} 已启用`
            : `快捷键 ${shortcutStatus.shortcut} 注册失败，请检查是否被其他应用占用，或在设置中更换快捷键`
          }
        </div>
      )}

      <div className="button-group">
        <button
          onClick={handleClickStart}
          disabled={isSelecting || loading}
          className="primary-button"
        >
          {loading ? tNested('screenshot.processing') : isSelecting ? tNested('screenshot.selecting') : `开始截图${shortcutStatus.registered ? ` (${shortcutStatus.shortcut})` : ''}`}
        </button>
        {(loading || isSelecting) && (
          <button
            onClick={cancelScreenshot}
            className="secondary-button"
          >
            {tNested('screenshot.cancel')}
          </button>
        )}
      </div>

      {processingProgress && (
        <div className="processing-indicator">
          <div className="progress-text">{processingProgress}</div>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="progress-percentage">{progressPercentage}%</div>
        </div>
      )}

      {errorMessage && (
        <div className="error-message">
          {errorMessage}
          <button onClick={clearError} className="error-close">×</button>
        </div>
      )}
    </div>
  );
};

export default ScreenshotTool;