import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Annotation, SelectionArea } from '../types/electron';
import './AnnotationEditor.css';

interface AnnotationEditorProps {
  selectionArea: SelectionArea;
  screenshotImage: string;
  onFinish: () => void;
}

type ToolType = 'rectangle' | 'arrow' | 'brush' | 'text';
type Point = { x: number; y: number };

const COLORS = ['#ff0000', '#ff9800', '#ffff00', '#00ff00', '#00ffff', '#0080ff', '#8000ff', '#ff00ff', '#000000', '#ffffff'];

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  selectionArea,
  screenshotImage,
  onFinish,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const [backgroundVersion, setBackgroundVersion] = useState(0);

  const {
    annotations,
    addAnnotation,
    clearAnnotations,
    annotationColor,
    setAnnotationColor,
  } = useAppStore();

  const [currentTool, setCurrentTool] = useState<ToolType>('rectangle');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [undoStack, setUndoStack] = useState<Annotation[][]>([]);

  useEffect(() => {
    const img = new Image();
    let canceled = false;

    img.onload = () => {
      if (canceled) {
        return;
      }

      backgroundImageRef.current = img;
      setBackgroundVersion((value) => value + 1);
    };

    img.src = screenshotImage;

    return () => {
      canceled = true;
    };
  }, [screenshotImage]);

  const getCanvasPosition = useCallback((clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const drawArrow = useCallback((ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
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
  }, []);

  const drawAnnotation = useCallback((ctx: CanvasRenderingContext2D, annotation: Annotation, offsetX: number, offsetY: number) => {
    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (annotation.type) {
      case 'rectangle': {
        if (annotation.startX !== undefined && annotation.startY !== undefined && annotation.endX !== undefined && annotation.endY !== undefined) {
          const x = Math.min(annotation.startX, annotation.endX) - offsetX;
          const y = Math.min(annotation.startY, annotation.endY) - offsetY;
          const w = Math.abs(annotation.endX - annotation.startX);
          const h = Math.abs(annotation.endY - annotation.startY);
          ctx.strokeRect(x, y, w, h);
        }
        break;
      }
      case 'arrow': {
        if (annotation.startX !== undefined && annotation.startY !== undefined && annotation.endX !== undefined && annotation.endY !== undefined) {
          const fromX = annotation.startX - offsetX;
          const fromY = annotation.startY - offsetY;
          const toX = annotation.endX - offsetX;
          const toY = annotation.endY - offsetY;
          drawArrow(ctx, fromX, fromY, toX, toY);
        }
        break;
      }
      case 'brush': {
        if (annotation.points && annotation.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(annotation.points[0].x - offsetX, annotation.points[0].y - offsetY);
          annotation.points.forEach((point) => {
            ctx.lineTo(point.x - offsetX, point.y - offsetY);
          });
          ctx.stroke();
        }
        break;
      }
      case 'text': {
        if (annotation.text && annotation.x !== undefined && annotation.y !== undefined) {
          ctx.font = '16px Arial';
          ctx.fillText(annotation.text, annotation.x - offsetX, annotation.y - offsetY);
        }
        break;
      }
      default:
        break;
    }
  }, [drawArrow]);

  const drawLivePreview = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.strokeStyle = annotationColor;
    ctx.fillStyle = annotationColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'brush' && currentPoints.length > 1) {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      currentPoints.slice(1).forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    } else if ((currentTool === 'rectangle' || currentTool === 'arrow') && isDrawing && startPoint && currentPoints.length > 0) {
      const endPoint = currentPoints[currentPoints.length - 1];
      ctx.setLineDash([6, 4]);

      if (currentTool === 'rectangle') {
        const x = Math.min(startPoint.x, endPoint.x);
        const y = Math.min(startPoint.y, endPoint.y);
        const w = Math.abs(endPoint.x - startPoint.x);
        const h = Math.abs(endPoint.y - startPoint.y);
        ctx.strokeRect(x, y, w, h);
      } else {
        drawArrow(ctx, startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      }
    }

    if (currentTool === 'text' && textPosition && textInput.trim()) {
      ctx.setLineDash([]);
      ctx.font = '16px Arial';
      const metrics = ctx.measureText(textInput);
      const paddingX = 6;
      const paddingY = 4;
      const boxWidth = Math.max(40, metrics.width + paddingX * 2);
      const boxHeight = 24;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(textPosition.x - paddingX, textPosition.y - boxHeight + paddingY, boxWidth, boxHeight);
      ctx.fillStyle = annotationColor;
      ctx.fillText(textInput, textPosition.x, textPosition.y);
    }

    ctx.restore();
  }, [annotationColor, currentPoints, currentTool, drawArrow, isDrawing, startPoint, textInput, textPosition]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const image = backgroundImageRef.current;

    if (!canvas || !ctx || !image) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(selectionArea.width * dpr));
    const height = Math.max(1, Math.round(selectionArea.height * dpr));

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${selectionArea.width}px`;
    canvas.style.height = `${selectionArea.height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, selectionArea.width, selectionArea.height);
    ctx.drawImage(
      image,
      selectionArea.x,
      selectionArea.y,
      selectionArea.width,
      selectionArea.height,
      0,
      0,
      selectionArea.width,
      selectionArea.height,
    );

    annotations.forEach((annotation) => {
      drawAnnotation(ctx, annotation, selectionArea.x, selectionArea.y);
    });

    drawLivePreview(ctx);
  }, [annotations, drawAnnotation, drawLivePreview, backgroundVersion, selectionArea]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const beginDrawing = useCallback((clientX: number, clientY: number) => {
    const point = getCanvasPosition(clientX, clientY);
    if (!point) {
      return;
    }

    setIsDrawing(true);
    setStartPoint(point);
    setCurrentPoints([point]);
  }, [getCanvasPosition]);

  const updateDrawing = useCallback((clientX: number, clientY: number) => {
    if (!isDrawing || !startPoint) {
      return;
    }

    const point = getCanvasPosition(clientX, clientY);
    if (!point) {
      return;
    }

    if (currentTool === 'brush') {
      setCurrentPoints((previous) => [...previous, point]);
    } else {
      setCurrentPoints([startPoint, point]);
    }
  }, [currentTool, getCanvasPosition, isDrawing, startPoint]);

  const finishDrawing = useCallback((clientX?: number, clientY?: number) => {
    if (!isDrawing || !startPoint) {
      return;
    }

    const endPoint = typeof clientX === 'number' && typeof clientY === 'number'
      ? getCanvasPosition(clientX, clientY)
      : currentPoints[currentPoints.length - 1] ?? startPoint;

    if (!endPoint) {
      return;
    }

    const id = Date.now().toString();
    setUndoStack((previous) => [...previous, [...annotations]]);

    let newAnnotation: Annotation | null = null;

    switch (currentTool) {
      case 'rectangle':
        newAnnotation = {
          id,
          type: 'rectangle',
          color: annotationColor,
          startX: startPoint.x + selectionArea.x,
          startY: startPoint.y + selectionArea.y,
          endX: endPoint.x + selectionArea.x,
          endY: endPoint.y + selectionArea.y,
        };
        break;
      case 'arrow':
        newAnnotation = {
          id,
          type: 'arrow',
          color: annotationColor,
          startX: startPoint.x + selectionArea.x,
          startY: startPoint.y + selectionArea.y,
          endX: endPoint.x + selectionArea.x,
          endY: endPoint.y + selectionArea.y,
        };
        break;
      case 'brush': {
        const brushPoints = [...currentPoints];
        if (brushPoints.length === 0 || brushPoints[brushPoints.length - 1].x !== endPoint.x || brushPoints[brushPoints.length - 1].y !== endPoint.y) {
          brushPoints.push(endPoint);
        }

        if (brushPoints.length > 1) {
          newAnnotation = {
            id,
            type: 'brush',
            color: annotationColor,
            points: brushPoints.map((point) => ({
              x: point.x + selectionArea.x,
              y: point.y + selectionArea.y,
            })),
          };
        }
        break;
      }
      default:
        break;
    }

    if (newAnnotation) {
      addAnnotation(newAnnotation);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoints([]);
  }, [addAnnotation, annotationColor, annotations, currentPoints, currentTool, getCanvasPosition, isDrawing, selectionArea, startPoint]);

  useEffect(() => {
    if (!isDrawing) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      updateDrawing(event.clientX, event.clientY);
    };

    const handleMouseUp = (event: MouseEvent) => {
      finishDrawing(event.clientX, event.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [finishDrawing, isDrawing, updateDrawing]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (currentTool === 'text') {
      const point = getCanvasPosition(event.clientX, event.clientY);
      if (!point) {
        return;
      }

      setTextPosition(point);
      setTextInput('');
      return;
    }

    if (event.button !== 0) {
      return;
    }

    beginDrawing(event.clientX, event.clientY);
  }, [beginDrawing, currentTool, getCanvasPosition]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    updateDrawing(event.clientX, event.clientY);
  }, [updateDrawing]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    finishDrawing(event.clientX, event.clientY);
  }, [finishDrawing]);

  const handleTextSubmit = useCallback(() => {
    if (!textPosition || !textInput.trim()) {
      setTextPosition(null);
      setTextInput('');
      return;
    }

    setUndoStack((previous) => [...previous, [...annotations]]);

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
  }, [addAnnotation, annotationColor, annotations, selectionArea, textInput, textPosition]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) {
      return;
    }

    const previousState = undoStack[undoStack.length - 1];
    setUndoStack((previous) => previous.slice(0, -1));
    clearAnnotations();
    previousState.forEach((annotation) => addAnnotation(annotation));
  }, [addAnnotation, clearAnnotations, undoStack]);

  const handleClear = useCallback(() => {
    setUndoStack((previous) => [...previous, [...annotations]]);
    clearAnnotations();
  }, [annotations, clearAnnotations]);

  return (
    <div className="annotation-editor">
      <div className="tool-panel">
        <div className="tool-buttons">
          <button className={currentTool === 'rectangle' ? 'active' : ''} onClick={() => setCurrentTool('rectangle')} title="矩形">
            ▭
          </button>
          <button className={currentTool === 'arrow' ? 'active' : ''} onClick={() => setCurrentTool('arrow')} title="箭头">
            ➜
          </button>
          <button className={currentTool === 'brush' ? 'active' : ''} onClick={() => setCurrentTool('brush')} title="画笔">
            ✎
          </button>
          <button className={currentTool === 'text' ? 'active' : ''} onClick={() => setCurrentTool('text')} title="文本">
            T
          </button>
        </div>

        <div className="color-picker">
          {COLORS.map((color) => (
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
            ↶
          </button>
          <button onClick={handleClear} disabled={annotations.length === 0} title="清除全部">
            ⌫
          </button>
          <button onClick={onFinish} className="btn-done" title="完成">
            完成
          </button>
        </div>
      </div>

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
            onChange={(event) => setTextInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleTextSubmit();
              }
              if (event.key === 'Escape') {
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
