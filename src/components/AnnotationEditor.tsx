import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { Annotation, SelectionArea } from '../types/electron';
import './AnnotationEditor.css';

interface AnnotationEditorProps {
  selectionArea: SelectionArea;
  screenshotImage: string;
  onFinish: () => void;
}

type ToolType = 'rectangle' | 'arrow' | 'brush' | 'text';

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  selectionArea,
  screenshotImage,
  onFinish,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    annotations,
    addAnnotation,
    clearAnnotations,
    annotationColor,
    setAnnotationColor,
  } = useAppStore();

  const [currentTool, setCurrentTool] = useState<ToolType>('rectangle');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [undoStack, setUndoStack] = useState<Annotation[][]>([]);

  // 绘制画布
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // 设置画布大小为选择区域大小
    canvas.width = selectionArea.width;
    canvas.height = selectionArea.height;

    // 绘制截图背景
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(
        img,
        selectionArea.x, selectionArea.y, selectionArea.width, selectionArea.height,
        0, 0, selectionArea.width, selectionArea.height
      );

      // 绘制所有标注
      annotations.forEach(annotation => {
        drawAnnotation(ctx, annotation, 0, 0);
      });
    };
    img.src = screenshotImage;
  }, [screenshotImage, selectionArea, annotations]);

  // 绘制单个标注
  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation, offsetX: number, offsetY: number) => {
    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (annotation.type) {
      case 'rectangle':
        if (annotation.startX !== undefined && annotation.startY !== undefined &&
            annotation.endX !== undefined && annotation.endY !== undefined) {
          const x = Math.min(annotation.startX, annotation.endX) - offsetX;
          const y = Math.min(annotation.startY, annotation.endY) - offsetY;
          const w = Math.abs(annotation.endX - annotation.startX);
          const h = Math.abs(annotation.endY - annotation.startY);
          ctx.strokeRect(x, y, w, h);
        }
        break;
      case 'arrow':
        if (annotation.startX !== undefined && annotation.startY !== undefined &&
            annotation.endX !== undefined && annotation.endY !== undefined) {
          const fromX = annotation.startX - offsetX;
          const fromY = annotation.startY - offsetY;
          const toX = annotation.endX - offsetX;
          const toY = annotation.endY - offsetY;
          drawArrow(ctx, fromX, fromY, toX, toY);
        }
        break;
      case 'brush':
        if (annotation.points && annotation.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(annotation.points[0].x - offsetX, annotation.points[0].y - offsetY);
          annotation.points.forEach(p => {
            ctx.lineTo(p.x - offsetX, p.y - offsetY);
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
  };

  // 绘制箭头
  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
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
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  // 重新绘制
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // 获取鼠标在画布上的位置
  const getCanvasPosition = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // 鼠标按下
  const handleMouseDown = (e: React.MouseEvent) => {
    if (currentTool === 'text') {
      const pos = getCanvasPosition(e);
      setTextPosition(pos);
      return;
    }

    setIsDrawing(true);
    const pos = getCanvasPosition(e);
    setStartPoint(pos);
    setCurrentPoints([pos]);
  };

  // 鼠标移动
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint) return;

    const pos = getCanvasPosition(e);

    if (currentTool === 'brush') {
      setCurrentPoints(prev => [...prev, pos]);
    } else {
      setCurrentPoints([startPoint, pos]);
    }
  };

  // 鼠标松开
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint) return;

    const pos = getCanvasPosition(e);
    const id = Date.now().toString();

    // 保存当前标注到撤销栈
    setUndoStack(prev => [...prev, [...annotations]]);

    let newAnnotation: Annotation | null = null;

    switch (currentTool) {
      case 'rectangle':
        newAnnotation = {
          id,
          type: 'rectangle',
          color: annotationColor,
          startX: startPoint.x + selectionArea.x,
          startY: startPoint.y + selectionArea.y,
          endX: pos.x + selectionArea.x,
          endY: pos.y + selectionArea.y,
        };
        break;
      case 'arrow':
        newAnnotation = {
          id,
          type: 'arrow',
          color: annotationColor,
          startX: startPoint.x + selectionArea.x,
          startY: startPoint.y + selectionArea.y,
          endX: pos.x + selectionArea.x,
          endY: pos.y + selectionArea.y,
        };
        break;
      case 'brush':
        if (currentPoints.length > 1) {
          newAnnotation = {
            id,
            type: 'brush',
            color: annotationColor,
            points: currentPoints.map(p => ({
              x: p.x + selectionArea.x,
              y: p.y + selectionArea.y,
            })),
          };
        }
        break;
    }

    if (newAnnotation) {
      addAnnotation(newAnnotation);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoints([]);
  };

  // 处理文本输入
  const handleTextSubmit = () => {
    if (!textPosition || !textInput.trim()) {
      setTextPosition(null);
      setTextInput('');
      return;
    }

    setUndoStack(prev => [...prev, [...annotations]]);

    addAnnotation({
      id: Date.now().toString(),
      type: 'text',
      color: annotationColor,
      text: textInput,
      x: textPosition.x + selectionArea.x,
      y: textPosition.y + selectionArea.y,
    });

    setTextPosition(null);
    setTextInput('');
  };

  // 撤销
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    clearAnnotations();
    previousState.forEach(a => addAnnotation(a));
  };

  // 清除所有
  const handleClear = () => {
    setUndoStack(prev => [...prev, [...annotations]]);
    clearAnnotations();
  };

  // 颜色选项
  const colors = ['#ff0000', '#ff9800', '#ffff00', '#00ff00', '#00ffff', '#0080ff', '#8000ff', '#ff00ff', '#000000', '#ffffff'];

  return (
    <div className="annotation-editor">
      {/* 工具面板 */}
      <div className="tool-panel">
        <div className="tool-buttons">
          <button
            className={currentTool === 'rectangle' ? 'active' : ''}
            onClick={() => setCurrentTool('rectangle')}
            title="矩形"
          >
            ▢
          </button>
          <button
            className={currentTool === 'arrow' ? 'active' : ''}
            onClick={() => setCurrentTool('arrow')}
            title="箭头"
          >
            ➜
          </button>
          <button
            className={currentTool === 'brush' ? 'active' : ''}
            onClick={() => setCurrentTool('brush')}
            title="画笔"
          >
            ✎
          </button>
          <button
            className={currentTool === 'text' ? 'active' : ''}
            onClick={() => setCurrentTool('text')}
            title="文字"
          >
            T
          </button>
        </div>

        <div className="color-picker">
          {colors.map(color => (
            <button
              key={color}
              className={`color-btn ${annotationColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setAnnotationColor(color)}
            />
          ))}
        </div>

        <div className="action-buttons">
          <button onClick={handleUndo} disabled={undoStack.length === 0} title="撤销">
            ↩
          </button>
          <button onClick={handleClear} disabled={annotations.length === 0} title="清除全部">
            🗑
          </button>
          <button onClick={onFinish} className="btn-done" title="完成">
            完成
          </button>
        </div>
      </div>

      {/* 画布区域 */}
      <div
        className="canvas-container"
        style={{
          position: 'fixed',
          left: selectionArea.x,
          top: selectionArea.y,
          width: selectionArea.width,
          height: selectionArea.height,
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            cursor: currentTool === 'text' ? 'text' : 'crosshair',
          }}
        />

        {/* 文本输入框 */}
        {textPosition && (
          <input
            type="text"
            className="text-input"
            style={{
              left: textPosition.x,
              top: textPosition.y - 16,
              color: annotationColor,
            }}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit();
              if (e.key === 'Escape') {
                setTextPosition(null);
                setTextInput('');
              }
            }}
            onBlur={handleTextSubmit}
            autoFocus
          />
        )}
      </div>
    </div>
  );
};

export default AnnotationEditor;