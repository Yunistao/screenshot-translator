import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { performOCR } from '../services/ocrService';
import { translateText } from '../services/translationService';
import { imageManager } from '../services/imageManager';
import { useI18n } from '../i18n/I18nContext';

const ScreenshotTool: React.FC = () => {
  const { setOcrText, setTranslatedText, setImageData } = useAppStore();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<string>('');
  const { tNested } = useI18n();

  // 使用 Electron 主进程的截图功能
  const captureScreenshotFromMain = useCallback(async () => {
    try {
      setProcessingProgress(tNested('screenshot.processingProgress.getting'));

      // 使用主进程提供的截图功能
      const screenshotData = await (window as any).electronAPI.requestScreenshot();
      setScreenshot(screenshotData);
      setImageData(screenshotData);

      setProcessingProgress(tNested('screenshot.processingProgress.ocr'));

      // 执行OCR识别
      const ocrResult = await performOCR(screenshotData);
      setOcrText(ocrResult);

      setProcessingProgress(tNested('screenshot.processingProgress.translating'));

      // 执行翻译
      if (ocrResult) {
        const translated = await translateText(ocrResult);
        setTranslatedText(translated);

        // 将结果添加到历史记录
        imageManager.addImage(screenshotData, ocrResult, translated, 'auto', 'zh-Hans');
      }

      setProcessingProgress(tNested('screenshot.processingProgress.completed'));
    } catch (error) {
      console.error('截图或处理失败:', error);
      setProcessingProgress('');
      alert(tNested('screenshot.captureFailed'));
    } finally {
      setLoading(false);
      setIsSelecting(false);
    }
  }, [setOcrText, setTranslatedText, setImageData, tNested]);

  // 处理来自主进程的截图请求
  useEffect(() => {
    const handleScreenshotRequest = () => {
      captureScreenshotFromMain();
    };

    // 监听主进程发出的截图请求
    (window as any).electronAPI.onScreenshotRequest(handleScreenshotRequest);

    // 注册键盘事件处理器
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        captureScreenshotFromMain();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // 清理事件监听器
      (window as any).electronAPI.offScreenshotRequest();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [captureScreenshotFromMain]);

  const startScreenshot = () => {
    setIsSelecting(true);
    setSelectionStart(null);
    setSelectionEnd(null);
    setScreenshot(null);

    // 请求主进程执行截图
    captureScreenshotFromMain();
  };

  return (
    <div className="screenshot-tool">
      <button onClick={startScreenshot} disabled={isSelecting || loading}>
        {loading ? tNested('screenshot.processing') : isSelecting ? tNested('screenshot.selecting') : tNested('screenshot.altKey')}
      </button>

      {processingProgress && (
        <div className="processing-indicator">
          {processingProgress}
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