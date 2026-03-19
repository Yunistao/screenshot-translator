import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { translateText, SUPPORTED_LANGUAGES } from '../services/translationService';
import { performOCR } from '../services/ocrService';
import { SelectionArea } from '../types/electron';
import './ToolBar.css';

interface ToolBarProps {
  position: { x: number; y: number };
  selectionArea: SelectionArea;
  screenshotImage: string;
  onClose: () => void;
  onStartEdit: () => void;
}

const ToolBar: React.FC<ToolBarProps> = ({
  position,
  selectionArea,
  screenshotImage,
  onClose,
  onStartEdit,
}) => {
  const {
    setOcrText,
    setTranslatedText,
    languagePair,
    setLanguagePair,
    setIsProcessing,
    setError,
  } = useAppStore();

  const [isTranslating, setIsTranslating] = useState(false);
  const [ocrResult, setOcrResult] = useState<string>('');

  // 获取设置中的翻译引擎
  const getTranslatorEngine = () => {
    const stored = localStorage.getItem('screenshotTranslatorSettings');
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        return settings.translatorEngine || 'microsoft';
      } catch {
        return 'microsoft';
      }
    }
    return 'microsoft';
  };

  // 执行 OCR
  const handleOCR = async (): Promise<string> => {
    if (!screenshotImage || !selectionArea) return '';

    setIsProcessing(true);
    setIsTranslating(true);

    try {
      // 裁剪选择的区域
      const croppedImage = await cropImage(screenshotImage, selectionArea);

      // 执行 OCR
      const text = await performOCR(croppedImage);
      setOcrText(text);
      setOcrResult(text);
      return text;
    } catch (error) {
      console.error('OCR 失败:', error);
      setError('OCR 识别失败');
      return '';
    } finally {
      setIsProcessing(false);
      setIsTranslating(false);
    }
  };

  // OCR + 翻译一键执行
  const handleOCRAndTranslate = async () => {
    const text = await handleOCR();

    if (text) {
      setIsProcessing(true);
      setIsTranslating(true);
      try {
        const engine = getTranslatorEngine();
        const translated = await translateText(
          text,
          languagePair.source,
          languagePair.target,
          engine
        );
        setTranslatedText(translated);
        // 翻译完成后关闭覆盖窗口，返回主窗口显示结果
        onClose();
      } catch (error) {
        console.error('翻译失败:', error);
        setError('翻译失败');
      } finally {
        setIsProcessing(false);
        setIsTranslating(false);
      }
    }
  };

  // 裁剪图片
  const cropImage = (imageData: string, area: SelectionArea): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = area.width;
        canvas.height = area.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取 canvas context'));
          return;
        }
        ctx.drawImage(
          img,
          area.x, area.y, area.width, area.height,
          0, 0, area.width, area.height
        );
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = imageData;
    });
  };

  // 置顶图片
  const handlePin = async () => {
    if (!screenshotImage || !selectionArea) return;

    const croppedImage = await cropImage(screenshotImage, selectionArea);
    await window.electronAPI?.createPinWindow(croppedImage, ocrResult, '');
    onClose();
  };

  // 复制到剪贴板
  const handleCopy = async () => {
    if (!screenshotImage || !selectionArea) return;

    const croppedImage = await cropImage(screenshotImage, selectionArea);

    try {
      // 将 base64 转换为 blob
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  return (
    <div
      className="toolbar"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="toolbar-content">
        {/* 语言选择 */}
        <div className="language-selector">
          <select
            value={languagePair.source}
            onChange={(e) => setLanguagePair({ ...languagePair, source: e.target.value })}
            title="源语言"
          >
            <option value="auto">自动检测</option>
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
          <span className="arrow">→</span>
          <select
            value={languagePair.target}
            onChange={(e) => setLanguagePair({ ...languagePair, target: e.target.value })}
            title="目标语言"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="toolbar-actions">
          <button
            onClick={handleOCRAndTranslate}
            disabled={isTranslating}
            className="btn-primary"
            title="OCR + 翻译"
          >
            {isTranslating ? '处理中...' : '翻译'}
          </button>

          <button
            onClick={handleOCR}
            disabled={isTranslating}
            title="仅 OCR"
          >
            OCR
          </button>

          <button
            onClick={onStartEdit}
            title="标注编辑"
          >
            编辑
          </button>

          <button
            onClick={handlePin}
            title="置顶截图"
          >
            置顶
          </button>

          <button
            onClick={handleCopy}
            title="复制到剪贴板"
          >
            复制
          </button>

          <button
            onClick={onClose}
            className="btn-cancel"
            title="取消 (Esc)"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolBar;