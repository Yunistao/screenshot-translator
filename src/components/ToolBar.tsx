import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import {
  translateText,
  SUPPORTED_LANGUAGES,
  DEFAULT_TRANSLATOR_ENGINE,
  normalizeTranslatorEngine,
  type TranslatorEngine,
} from '../services/translationService';
import { performOCRWithLines } from '../services/ocrService';
import { renderSelectionExport, renderSelectionExportBlob } from '../services/selectionExport';
import { OCRLine, SelectionArea } from '../types/electron';
import './ToolBar.css';

interface ToolBarProps {
  position: { x: number; y: number };
  selectionArea: SelectionArea;
  screenshotImage: string;
  onClose: (options?: { restoreMainWindow?: boolean }) => void;
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
    ocrLines,
    setOcrLines,
    annotations,
  } = useAppStore();

  const [isTranslating, setIsTranslating] = useState(false);

  const getTranslatorEngine = (): TranslatorEngine => {
    const stored = localStorage.getItem('screenshotTranslatorSettings');
    if (!stored) {
      return DEFAULT_TRANSLATOR_ENGINE;
    }

    try {
      const parsed = JSON.parse(stored) as unknown;
      if (!parsed || typeof parsed !== 'object') {
        return DEFAULT_TRANSLATOR_ENGINE;
      }

      const settings = parsed as Record<string, unknown>;
      const normalizedEngine = normalizeTranslatorEngine(settings.translatorEngine);

      if (settings.translatorEngine !== normalizedEngine) {
        localStorage.setItem(
          'screenshotTranslatorSettings',
          JSON.stringify({
            ...settings,
            translatorEngine: normalizedEngine,
          }),
        );
      }

      return normalizedEngine;
    } catch {
      return DEFAULT_TRANSLATOR_ENGINE;
    }
  };

  const shouldIncludeTranslation = showTranslationResult && ocrLines.some((line) => line.translatedText?.trim());

  const renderCurrentSelection = async () =>
    renderSelectionExport({
      screenshotImage,
      selectionArea,
      annotations,
      ocrLines,
      includeTranslation: shouldIncludeTranslation,
    });

  const handleOCRAndTranslate = async () => {
    if (!screenshotImage || !selectionArea) {
      return;
    }

    setIsProcessing(true);
    setIsTranslating(true);

    try {
      const croppedImage = await renderSelectionExport({
        screenshotImage,
        selectionArea,
        annotations: [],
        ocrLines: [],
        includeTranslation: false,
      });
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

    const pinnedImage = await renderCurrentSelection();
    await window.electronAPI?.createPinWindow(pinnedImage);
    onClose({ restoreMainWindow: false });
  };

  const handleCopy = async () => {
    if (!screenshotImage || !selectionArea) {
      return;
    }

    try {
      const blob = await renderSelectionExportBlob({
        screenshotImage,
        selectionArea,
        annotations,
        ocrLines,
        includeTranslation: shouldIncludeTranslation,
      });
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      onClose({ restoreMainWindow: false });
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
    onClose({ restoreMainWindow: false });
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

              <button onClick={() => onClose()} className="btn-cancel" title="取消 (Esc)">
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

              <button onClick={() => onClose()} className="btn-cancel" title="取消 (Esc)">
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
