import React, { useState, useRef, useCallback } from 'react';
import { SelectionArea, OCRLine } from '../types/electron';
import './TranslationOverlay.css';

interface TranslationOverlayProps {
  selectionArea: SelectionArea;
  ocrLines: OCRLine[];
  position?: 'above' | 'below' | 'overlay';
  onClose?: () => void;
  onCopyText?: (text: string) => void;
}

const TranslationOverlay: React.FC<TranslationOverlayProps> = ({
  selectionArea,
  ocrLines,
  position = 'overlay',
  onClose,
  onCopyText,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [positionOffset, setPositionOffset] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // 计算容器位置
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

  // 开始拖动
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

  // 拖动中
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const newOffset = {
      x: e.clientX - selectionArea.x - dragOffset.x,
      y: e.clientY - selectionArea.y - dragOffset.y,
    };
    setPositionOffset(newOffset);
  }, [isDragging, dragOffset, selectionArea]);

  // 结束拖动
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 复制文本
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    if (onCopyText) {
      onCopyText(text);
    }
  };

  // 复制所有译文
  const handleCopyAll = () => {
    const allTranslated = ocrLines
      .filter(line => line.translatedText)
      .map(line => line.translatedText)
      .join('\n');
    handleCopy(allTranslated);
  };

  // 如果没有数据，不渲染
  if (!ocrLines || ocrLines.length === 0) {
    return null;
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
        {/* 标题栏 */}
        <div className="translation-header">
          <span className="translation-title">翻译结果</span>
          <div className="translation-header-actions">
            <button
              className="translation-copy-all-btn"
              onClick={handleCopyAll}
              title="复制全部译文"
            >
              复制全部
            </button>
            {onClose && (
              <button className="translation-close" onClick={onClose} title="关闭">
                ×
              </button>
            )}
          </div>
        </div>

        {/* 行级翻译列表 */}
        <div className="translation-lines">
          {ocrLines.map((line, index) => (
            <div key={index} className="translation-line">
              {/* 原文 */}
              <div className="translation-line-original">
                <span className="line-number">{index + 1}</span>
                <span className="line-text">{line.text}</span>
              </div>

              {/* 译文 */}
              {line.translatedText && (
                <div className="translation-line-translated">
                  <span className="line-arrow">→</span>
                  <span className="line-text translated">{line.translatedText}</span>
                  <button
                    className="translation-copy-btn small"
                    onClick={() => handleCopy(line.translatedText!)}
                    title="复制此行译文"
                  >
                    复制
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 拖动提示 */}
        <div className="translation-drag-hint">
          拖动移动位置
        </div>
      </div>
    </div>
  );
};

export default TranslationOverlay;