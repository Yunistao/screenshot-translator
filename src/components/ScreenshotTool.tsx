import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useI18n } from '../i18n/I18nContext';
import { performOCR } from '../services/ocrService';
import { translateText } from '../services/translationService';

// 设置接口
interface Settings {
  shortcutKey: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatorApiKey: string;
  translatorRegion: string;
  translatorEndpoint: string;
  autoCopy: boolean;
  fontSize: number;
  opacity: number;
  theme: 'light' | 'dark';
  ocrLanguage: string;
  translatorEngine: 'microsoft' | 'google' | 'baidu' | 'youdao';
  googleTranslateApiKey: string;
  baiduTranslateAppId: string;
  baiduTranslateAppKey: string;
  youdaoTranslateAppKey: string;
  youdaoTranslateAppSecret: string;
}

const DEFAULT_SETTINGS: Settings = {
  shortcutKey: 'Alt+S',
  sourceLanguage: 'auto',
  targetLanguage: 'zh-Hans',
  translatorApiKey: '',
  translatorRegion: 'global',
  translatorEndpoint: '',
  autoCopy: true,
  fontSize: 14,
  opacity: 0.9,
  theme: 'light',
  ocrLanguage: 'chi_sim+eng',
  translatorEngine: 'microsoft',
  googleTranslateApiKey: '',
  baiduTranslateAppId: '',
  baiduTranslateAppKey: '',
  youdaoTranslateAppKey: '',
  youdaoTranslateAppSecret: ''
};

const ScreenshotTool: React.FC = () => {
  const { setOcrText, setTranslatedText, setImageData, setIsProcessing } = useAppStore();
  const [isSelecting, setIsSelecting] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [shortcutStatus, setShortcutStatus] = useState<{ registered: boolean; shortcut: string }>({ registered: false, shortcut: '' });
  const { tNested } = useI18n();

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

    const savedSettings = localStorage.getItem('screenshotTranslatorSettings');
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (error) {
        console.error('解析设置失败:', error);
      }
    }
  }, []);

  // 清除错误信息
  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // 真实截图功能
  const captureScreenshotFromMain = useCallback(async () => {
    clearError();

    // 检查 Electron API 是否可用
    if (!window.electronAPI?.requestScreenshot) {
      const errorMsg = '截图功能不可用：请确保在 Electron 环境中运行此应用';
      console.error(errorMsg);
      setErrorMessage(errorMsg);
      setTimeout(clearError, 5000);
      return;
    }

    try {
      setLoading(true);
      setIsProcessing(true);
      setProcessingProgress(tNested('screenshot.processingProgress.getting'));
      setProgressPercentage(10);

      // 1. 真实截图
      const screenshotData = await window.electronAPI.requestScreenshot();
      if (!screenshotData) {
        throw new Error('截图失败：无法获取屏幕图像');
      }

      setScreenshot(screenshotData);
      setImageData(screenshotData);
      setProgressPercentage(30);

      // 2. 真实 OCR
      setProcessingProgress(tNested('screenshot.processingProgress.ocr'));
      const ocrResult = await performOCR(screenshotData, settings.ocrLanguage);

      if (!ocrResult || ocrResult.trim() === '') {
        throw new Error('OCR识别失败：未检测到文字');
      }

      setOcrText(ocrResult);
      setProgressPercentage(60);

      // 3. 真实翻译
      setProcessingProgress(tNested('screenshot.processingProgress.translating'));
      const translated = await translateText(
        ocrResult,
        settings.sourceLanguage,
        settings.targetLanguage,
        settings.translatorEngine
      );

      setTranslatedText(translated);
      setProgressPercentage(100);
      setProcessingProgress(tNested('screenshot.processingProgress.completed'));

      // 自动复制到剪贴板
      if (settings.autoCopy && navigator.clipboard) {
        await navigator.clipboard.writeText(translated);
      }

      // 延迟清除进度信息
      setTimeout(() => {
        setProcessingProgress('');
        setProgressPercentage(0);
      }, 1000);

    } catch (error) {
      console.error('截图或处理失败:', error);
      setProcessingProgress('');
      setProgressPercentage(0);

      const errorMsg = error instanceof Error ? error.message : tNested('screenshot.captureFailed');
      setErrorMessage(errorMsg);
      setTimeout(clearError, 5000);
    } finally {
      setLoading(false);
      setIsProcessing(false);
      setIsSelecting(false);
    }
  }, [setOcrText, setTranslatedText, setImageData, setIsProcessing, tNested, clearError, settings]);

  // 取消截图操作
  const cancelScreenshot = useCallback(() => {
    setLoading(false);
    setIsSelecting(false);
    setProcessingProgress('');
    setProgressPercentage(0);
    setErrorMessage('操作已取消');
    setTimeout(clearError, 2000);
  }, [clearError]);

  // 监听全局快捷键（来自主进程）
  useEffect(() => {
    const handleScreenshotRequest = () => {
      if (!loading && !isSelecting) {
        captureScreenshotFromMain();
      }
    };

    window.electronAPI?.onScreenshotRequest?.(handleScreenshotRequest);

    return () => {
      window.electronAPI?.offScreenshotRequest?.();
    };
  }, [captureScreenshotFromMain, loading, isSelecting]);

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

  const startScreenshot = async () => {
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
          onClick={startScreenshot}
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

      {screenshot && (
        <div className="screenshot-preview">
          <h3>{tNested('screenshot.start')}:</h3>
          <img src={screenshot} alt="Screenshot preview" />
        </div>
      )}
    </div>
  );
};

export default ScreenshotTool;