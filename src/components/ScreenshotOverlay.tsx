import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import ToolBar from './ToolBar';
import AnnotationEditor from './AnnotationEditor';
import TranslationOverlay from './TranslationOverlay';
import { SelectionArea } from '../types/electron';
import './ScreenshotOverlay.css';

interface Point {
  x: number;
  y: number;
}

// 调整手柄类型
type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null;

const HANDLE_SIZE = 8; // 手柄大小

const ScreenshotOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    screenshotImage,
    setScreenshotImage,
    selectionArea,
    setSelectionArea,
    isSelecting,
    setIsSelecting,
    annotations,
    showToolbar,
    setShowToolbar,
    toolbarPosition,
    setToolbarPosition,
    showTranslationResult,
    setShowTranslationResult,
    translationDisplayMode,
    ocrLines,
  } = useAppStore();

  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [, setCurrentPoint] = useState<Point | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const [resizeStart, setResizeStart] = useState<{ area: SelectionArea; point: Point } | null>(null);

  // 监听截图数据
  useEffect(() => {
    const handleScreenshotCaptured = (imageData: string) => {
      setScreenshotImage(imageData);
    };

    window.electronAPI?.onScreenshotCaptured(handleScreenshotCaptured);

    return () => {
      window.electronAPI?.offScreenshotCaptured?.();
    };
  }, [setScreenshotImage]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 绘制画布
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !screenshotImage) return;

    const img = new Image();
    img.onload = () => {
      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制截图背景
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 绘制半透明遮罩
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 如果有选择区域，清除遮罩并绘制选择框
      if (selectionArea && selectionArea.width > 0 && selectionArea.height > 0) {
        // 清除选择区域的遮罩
        ctx.clearRect(selectionArea.x, selectionArea.y, selectionArea.width, selectionArea.height);
        ctx.drawImage(
          img,
          selectionArea.x, selectionArea.y, selectionArea.width, selectionArea.height,
          selectionArea.x, selectionArea.y, selectionArea.width, selectionArea.height
        );

        // 绘制选择框边框
        ctx.strokeStyle = '#00a8ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(selectionArea.x, selectionArea.y, selectionArea.width, selectionArea.height);

        // 绘制尺寸标签
        const sizeText = `${Math.round(selectionArea.width)} × ${Math.round(selectionArea.height)}`;
        ctx.font = '12px Arial';
        ctx.fillStyle = '#00a8ff';
        const textWidth = ctx.measureText(sizeText).width;
        const labelX = selectionArea.x + (selectionArea.width - textWidth) / 2;
        const labelY = selectionArea.y - 5;
        ctx.fillText(sizeText, labelX, labelY > 15 ? labelY : selectionArea.y + 15);

        // 绘制调整手柄
        const handleSize = 8;
        ctx.fillStyle = '#00a8ff';
        const handles = [
          { x: selectionArea.x, y: selectionArea.y },
          { x: selectionArea.x + selectionArea.width, y: selectionArea.y },
          { x: selectionArea.x, y: selectionArea.y + selectionArea.height },
          { x: selectionArea.x + selectionArea.width, y: selectionArea.y + selectionArea.height },
        ];
        handles.forEach(h => {
          ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
        });
      }

      // 绘制标注
      annotations.forEach(annotation => {
        ctx.strokeStyle = annotation.color;
        ctx.fillStyle = annotation.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);

        switch (annotation.type) {
          case 'rectangle':
            if (annotation.startX !== undefined && annotation.startY !== undefined &&
                annotation.endX !== undefined && annotation.endY !== undefined) {
              const rx = Math.min(annotation.startX, annotation.endX);
              const ry = Math.min(annotation.startY, annotation.endY);
              const rw = Math.abs(annotation.endX - annotation.startX);
              const rh = Math.abs(annotation.endY - annotation.startY);
              ctx.strokeRect(rx, ry, rw, rh);
            }
            break;
          case 'arrow':
            if (annotation.startX !== undefined && annotation.startY !== undefined &&
                annotation.endX !== undefined && annotation.endY !== undefined) {
              drawArrow(ctx, annotation.startX, annotation.startY, annotation.endX, annotation.endY);
            }
            break;
          case 'brush':
            if (annotation.points && annotation.points.length > 1) {
              ctx.beginPath();
              ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
              annotation.points.forEach(p => ctx.lineTo(p.x, p.y));
              ctx.stroke();
            }
            break;
          case 'text':
            if (annotation.text && annotation.x !== undefined && annotation.y !== undefined) {
              ctx.font = '16px Arial';
              ctx.fillText(annotation.text, annotation.x, annotation.y);
            }
            break;
        }
      });
    };
    img.src = screenshotImage;
  }, [screenshotImage, selectionArea, annotations]);

  // 绘制箭头
  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // 箭头头部
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  // 绘制画布
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // 检测鼠标是否在手柄上
  const getHandleAtPoint = useCallback((x: number, y: number): ResizeHandle => {
    if (!selectionArea) return null;

    const handles: { handle: ResizeHandle; x: number; y: number }[] = [
      { handle: 'top-left', x: selectionArea.x, y: selectionArea.y },
      { handle: 'top-right', x: selectionArea.x + selectionArea.width, y: selectionArea.y },
      { handle: 'bottom-left', x: selectionArea.x, y: selectionArea.y + selectionArea.height },
      { handle: 'bottom-right', x: selectionArea.x + selectionArea.width, y: selectionArea.y + selectionArea.height },
    ];

    for (const h of handles) {
      if (
        x >= h.x - HANDLE_SIZE &&
        x <= h.x + HANDLE_SIZE &&
        y >= h.y - HANDLE_SIZE &&
        y <= h.y + HANDLE_SIZE
      ) {
        return h.handle;
      }
    }
    return null;
  }, [selectionArea]);

  // 获取鼠标光标样式
  const getCursorStyle = useCallback((handle: ResizeHandle): string => {
    switch (handle) {
      case 'top-left':
      case 'bottom-right':
        return 'nwse-resize';
      case 'top-right':
      case 'bottom-left':
        return 'nesw-resize';
      default:
        return 'crosshair';
    }
  }, []);

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 检查是否点击了调整手柄
    const handle = getHandleAtPoint(x, y);
    if (handle && selectionArea) {
      setIsResizing(true);
      setActiveHandle(handle);
      setResizeStart({ area: { ...selectionArea }, point: { x, y } });
      setShowToolbar(false);
      return;
    }

    // 如果点击在选择区域外，开始新的选择
    if (showToolbar) {
      // 点击工具栏外，不开始新选择
      return;
    }

    setIsSelecting(true);
    setStartPoint({ x, y });
    setCurrentPoint({ x, y });
    setSelectionArea(null);
    setShowToolbar(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 处理调整大小
    if (isResizing && activeHandle && resizeStart && selectionArea) {
      const deltaX = x - resizeStart.point.x;
      const deltaY = y - resizeStart.point.y;

      let newX = resizeStart.area.x;
      let newY = resizeStart.area.y;
      let newWidth = resizeStart.area.width;
      let newHeight = resizeStart.area.height;

      switch (activeHandle) {
        case 'top-left':
          newX = resizeStart.area.x + deltaX;
          newY = resizeStart.area.y + deltaY;
          newWidth = resizeStart.area.width - deltaX;
          newHeight = resizeStart.area.height - deltaY;
          break;
        case 'top-right':
          newY = resizeStart.area.y + deltaY;
          newWidth = resizeStart.area.width + deltaX;
          newHeight = resizeStart.area.height - deltaY;
          break;
        case 'bottom-left':
          newX = resizeStart.area.x + deltaX;
          newWidth = resizeStart.area.width - deltaX;
          newHeight = resizeStart.area.height + deltaY;
          break;
        case 'bottom-right':
          newWidth = resizeStart.area.width + deltaX;
          newHeight = resizeStart.area.height + deltaY;
          break;
      }

      // 确保最小尺寸
      if (newWidth >= 10 && newHeight >= 10) {
        setSelectionArea({
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      }
      return;
    }

    // 处理新选择
    if (!isSelecting || !startPoint) {
      // 更新光标样式
      if (selectionArea && !isEditing) {
        const handle = getHandleAtPoint(x, y);
        if (canvasRef.current) {
          canvasRef.current.style.cursor = getCursorStyle(handle);
        }
      }
      return;
    }

    setCurrentPoint({ x, y });

    const newSelection = {
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y),
    };
    setSelectionArea(newSelection);
  };

  const handleMouseUp = () => {
    // 完成调整大小
    if (isResizing) {
      setIsResizing(false);
      setActiveHandle(null);
      setResizeStart(null);

      // 显示工具栏
      if (selectionArea && selectionArea.width > 10 && selectionArea.height > 10) {
        const toolbarX = selectionArea.x + (selectionArea.width - 300) / 2;
        const toolbarY = selectionArea.y + selectionArea.height + 10;
        setToolbarPosition({
          x: Math.max(10, Math.min(toolbarX, windowSize.width - 310)),
          y: Math.min(toolbarY, windowSize.height - 50),
        });
        setShowToolbar(true);
      }
      return;
    }

    if (!isSelecting || !selectionArea) return;

    setIsSelecting(false);
    setStartPoint(null);
    setCurrentPoint(null);

    // 如果选择区域足够大，显示工具栏
    if (selectionArea.width > 10 && selectionArea.height > 10) {
      // 计算工具栏位置（在选择区域下方居中）
      const toolbarX = selectionArea.x + (selectionArea.width - 300) / 2;
      const toolbarY = selectionArea.y + selectionArea.height + 10;
      setToolbarPosition({
        x: Math.max(10, Math.min(toolbarX, windowSize.width - 310)),
        y: Math.min(toolbarY, windowSize.height - 50),
      });
      setShowToolbar(true);
    }
  };

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 关闭覆盖窗口
  const handleClose = async () => {
    setScreenshotImage(null);
    setSelectionArea(null);
    setShowToolbar(false);
    setIsEditing(false);
    await window.electronAPI?.closeScreenshotOverlay();
  };

  // 开始编辑模式
  const handleStartEdit = () => {
    setIsEditing(true);
    setShowToolbar(false);
  };

  // 完成编辑
  const handleFinishEdit = () => {
    setIsEditing(false);
    if (selectionArea) {
      const toolbarX = selectionArea.x + (selectionArea.width - 300) / 2;
      const toolbarY = selectionArea.y + selectionArea.height + 10;
      setToolbarPosition({
        x: Math.max(10, Math.min(toolbarX, windowSize.width - 310)),
        y: Math.min(toolbarY, windowSize.height - 50),
      });
      setShowToolbar(true);
    }
  };

  if (!screenshotImage) {
    return (
      <div className="screenshot-overlay loading">
        <div className="loading-spinner">加载中...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="screenshot-overlay">
      {/* 编辑模式下隐藏主 canvas 的鼠标事件 */}
      <canvas
        ref={canvasRef}
        width={windowSize.width}
        height={windowSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          cursor: isEditing ? 'default' : 'crosshair',
          pointerEvents: isEditing ? 'none' : 'auto'
        }}
      />

      {isEditing && selectionArea && (
        <AnnotationEditor
          selectionArea={selectionArea}
          screenshotImage={screenshotImage}
          onFinish={handleFinishEdit}
        />
      )}

      {/* 翻译结果叠加层 - 行级显示 */}
      {showTranslationResult && selectionArea && ocrLines && ocrLines.length > 0 && (
        <TranslationOverlay
          selectionArea={selectionArea}
          ocrLines={ocrLines}
          mode={translationDisplayMode}
          position={translationDisplayMode === 'list' ? 'below' : 'overlay'}
          onClose={() => setShowTranslationResult(false)}
        />
      )}

      {showToolbar && !isEditing && selectionArea && (
        <ToolBar
          position={toolbarPosition}
          selectionArea={selectionArea}
          screenshotImage={screenshotImage}
          onClose={handleClose}
          onStartEdit={handleStartEdit}
          onTranslationComplete={() => {
            // 翻译完成后更新工具栏位置
            if (selectionArea) {
              const toolbarX = selectionArea.x + (selectionArea.width - 300) / 2;
              const toolbarY =
                translationDisplayMode === 'list'
                  ? selectionArea.y + selectionArea.height + 120
                  : selectionArea.y + selectionArea.height + 10;
              setToolbarPosition({
                x: Math.max(10, Math.min(toolbarX, windowSize.width - 310)),
                y: Math.min(toolbarY, windowSize.height - 50),
              });
            }
          }}
        />
      )}
    </div>
  );
};

export default ScreenshotOverlay;
