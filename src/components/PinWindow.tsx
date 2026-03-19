import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { PinWindowData } from '../types/electron';
import './PinWindow.css';

interface PinWindowState {
  imageData: string;
  ocrText: string;
  translatedText: string;
}

const PinWindow: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PinWindowData | null>(null);
  const [showText, setShowText] = useState<'image' | 'ocr' | 'translated'>('image');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 400, height: 300 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const {
    setOcrText,
    setTranslatedText,
    languagePair,
  } = useAppStore();

  // 监听置顶窗口数据
  useEffect(() => {
    const handlePinWindowData = (_event: any, windowData: PinWindowData) => {
      setData(windowData);
    };

    window.electronAPI?.onPinWindowData(handlePinWindowData);

    return () => {
      window.electronAPI?.offPinWindowData?.();
    };
  }, []);

  // 拖动功能
  const handleDragStart = (e: React.MouseEvent) => {
    if (isResizing) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  }, [isDragging, dragOffset]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 缩放功能
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    setSize({
      width: Math.max(200, resizeStart.width + deltaX),
      height: Math.max(150, resizeStart.height + deltaY),
    });
  }, [isResizing, resizeStart]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 全局鼠标事件
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isDragging, isResizing, handleDragMove, handleDragEnd, handleResizeMove, handleResizeEnd]);

  // 关闭窗口
  const handleClose = async () => {
    // 在实际 Electron 窗口中关闭
    const { remote } = require('electron');
    const currentWindow = remote?.getCurrentWindow();
    if (currentWindow) {
      currentWindow.close();
    }
  };

  // 复制图片
  const handleCopyImage = async () => {
    if (!data?.imageData) return;

    try {
      const response = await fetch(data.imageData);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
    } catch (error) {
      console.error('复制图片失败:', error);
    }
  };

  // 复制文本
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // 发送到主窗口
  const handleSendToMainWindow = () => {
    if (!data) return;
    setOcrText(data.ocrText);
    setTranslatedText(data.translatedText);
  };

  if (!data) {
    return (
      <div className="pin-window loading">
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`pin-window ${isMinimized ? 'minimized' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? 'auto' : size.width,
        height: isMinimized ? 'auto' : size.height,
      }}
    >
      {/* 标题栏 */}
      <div className="pin-titlebar" onMouseDown={handleDragStart}>
        <div className="pin-title">
          {isMinimized ? '截图' : '置顶截图'}
        </div>
        <div className="pin-controls">
          <button
            className="control-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? '展开' : '最小化'}
          >
            {isMinimized ? '□' : '−'}
          </button>
          <button
            className="control-btn close"
            onClick={handleClose}
            title="关闭"
          >
            ×
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {!isMinimized && (
        <div className="pin-content">
          {/* 显示切换按钮 */}
          <div className="pin-tabs">
            <button
              className={showText === 'image' ? 'active' : ''}
              onClick={() => setShowText('image')}
            >
              图片
            </button>
            {data.ocrText && (
              <button
                className={showText === 'ocr' ? 'active' : ''}
                onClick={() => setShowText('ocr')}
              >
                原文
              </button>
            )}
            {data.translatedText && (
              <button
                className={showText === 'translated' ? 'active' : ''}
                onClick={() => setShowText('translated')}
              >
                译文
              </button>
            )}
          </div>

          {/* 内容显示 */}
          <div className="pin-body">
            {showText === 'image' && (
              <div className="pin-image-container">
                <img
                  src={data.imageData}
                  alt="截图"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
            )}
            {showText === 'ocr' && (
              <div className="pin-text">
                <pre>{data.ocrText}</pre>
              </div>
            )}
            {showText === 'translated' && (
              <div className="pin-text">
                <pre>{data.translatedText}</pre>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="pin-actions">
            <button onClick={handleCopyImage} title="复制图片">
              复制图片
            </button>
            {showText !== 'image' && (
              <button onClick={() => handleCopyText(showText === 'ocr' ? data.ocrText : data.translatedText)}>
                复制文本
              </button>
            )}
            <button onClick={handleSendToMainWindow} title="发送到主窗口">
              发送
            </button>
          </div>

          {/* 缩放手柄 */}
          <div
            className="resize-handle"
            onMouseDown={handleResizeStart}
          />
        </div>
      )}
    </div>
  );
};

export default PinWindow;