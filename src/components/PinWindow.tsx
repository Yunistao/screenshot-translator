import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PinWindowData } from '../types/electron';
import './PinWindow.css';

type Point = { x: number; y: number };

type Stroke = {
  points: Point[];
  color: string;
  size: number;
};

type MenuState = {
  visible: boolean;
  x: number;
  y: number;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.15;
const DRAW_COLOR = '#ff4d4f';
const DRAW_SIZE = 3;
const MENU_WIDTH = 176;
const MENU_HEIGHT = 168;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const PinWindow: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentStrokeRef = useRef<Point[] | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const lastAppliedWindowSizeRef = useRef<{ width: number; height: number } | null>(null);
  const menuExpandedRef = useRef(false);

  const [data, setData] = useState<PinWindowData | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [isEditing] = useState(false);
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const [menu, setMenu] = useState<MenuState>({ visible: false, x: 0, y: 0 });
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);

  const visibleSize = useMemo(() => {
    if (!naturalSize) {
      return null;
    }

    return {
      width: Math.max(1, Math.round(naturalSize.width * scale)),
      height: Math.max(1, Math.round(naturalSize.height * scale)),
    };
  }, [naturalSize, scale]);

  const hideMenu = useCallback(() => {
    setMenu((current) => ({ ...current, visible: false }));

    if (menuExpandedRef.current && visibleSize) {
      menuExpandedRef.current = false;
      void window.electronAPI?.resizeCurrentWindow?.(visibleSize.width, visibleSize.height);
    }
  }, [visibleSize]);

  const closeWindow = useCallback(async () => {
    hideMenu();
    await window.electronAPI?.closeCurrentWindow?.();
  }, [hideMenu]);

  const moveWindowTo = useCallback((screenX: number, screenY: number) => {
    void window.electronAPI?.moveCurrentWindow?.(screenX, screenY);
  }, []);

  useEffect(() => {
    const handlePinWindowData = (windowData: PinWindowData) => {
      setData(windowData);
    };

    window.electronAPI?.onPinWindowData(handlePinWindowData);
    return () => {
      window.electronAPI?.offPinWindowData?.();
    };
  }, []);

  useEffect(() => {
    if (!menu.visible) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current && target && menuRef.current.contains(target)) {
        return;
      }
      hideMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hideMenu();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hideMenu, menu.visible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !naturalSize || !visibleSize) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(naturalSize.width * dpr));
    canvas.height = Math.max(1, Math.round(naturalSize.height * dpr));
    canvas.style.width = `${visibleSize.width}px`;
    canvas.style.height = `${visibleSize.height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, naturalSize.width, naturalSize.height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const drawStroke = (stroke: Stroke) => {
      if (stroke.points.length < 2) {
        return;
      }

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const point of stroke.points.slice(1)) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    };

    for (const stroke of strokes) {
      drawStroke(stroke);
    }

    if (currentStroke && currentStroke.length > 1) {
      drawStroke({ points: currentStroke, color: DRAW_COLOR, size: DRAW_SIZE });
    }
  }, [currentStroke, naturalSize, strokes, visibleSize]);

  useEffect(() => {
    if (!visibleSize) {
      return;
    }

    const lastApplied = lastAppliedWindowSizeRef.current;
    if (lastApplied && lastApplied.width === visibleSize.width && lastApplied.height === visibleSize.height) {
      return;
    }

    lastAppliedWindowSizeRef.current = visibleSize;
    void window.electronAPI?.resizeCurrentWindow?.(visibleSize.width, visibleSize.height);
  }, [visibleSize]);

  const getPointFromEvent = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !naturalSize) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      const x = ((event.clientX - rect.left) / rect.width) * naturalSize.width;
      const y = ((event.clientY - rect.top) / rect.height) * naturalSize.height;

      return {
        x: clamp(x, 0, naturalSize.width),
        y: clamp(y, 0, naturalSize.height),
      };
    },
    [naturalSize],
  );

  const finishStroke = useCallback(() => {
    setCurrentStroke((stroke) => {
      if (!stroke || stroke.length < 2) {
        currentStrokeRef.current = null;
        return null;
      }

      setStrokes((existing) => [...existing, { points: stroke, color: DRAW_COLOR, size: DRAW_SIZE }]);
      currentStrokeRef.current = null;
      return null;
    });
  }, []);

  const handleRootMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      hideMenu();

      if (isEditing) {
        return;
      }

      setIsDraggingWindow(true);
      dragOffsetRef.current = {
        x: event.screenX - window.screenX,
        y: event.screenY - window.screenY,
      };
    },
    [hideMenu, isEditing],
  );

  useEffect(() => {
    if (!isDraggingWindow) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      moveWindowTo(event.screenX - dragOffsetRef.current.x, event.screenY - dragOffsetRef.current.y);
    };

    const handleMouseUp = () => {
      setIsDraggingWindow(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWindow, moveWindowTo]);

  const handleCanvasMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isEditing || event.button !== 0) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();
      hideMenu();
      const point = getPointFromEvent(event);
      if (!point) {
        return;
      }

      currentStrokeRef.current = [point];
      setCurrentStroke([point]);
    },
    [getPointFromEvent, hideMenu, isEditing],
  );

  const handleCanvasMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isEditing || !currentStrokeRef.current || event.buttons !== 1) {
        return;
      }

      const point = getPointFromEvent(event);
      if (!point) {
        return;
      }

      currentStrokeRef.current = [...currentStrokeRef.current, point];
      setCurrentStroke([...currentStrokeRef.current]);
    },
    [getPointFromEvent, isEditing],
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (!isEditing) {
      return;
    }

    finishStroke();
  }, [finishStroke, isEditing]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const minWindowWidth = MENU_WIDTH + 16;
      const minWindowHeight = MENU_HEIGHT + 16;
      if (window.innerWidth < minWindowWidth || window.innerHeight < minWindowHeight) {
        menuExpandedRef.current = true;
        void window.electronAPI?.resizeCurrentWindow?.(
          Math.max(window.innerWidth, minWindowWidth),
          Math.max(window.innerHeight, minWindowHeight),
        );
      }

      setMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [],
  );

  const zoomBy = useCallback((delta: number) => {
    setScale((current) => clamp(Number((current + delta).toFixed(2)), MIN_SCALE, MAX_SCALE));
  }, []);

  const copyCompositeImage = useCallback(async () => {
    if (!data?.imageData || !naturalSize) {
      return;
    }

    const img = new Image();
    img.src = data.imageData;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = naturalSize.width;
    canvas.height = naturalSize.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.drawImage(img, 0, 0, naturalSize.width, naturalSize.height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (const stroke of strokes) {
      if (stroke.points.length < 2) {
        continue;
      }

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const point of stroke.points.slice(1)) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      return;
    }

    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  }, [data?.imageData, naturalSize, strokes]);

  const handleCopyImage = useCallback(async () => {
    try {
      await copyCompositeImage();
    } catch (error) {
      console.warn('澶嶅埗鍥剧墖澶辫触:', error);
    } finally {
      hideMenu();
    }
  }, [copyCompositeImage, hideMenu]);

  const handleDestroy = useCallback(async () => {
    await closeWindow();
  }, [closeWindow]);

  const menuStyle = useMemo<React.CSSProperties>(() => {
    const left = clamp(menu.x, 8, Math.max(8, window.innerWidth - MENU_WIDTH - 8));
    const top = clamp(menu.y, 8, Math.max(8, window.innerHeight - MENU_HEIGHT - 8));

    return { left, top };
  }, [menu.x, menu.y]);

  if (!data) {
    return <div className="pin-loading">{'\u52a0\u8f7d\u4e2d...'}</div>;
  }

  return (
    <div
      className={`pin-root${isEditing ? ' editing' : ''}${isDraggingWindow ? ' dragging' : ''}`}
      data-testid="pin-window-root"
      data-scale={scale.toFixed(2)}
      data-editing={isEditing ? 'true' : 'false'}
      onMouseDown={handleRootMouseDown}
      onContextMenu={handleContextMenu}
      onWheel={(event) => {
        event.preventDefault();
        hideMenu();
        zoomBy(event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP);
      }}
      onDoubleClick={(event) => {
        if (event.button !== 0 || isEditing) {
          return;
        }
        void closeWindow();
      }}
      title={'\u53cc\u51fb\u5173\u95ed'}
    >
      <div
        className="pin-stage"
        style={{
          width: visibleSize?.width ?? naturalSize?.width ?? '100%',
          height: visibleSize?.height ?? naturalSize?.height ?? '100%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <img
          src={data.imageData}
          alt="screenshot"
          draggable={false}
          onLoad={(event) => {
            const target = event.currentTarget;
            const width = target.naturalWidth || target.width;
            const height = target.naturalHeight || target.height;
            setNaturalSize({ width, height });
          }}
        />
        <canvas
          ref={canvasRef}
          className="pin-draw-layer"
          style={{ pointerEvents: isEditing ? 'auto' : 'none' }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={() => {
            if (isEditing) {
              finishStroke();
            }
          }}
        />
      </div>

      {menu.visible && createPortal(
        <div
          ref={menuRef}
          className="pin-context-menu"
          data-testid="pin-context-menu"
          style={menuStyle}
          onMouseDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        ><button data-testid="pin-context-menu-copy" onClick={handleCopyImage}>
            {'\u590d\u5236\u56fe\u7247'}
          </button>
          <button
            data-testid="pin-context-menu-zoom-in"
            onClick={() => {
              zoomBy(SCALE_STEP);
              hideMenu();
            }}
          >
            {'\u653e\u5927'}
          </button>
          <button
            data-testid="pin-context-menu-zoom-out"
            onClick={() => {
              zoomBy(-SCALE_STEP);
              hideMenu();
            }}
          >
            {'\u7f29\u5c0f'}
          </button>
          <button
            data-testid="pin-context-menu-destroy"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleDestroy();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {'\u9500\u6bc1'}
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default PinWindow;

