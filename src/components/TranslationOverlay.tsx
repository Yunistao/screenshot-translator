import React, { useState, useRef, useCallback } from 'react';
import { SelectionArea, OCRLine } from '../types/electron';
import './TranslationOverlay.css';

interface TranslationOverlayProps {
  selectionArea: SelectionArea;
  ocrLines: OCRLine[];
  mode?: 'inline' | 'list';
  position?: 'above' | 'below' | 'overlay';
  onClose?: () => void;
  onCopyText?: (text: string) => void;
}

const TranslationOverlay: React.FC<TranslationOverlayProps> = ({
  selectionArea,
  ocrLines,
  mode = 'list',
  position = 'overlay',
  onClose,
  onCopyText,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [positionOffset, setPositionOffset] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  const translatedLines = ocrLines.filter((line) => line.translatedText);

  const getContainerStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 100,
      pointerEvents: 'auto',
    };

    if (position === 'overlay') {
      return {
        ...baseStyle,
        left: selectionArea.x + positionOffset.x,
        top: selectionArea.y + positionOffset.y,
        width: selectionArea.width,
      };
    }

    return {
      ...baseStyle,
      left: selectionArea.x + positionOffset.x,
      top: selectionArea.y + selectionArea.height + 10 + positionOffset.y,
      width: Math.max(selectionArea.width, 200),
    };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.translation-close, .translation-copy-btn, .translation-line')) {
      return;
    }

    setIsDragging(true);
    const rect = overlayRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) {
        return;
      }

      setPositionOffset({
        x: e.clientX - selectionArea.x - dragOffset.x,
        y: e.clientY - selectionArea.y - dragOffset.y,
      });
    },
    [isDragging, dragOffset, selectionArea],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    onCopyText?.(text);
  };

  const copyAll = () => {
    copyText(translatedLines.map((line) => line.translatedText).join('\n'));
  };

  if (!ocrLines || ocrLines.length === 0) {
    return null;
  }

  if (mode === 'inline') {
    return (
      <div className="translation-inline-layer">
        {translatedLines.map((line, index) => {
          const width = Math.max(40, line.bbox.x1 - line.bbox.x0);
          const height = Math.max(20, line.bbox.y1 - line.bbox.y0);

          return (
            <div
              key={index}
              className="translation-inline-item"
              style={{
                left: selectionArea.x + line.bbox.x0,
                top: selectionArea.y + line.bbox.y0,
                width,
                minHeight: height,
              }}
              title={line.text}
            >
              {line.translatedText}
            </div>
          );
        })}
        <div className="translation-inline-actions">
          <button className="translation-copy-btn" onClick={copyAll} title="复制全部译文">
            复制全部
          </button>
          {onClose && (
            <button className="translation-close" onClick={onClose} title="关闭">
              ×
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={overlayRef}
      className={`translation-overlay ${isDragging ? 'dragging' : ''}`}
      style={getContainerStyle()}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="translation-card">
        <div className="translation-header">
          <span className="translation-title">翻译结果</span>
          <div className="translation-header-actions">
            <button className="translation-copy-all-btn" onClick={copyAll} title="复制全部译文">
              复制全部
            </button>
            {onClose && (
              <button className="translation-close" onClick={onClose} title="关闭">
                ×
              </button>
            )}
          </div>
        </div>

        <div className="translation-lines">
          {ocrLines.map((line, index) => (
            <div key={index} className="translation-line">
              <div className="translation-line-original">
                <span className="line-number">{index + 1}</span>
                <span className="line-text">{line.text}</span>
              </div>

              {line.translatedText && (
                <div className="translation-line-translated">
                  <span className="line-arrow">→</span>
                  <span className="line-text translated">{line.translatedText}</span>
                  <button
                    className="translation-copy-btn small"
                    onClick={() => copyText(line.translatedText!)}
                    title="复制此行译文"
                  >
                    复制
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="translation-drag-hint">拖动可移动位置</div>
      </div>
    </div>
  );
};

export default TranslationOverlay;

