import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { translateText, SUPPORTED_LANGUAGES, type TranslatorEngine } from '../services/translationService';
import { performOCRWithLines } from '../services/ocrService';
import { Annotation, OCRLine, SelectionArea } from '../types/electron';
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
    translationDisplayMode,
    setTranslationDisplayMode,
    setOcrLines,
    annotations,
  } = useAppStore();

  const [isTranslating, setIsTranslating] = useState(false);

  const getTranslatorEngine = (): TranslatorEngine => {
    const stored = localStorage.getItem('screenshotTranslatorSettings');
    if (!stored) {
      return 'microsoft';
    }

    try {
      const settings = JSON.parse(stored) as { translatorEngine?: TranslatorEngine };
      return settings.translatorEngine || 'microsoft';
    } catch {
      return 'microsoft';
    }
  };

  const cropImage = (imageData: string, area: SelectionArea): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = area.width;
        canvas.height = area.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageData;
    });
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  };

  const drawAnnotations = (
    ctx: CanvasRenderingContext2D,
    annotationsToRender: Annotation[],
    offsetX: number,
    offsetY: number,
  ) => {
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const annotation of annotationsToRender) {
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;

      switch (annotation.type) {
        case 'rectangle':
          if (
            annotation.startX !== undefined &&
            annotation.startY !== undefined &&
            annotation.endX !== undefined &&
            annotation.endY !== undefined
          ) {
            const x = Math.min(annotation.startX, annotation.endX) - offsetX;
            const y = Math.min(annotation.startY, annotation.endY) - offsetY;
            const width = Math.abs(annotation.endX - annotation.startX);
            const height = Math.abs(annotation.endY - annotation.startY);
            ctx.strokeRect(x, y, width, height);
          }
          break;
        case 'arrow':
          if (
            annotation.startX !== undefined &&
            annotation.startY !== undefined &&
            annotation.endX !== undefined &&
            annotation.endY !== undefined
          ) {
            drawArrow(
              ctx,
              annotation.startX - offsetX,
              annotation.startY - offsetY,
              annotation.endX - offsetX,
              annotation.endY - offsetY,
            );
          }
          break;
        case 'brush':
          if (annotation.points && annotation.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(annotation.points[0].x - offsetX, annotation.points[0].y - offsetY);
            annotation.points.forEach((point) => {
              ctx.lineTo(point.x - offsetX, point.y - offsetY);
            });
            ctx.stroke();
          }
          break;
        case 'text':
          if (annotation.text && annotation.x !== undefined && annotation.y !== undefined) {
            ctx.font = '16px Arial';
            ctx.fillText(annotation.text, annotation.x - offsetX, annotation.y - offsetY);
          }
          break;
      }
    }
  };

  const composePinnedImage = async (imageData: string, area: SelectionArea): Promise<string> => {
    const croppedImage = await cropImage(imageData, area);

    if (annotations.length === 0) {
      return croppedImage;
    }

    const img = new Image();
    img.src = croppedImage;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load cropped image'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = area.width;
    canvas.height = area.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return croppedImage;
    }

    ctx.drawImage(img, 0, 0, area.width, area.height);
    drawAnnotations(ctx, annotations, area.x, area.y);

    return canvas.toDataURL('image/png');
  };

  const handleOCRAndTranslate = async () => {
    if (!screenshotImage || !selectionArea) {
      return;
    }

    setIsProcessing(true);
    setIsTranslating(true);

    try {
      const croppedImage = await cropImage(screenshotImage, selectionArea);
      const ocrResult = await performOCRWithLines(croppedImage);

      setOcrText(ocrResult.text);
      setOcrLines(ocrResult.lines);

      if (ocrResult.lines.length === 0) {
        setError('OCR 未识别到文字');
        return;
      }

      const engine = getTranslatorEngine();
      const translatedLines: OCRLine[] = [];

      for (const line of ocrResult.lines) {
        try {
          const translated = await translateText(line.text, languagePair.source, languagePair.target, engine);
          translatedLines.push({
            ...line,
            translatedText: translated,
          });
        } catch {
          translatedLines.push({
            ...line,
            translatedText: '[翻译失败]',
          });
        }
      }

      setOcrLines(translatedLines);
      setTranslatedText(translatedLines.map((line) => line.translatedText).join('\n'));
      setShowTranslationResult(true);
      onTranslationComplete?.();
    } catch (error) {
      console.error('[翻译] OCR + 翻译流程失败:', error);
      setError('翻译失败');
    } finally {
      setIsProcessing(false);
      setIsTranslating(false);
    }
  };

  const handlePin = async () => {
    if (!screenshotImage || !selectionArea) {
      return;
    }

    const pinnedImage = await composePinnedImage(screenshotImage, selectionArea);
    await window.electronAPI?.createPinWindow(pinnedImage);
    onClose();
  };

  const handleCopy = async () => {
    if (!screenshotImage || !selectionArea) {
      return;
    }

    const croppedImage = await cropImage(screenshotImage, selectionArea);

    try {
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleCopyTranslation = () => {
    const { translatedText } = useAppStore.getState();
    if (translatedText) {
      navigator.clipboard.writeText(translatedText);
    }
  };

  const handleFinish = () => {
    setShowTranslationResult(false);
    onClose();
  };

  const handleToggleTranslationMode = () => {
    setTranslationDisplayMode(translationDisplayMode === 'inline' ? 'list' : 'inline');
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
        <div className="language-selector">
          <select
            value={languagePair.source}
            onChange={(e) => setLanguagePair({ ...languagePair, source: e.target.value })}
            title="源语言"
          >
            <option value="auto">自动检测</option>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>

          <span className="arrow">→</span>

          <select
            value={languagePair.target}
            onChange={(e) => setLanguagePair({ ...languagePair, target: e.target.value })}
            title="目标语言"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-actions">
          {showTranslationResult ? (
            <>
              <button onClick={() => setShowTranslationResult(false)} className="btn-primary" title="重新翻译">
                重译
              </button>

              <button onClick={handleCopyTranslation} title="复制译文">
                复制译文
              </button>

              <button
                data-testid="translation-mode-toggle"
                onClick={handleToggleTranslationMode}
                title={translationDisplayMode === 'inline' ? '切换为列表展示' : '切换为原位覆盖'}
              >
                {translationDisplayMode === 'inline' ? '列表' : '原位'}
              </button>

              <button data-testid="pin-button" onClick={handlePin} title="置顶截图">
                置顶
              </button>

              <button onClick={handleFinish} className="btn-primary" title="完成">
                完成
              </button>

              <button onClick={onClose} className="btn-cancel" title="取消 (Esc)">
                取消
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleOCRAndTranslate}
                disabled={isTranslating}
                className="btn-primary"
                title="OCR + 翻译"
              >
                {isTranslating ? '处理中...' : '翻译'}
              </button>

              <button onClick={onStartEdit} title="标注编辑">
                编辑
              </button>

              <button data-testid="pin-button" onClick={handlePin} title="置顶截图">
                置顶
              </button>

              <button onClick={handleCopy} title="复制到剪贴板">
                复制
              </button>

              <button onClick={onClose} className="btn-cancel" title="取消 (Esc)">
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
