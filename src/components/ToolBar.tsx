import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { translateText, SUPPORTED_LANGUAGES } from '../services/translationService';
import { performOCRWithLines } from '../services/ocrService';
import { SelectionArea, OCRLine } from '../types/electron';
import './ToolBar.css';

interface ToolBarProps {
  position: { x: number; y: number };
  selectionArea: SelectionArea;
  screenshotImage: string;
  onClose: () => void;
  onStartEdit: () => void;
  onTranslationComplete?: () => void;
}

const ToolBar: React.FC<ToolBarProps> = ({
  position,
  selectionArea,
  screenshotImage,
  onClose,
  onStartEdit,
  onTranslationComplete,
}) => {
  const {
    setOcrText,
    setTranslatedText,
    languagePair,
    setLanguagePair,
    setIsProcessing,
    setError,
    setShowTranslationResult,
    showTranslationResult,
    setOcrLines,
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

  // 执行 OCR（返回行级数据）
  const handleOCR = async (): Promise<OCRLine[]> => {
    if (!screenshotImage || !selectionArea) {
      console.log('[OCR] 缺少截图数据或选择区域');
      return [];
    }

    setIsProcessing(true);
    setIsTranslating(true);

    try {
      // 裁剪选择的区域
      const croppedImage = await cropImage(screenshotImage, selectionArea);
      console.log('[OCR] 裁剪图片完成');

      // 执行 OCR（带行级位置）
      const result = await performOCRWithLines(croppedImage);
      console.log('[OCR] OCR 结果:', result.text, '行数:', result.lines.length);

      setOcrText(result.text);
      setOcrResult(result.text);
      setOcrLines(result.lines);
      return result.lines;
    } catch (error) {
      console.error('[OCR] OCR 失败:', error);
      setError('OCR 识别失败');
      return [];
    } finally {
      setIsProcessing(false);
      setIsTranslating(false);
    }
  };

  // OCR + 翻译一键执行（行级翻译）
  const handleOCRAndTranslate = async () => {
    console.log('[翻译] 开始 OCR + 翻译流程');
    if (!screenshotImage || !selectionArea) {
      console.log('[翻译] 缺少截图数据或选择区域');
      return;
    }

    setIsProcessing(true);
    setIsTranslating(true);

    try {
      // 裁剪选择的区域
      const croppedImage = await cropImage(screenshotImage, selectionArea);
      console.log('[翻译] 裁剪图片完成');

      // 执行 OCR，获取行级数据
      const ocrResult = await performOCRWithLines(croppedImage);
      console.log('[翻译] OCR 识别到', ocrResult.lines.length, '行文字');

      setOcrText(ocrResult.text);
      setOcrLines(ocrResult.lines);

      if (ocrResult.lines.length === 0) {
        setError('OCR 未识别到文字');
        return;
      }

      // 获取翻译引擎
      const engine = getTranslatorEngine();
      console.log('[翻译] 使用引擎:', engine);
      console.log('[翻译] 语言对:', languagePair.source, '->', languagePair.target);

      // 按行翻译
      const translatedLines: OCRLine[] = [];
      for (let i = 0; i < ocrResult.lines.length; i++) {
        const line = ocrResult.lines[i];
        console.log(`[翻译] 翻译第 ${i + 1} 行:`, line.text);

        try {
          const translated = await translateText(
            line.text,
            languagePair.source,
            languagePair.target,
            engine
          );
          translatedLines.push({
            ...line,
            translatedText: translated,
          });
          console.log(`[翻译] 第 ${i + 1} 行翻译结果:`, translated);
        } catch (err) {
          console.error(`[翻译] 第 ${i + 1} 行翻译失败:`, err);
          translatedLines.push({
            ...line,
            translatedText: '[翻译失败]',
          });
        }
      }

      // 更新 store
      setOcrLines(translatedLines);
      setTranslatedText(translatedLines.map(l => l.translatedText).join('\n'));

      // 显示翻译结果层
      setShowTranslationResult(true);
      if (onTranslationComplete) {
        onTranslationComplete();
      }
    } catch (error) {
      console.error('[翻译] 翻译流程失败:', error);
      setError('翻译失败');
    } finally {
      setIsProcessing(false);
      setIsTranslating(false);
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

  // 复制译文到剪贴板
  const handleCopyTranslation = () => {
    const { translatedText } = useAppStore.getState();
    if (translatedText) {
      navigator.clipboard.writeText(translatedText);
    }
  };

  // 关闭翻译结果并关闭窗口
  const handleFinish = () => {
    setShowTranslationResult(false);
    onClose();
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

        {/* 操作按钮 - 根据翻译状态显示不同按钮 */}
        <div className="toolbar-actions">
          {showTranslationResult ? (
            // 翻译完成后显示的按钮
            <>
              <button
                onClick={() => setShowTranslationResult(false)}
                className="btn-primary"
                title="重新翻译"
              >
                重译
              </button>

              <button
                onClick={handleCopyTranslation}
                title="复制译文"
              >
                复制译文
              </button>

              <button
                onClick={handlePin}
                title="置顶截图"
              >
                置顶
              </button>

              <button
                onClick={handleFinish}
                className="btn-primary"
                title="完成"
              >
                完成
              </button>

              <button
                onClick={onClose}
                className="btn-cancel"
                title="取消 (Esc)"
              >
                取消
              </button>
            </>
          ) : (
            // 默认显示的按钮
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolBar;