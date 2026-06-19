import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiType, FiSquare, FiMousePointer, FiRotateCcw, FiRotateCw, FiSave,
  FiAlertCircle, FiArrowLeft, FiTrash2,
  FiLayers, FiBookOpen, FiBold, FiItalic, FiUnderline, FiChevronRight, FiTriangle,
  FiPlay, FiPause, FiRefreshCw, FiEdit2, FiCompass, FiCircle, FiCornerDownRight
} from 'react-icons/fi';
import { BiTimer } from 'react-icons/bi';
import { FaRegClock } from 'react-icons/fa';
import '../styles/Canvas.css';

// Fixed pixel sizes for each shape-size preset.
const SHAPE_SIZE_PRESETS = {
  small: 90,
  medium: 150,
  large: 240,
  xlarge: 340
};

// ── Perfect-shape detector ────────────────────────────────────────────────────
// Given a list of {x,y} stroke points, returns the best-fit primitive shape
// or null if the stroke is too complex / free-form.
function detectPerfectShape(points) {
  if (!points || points.length < 4) return null;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;

  // Bounding box must be big enough to bother
  if (w < 15 && h < 15) return null;

  // --- Line detection: very thin bounding box relative to length ---------------
  const diag = Math.sqrt(w * w + h * h);
  const thin = Math.min(w, h) / diag;
  if (thin < 0.12) return { shape: 'line' };

  // --- Circle detection: closed stroke + roughly square bounding box ----------
  const first = points[0];
  const last = points[points.length - 1];
  const closeDist = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
  const closed = closeDist < diag * 0.35;
  const squarish = Math.min(w, h) / Math.max(w, h) > 0.65;

  if (closed && squarish) {
    // Measure avg deviation from the centre to decide circle vs rectangle
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const r = Math.min(w, h) / 2;
    const avgDev = points.reduce((sum, p) => {
      return sum + Math.abs(Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2) - r);
    }, 0) / points.length;
    const relDev = avgDev / r;
    if (relDev < 0.25) return { shape: 'circle' };
    return { shape: 'rect' };
  }

  // --- Triangle detection: closed + 3 approximate corners --------------------
  if (closed) return { shape: 'triangle' };

  return null; // free-form stroke — keep as freehand
}

// Auto-numbering helper for sticky notes
// Detects a heading line (e.g. "Title:") and auto-inserts numbered list items
function autoNumberStickyText(text, trigger) {
  // trigger = '123' | 'ABC'
  const lines = text.split('\n');
  const numbered = lines.map((line, i) => {
    if (i === 0) return line; // heading stays
    const stripped = line.replace(/^(\d+\.|[A-Z]\.) /, '');
    if (trigger === '123') return stripped ? `${i}. ${stripped}` : line;
    if (trigger === 'ABC') return stripped ? `${String.fromCharCode(64 + i)}. ${stripped}` : line;
    return line;
  });
  return numbered.join('\n');
}

function Canvas() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTool, setActiveTool] = useState('select');
  const [objects, setObjects] = useState([]);

  const [pastHistory, setPastHistory] = useState([]);
  const [futureHistory, setFutureHistory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showTextMenu, setShowTextMenu] = useState(false);
  const [showDrawMenu, setShowDrawMenu] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  // Live freehand drawing state (brush / highlighter / eraser)
  const [drawMode, setDrawMode] = useState(null); // null | 'brush' | 'highlighter' | 'eraser'
  const [isDrawingStroke, setIsDrawingStroke] = useState(false);
  const [currentStrokePoints, setCurrentStrokePoints] = useState([]);
  const boardSurfaceRef = useRef(null);

  // Clock state hook for the live digital clock widget
  const [currentSystemTime, setCurrentSystemTime] = useState(new Date());

  // Keep a ref mirror of objects so interval/timer callbacks and drag handlers
  // always read the freshest state without needing to be re-created every render.
  const objectsRef = useRef(objects);
  useEffect(() => { objectsRef.current = objects; }, [objects]);

  // Track pointer down on a node so we can distinguish click vs drag
  const pointerDownOnNode = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) setIsLoggedIn(true);
  }, []);

  // Universal interval engine
  useEffect(() => {
    const globalSyncInterval = setInterval(() => {
      setObjects(prev =>
        prev.map(obj => {
          if (obj.type === 'timer' && obj.timerRunning && obj.timerSeconds > 0) {
            return { ...obj, timerSeconds: obj.timerSeconds - 1 };
          } else if (obj.type === 'timer' && obj.timerRunning && obj.timerSeconds === 0) {
            return { ...obj, timerRunning: false };
          }
          return obj;
        })
      );
      setCurrentSystemTime(new Date());
    }, 1000);
    return () => clearInterval(globalSyncInterval);
  }, []);

  const pushStateToHistory = (newObjects) => {
    setPastHistory(prev => [...prev, JSON.stringify(objectsRef.current)]);
    setFutureHistory([]);
    setObjects(newObjects);
  };

  const handleUndo = () => {
    if (pastHistory.length === 0) return;
    const previous = pastHistory[pastHistory.length - 1];
    setPastHistory(prev => prev.slice(0, prev.length - 1));
    setFutureHistory(prev => [JSON.stringify(objectsRef.current), ...prev]);
    setObjects(JSON.parse(previous));
  };

  const handleRedo = () => {
    if (futureHistory.length === 0) return;
    const nextState = futureHistory[0];
    setFutureHistory(prev => prev.slice(1));
    setPastHistory(prev => [...prev, JSON.stringify(objectsRef.current)]);
    setObjects(JSON.parse(nextState));
  };

  const handleAddObject = (type, subType = '') => {
    const baseOffset = objects.length * 20;
    let defaultWidth = 150;
    let defaultHeight = 150;
    let initialText = '';

    if (type === 'text') {
      defaultWidth = 240;
      defaultHeight = 70;
      initialText = subType === 'heading' ? 'New Heading Title' : 'Body Paragraph content area...';
    } else if (type === 'sticky') {
      defaultWidth = 200;
      defaultHeight = 200;
      initialText = 'Title:\n1. Point one\n2. Point two\n3. Point three';
    } else if (type === 'timer') {
      defaultWidth = 320;
      defaultHeight = 180;
    } else if (type === 'clock') {
      defaultWidth = 280;
      defaultHeight = 130;
    } else if (type === 'homework') {
      defaultWidth = 360;
      defaultHeight = 160;
      initialText = '📝 HOMEWORK TASK:\n1. Complete structural models framework.\n2. Review canvas documentation.';
    } else if (type === 'shape') {
      if (subType === 'line' || subType === 'arrow') {
        defaultWidth = 200;
        defaultHeight = 20;
      } else {
        defaultWidth = SHAPE_SIZE_PRESETS.medium;
        defaultHeight = SHAPE_SIZE_PRESETS.medium;
      }
    }

    const newObj = {
      id: Date.now().toString(),
      type: type,
      subType: subType,
      x: 350 + baseOffset,
      y: 150 + baseOffset,
      text: initialText,
      width: defaultWidth,
      height: defaultHeight,
      fontFamily: 'Inter, sans-serif',
      fontSize: subType === 'heading' ? '24px' : '16px',
      fontWeight: subType === 'heading' ? 'bold' : 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: type === 'sticky' ? '#fff9c4' : (type === 'timer' || type === 'clock') ? '#1e293b' : '#e0f2fe',
      borderColor: '#2c6dd4',
      borderWidth: '2px',
      borderStyle: 'solid',
      textColor: (type === 'timer' || type === 'clock') ? '#ffffff' : '#1e293b',
      timerSeconds: 600,
      timerRunning: false,
      timerPresetShape: 'square',
      shapeSizePreset: 'medium'
    };

    pushStateToHistory([...objects, newObj]);
    setSelectedId(newObj.id);
    setShowShapeMenu(false);
    setShowTextMenu(false);
    setShowDrawMenu(false);
  };

  const handleDeleteSelected = (id) => {
    pushStateToHistory(objects.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleWipeCanvas = () => {
    if (window.confirm("Clear the whiteboard workspace completely?")) {
      pushStateToHistory([]);
      setSelectedId(null);
    }
  };

  // ── Node pointer handlers ────────────────────────────────────────────────────
  const handlePointerDown = (e, obj) => {
    // Eraser: delete on click
    if (activeTool === 'eraser') {
      e.stopPropagation();
      handleDeleteSelected(obj.id);
      return;
    }
    if (activeTool !== 'select') return;
    e.stopPropagation();
    pointerDownOnNode.current = true;
    setSelectedId(obj.id);
    setIsDragging(true);
    setDragOffset({ x: e.clientX - obj.x, y: e.clientY - obj.y });
  };

  const handleResizeStart = (e, obj) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setSelectedId(obj.id);
    setResizeStart({ width: obj.width, height: obj.height, x: e.clientX, y: e.clientY });
  };

  // ── Freehand drawing (brush / highlighter) ────────────────────────────────
  const getBoardRelativePoint = (e) => {
    const rect = boardSurfaceRef.current ? boardSurfaceRef.current.getBoundingClientRect() : { left: 0, top: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleBoardPointerDown = (e) => {
    // Don't deselect if the click came from a node
    if (pointerDownOnNode.current) {
      pointerDownOnNode.current = false;
      return;
    }

    if (activeTool === 'brush' || activeTool === 'highlighter') {
      e.stopPropagation();
      const pt = getBoardRelativePoint(e);
      setIsDrawingStroke(true);
      setCurrentStrokePoints([pt]);
      return;
    }

    // Default board click: deselect & close menus
    setSelectedId(null);
    setShowShapeMenu(false);
    setShowTextMenu(false);
    setShowDrawMenu(false);
  };

  const handlePointerMove = (e) => {
    if (isDrawingStroke) {
      const pt = getBoardRelativePoint(e);
      setCurrentStrokePoints(prev => [...prev, pt]);
      return;
    }
    if (isDragging && selectedId) {
      setObjects(prevObjects => prevObjects.map(o => o.id === selectedId ? {
        ...o,
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      } : o));
    } else if (isResizing && selectedId) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      setObjects(prevObjects => prevObjects.map(o => o.id === selectedId ? {
        ...o,
        width: Math.max(40, resizeStart.width + deltaX),
        height: Math.max(40, resizeStart.height + deltaY)
      } : o));
    }
  };

  const finishStroke = () => {
    if (!isDrawingStroke) return;
    setIsDrawingStroke(false);

    if (currentStrokePoints.length < 2) {
      setCurrentStrokePoints([]);
      return;
    }

    const xs = currentStrokePoints.map(p => p.x);
    const ys = currentStrokePoints.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const padding = 10;

    // ── Perfect shape detection ────────────────────────────────────────────
    const detected = detectPerfectShape(currentStrokePoints);

    if (detected) {
      const w = Math.max(maxX - minX, 40);
      const h = Math.max(maxY - minY, 40);
      const shapeSize = Math.max(w, h);

      let subType = detected.shape;
      let shapeWidth = subType === 'line' ? Math.max(w, 60) : shapeSize;
      let shapeHeight = subType === 'line' ? 20 : shapeSize;

      const perfectShape = {
        id: Date.now().toString(),
        type: 'shape',
        subType: subType,
        x: minX,
        y: minY,
        width: shapeWidth,
        height: shapeHeight,
        text: '',
        fontFamily: 'Inter, sans-serif',
        fontSize: '16px',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#e0f2fe',
        borderColor: '#2c6dd4',
        borderWidth: '2px',
        borderStyle: 'solid',
        textColor: '#1e293b',
        shapeSizePreset: 'medium'
      };

      pushStateToHistory([...objectsRef.current, perfectShape]);
      setCurrentStrokePoints([]);
      setSelectedId(perfectShape.id);
      // Return to select tool after perfect shape
      setActiveTool('select');
      setDrawMode(null);
      return;
    }

    // ── Free-form stroke ──────────────────────────────────────────────────
    const width = Math.max(maxX - minX + padding * 2, 20);
    const height = Math.max(maxY - minY + padding * 2, 20);

    const relativePoints = currentStrokePoints.map(p => ({
      x: p.x - minX + padding,
      y: p.y - minY + padding
    }));

    const newStroke = {
      id: Date.now().toString(),
      type: 'brush',
      subType: drawMode,
      x: minX - padding,
      y: minY - padding,
      width,
      height,
      points: relativePoints,
      borderColor: drawMode === 'highlighter' ? '#fef08a' : '#1e293b',
      brushOpacity: drawMode === 'highlighter' ? 0.45 : 1,
      brushSize: drawMode === 'highlighter' ? 14 : 4
    };

    pushStateToHistory([...objectsRef.current, newStroke]);
    setCurrentStrokePoints([]);
    setSelectedId(null); // don't auto-select after drawing; keeps tool active
  };

  const handlePointerUp = () => {
    pointerDownOnNode.current = false;
    if (isDrawingStroke) {
      finishStroke();
      return;
    }
    if (isDragging || isResizing) {
      setPastHistory(prev => [...prev, JSON.stringify(objectsRef.current)]);
    }
    setIsDragging(false);
    setIsResizing(false);
  };

  const updateObjectProperty = (id, property, value) => {
    setObjects(objects.map(o => o.id === id ? { ...o, [property]: value } : o));
  };

  const handleShapeSizeChange = (id, sizePreset) => {
    const dim = SHAPE_SIZE_PRESETS[sizePreset] || SHAPE_SIZE_PRESETS.medium;
    setObjects(objects.map(o => o.id === id ? {
      ...o,
      shapeSizePreset: sizePreset,
      width: dim,
      height: dim
    } : o));
  };

  const adjustTimer = (id, amount) => {
    setObjects(objects.map(o => o.id === id ? { ...o, timerSeconds: Math.max(0, o.timerSeconds + amount) } : o));
  };

  const activateDrawTool = (mode) => {
    setDrawMode(mode);
    setActiveTool(mode);
    setSelectedId(null);
    setShowShapeMenu(false);
    setShowTextMenu(false);
    setShowDrawMenu(false);
  };

  const activateSelectTool = () => {
    setActiveTool('select');
    setDrawMode(null);
    setShowShapeMenu(false);
    setShowTextMenu(false);
    setShowDrawMenu(false);
  };

  // Auto-number sticky note points
  const handleStickyAutoNumber = (id, mode) => {
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    const newText = autoNumberStickyText(obj.text, mode);
    updateObjectProperty(id, 'text', newText);
  };

  const buildSmoothPath = (points) => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) {
      const p = points[0];
      return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
    }
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  // Cursor style for board surface
  const getBoardCursor = () => {
    if (activeTool === 'eraser') return 'cell';
    if (activeTool === 'brush' || activeTool === 'highlighter') return 'crosshair';
    return 'default';
  };

  return (
    <div
      className="canvas-studio-container"
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
    >
      <header className="canvas-header-nav">
        <div className="header-meta-group">
          <button className="canvas-back-btn" onClick={() => navigate('/')}><FiArrowLeft /></button>
          <span className="project-title-badge">TeachBoard Smart Sandbox Blueprint</span>
        </div>

        {!isLoggedIn && (
          <div className="canvas-smooth-auth-ticker" onClick={() => navigate('/login')}>
            <FiAlertCircle className="ticker-pulse-icon" />
            <div className="ticker-text-wrapper">
              <span className="ticker-slide-entry active">
                Warning : Login to permanently back up &amp; save your workspace online.
              </span>
            </div>
          </div>
        )}

        <div className="canvas-header-actions">
          <button className="canvas-utility-btn" onClick={handleUndo} disabled={pastHistory.length === 0}><FiRotateCcw /></button>
          <button className="canvas-utility-btn" onClick={handleRedo} disabled={futureHistory.length === 0}><FiRotateCw /></button>
          {isLoggedIn && (
            <button className="canvas-utility-btn primary-save-trigger" onClick={() => alert("Teachboard project saved successfully!")}>
              <FiSave /> <span>Save Workspace</span>
            </button>
          )}
        </div>
      </header>

      <div className="canvas-workspace-layout">
        <aside className="canvas-floating-toolbox">
          {/* Select */}
          <button
            className={`tool-action-btn ${activeTool === 'select' ? 'tool-active' : ''}`}
            onClick={activateSelectTool}
            title="Select & Arrange"
          >
            <FiMousePointer />
          </button>

          <div className="toolbox-section-divider"></div>

          {/* Text */}
          <div className="shapes-tool-wrapper-container" style={{ position: 'relative' }}>
            <button
              className={`tool-action-btn ${showTextMenu ? 'tool-active' : ''}`}
              onClick={() => { setShowTextMenu(!showTextMenu); setShowShapeMenu(false); setShowDrawMenu(false); }}
              title="Text"
            >
              <FiType />
              <FiChevronRight className="nested-arrow-indicator" />
            </button>
            {showTextMenu && (
              <div className="shapes-sidebar-nested-dropdown-menu">
                <button className="dropdown-item" onClick={() => handleAddObject('text', 'heading')}><FiBold /> Add Heading</button>
                <button className="dropdown-item" onClick={() => handleAddObject('text', 'paragraph')}><FiType /> Add Paragraph</button>
              </div>
            )}
          </div>

          {/* Sticky note */}
          <button
            className="tool-action-btn"
            onClick={() => { handleAddObject('sticky'); setShowShapeMenu(false); setShowTextMenu(false); setShowDrawMenu(false); }}
            title="Sticky Note"
          >
            <FiLayers />
          </button>

          <div className="toolbox-section-divider"></div>

          {/* Shapes */}
          <div className="shapes-tool-wrapper-container" style={{ position: 'relative' }}>
            <button
              className={`tool-action-btn ${showShapeMenu ? 'tool-active' : ''}`}
              onClick={() => { setShowShapeMenu(!showShapeMenu); setShowTextMenu(false); setShowDrawMenu(false); }}
              title="Shapes"
            >
              <FiSquare style={{ borderRadius: '2px' }} />
              <FiChevronRight className="nested-arrow-indicator" />
            </button>
            {showShapeMenu && (
              <div className="shapes-sidebar-nested-dropdown-menu">
                <button className="dropdown-item" onClick={() => handleAddObject('shape', 'rect')}><FiSquare /> Rectangle</button>
                <button className="dropdown-item" onClick={() => handleAddObject('shape', 'circle')}><FiCircle /> Circle</button>
                <button className="dropdown-item" onClick={() => handleAddObject('shape', 'triangle')}><FiTriangle /> Triangle</button>
                <button className="dropdown-item" onClick={() => handleAddObject('shape', 'diamond')}>
                  <FiSquare style={{ transform: 'rotate(45deg)', scale: '0.7' }} /> Diamond
                </button>
                <button className="dropdown-item" onClick={() => handleAddObject('shape', 'line')}>
                  <span style={{ display: 'inline-block', width: '14px', height: '2px', backgroundColor: 'currentColor', marginRight: '4px', transform: 'translateY(-3px)' }} /> Line
                </button>
                <button className="dropdown-item" onClick={() => handleAddObject('shape', 'arrow')}>
                  <FiCornerDownRight style={{ transform: 'rotate(-45deg)' }} /> Arrow
                </button>
              </div>
            )}
          </div>

          {/* Draw tools — brush, highlighter, perfect shape, eraser */}
          <div className="shapes-tool-wrapper-container" style={{ position: 'relative' }}>
            <button
              className={`tool-action-btn ${showDrawMenu ? 'tool-active' : ''} ${(activeTool === 'brush' || activeTool === 'highlighter') ? 'tool-active' : ''}`}
              onClick={() => { setShowDrawMenu(!showDrawMenu); setShowShapeMenu(false); setShowTextMenu(false); }}
              title="Drawing Tools"
            >
              {/* Pen nib SVG icon — matches reference screenshot style */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                <path d="M2 2l7.586 7.586"/>
                <circle cx="11" cy="11" r="2"/>
              </svg>
              <FiChevronRight className="nested-arrow-indicator" />
            </button>
            {showDrawMenu && (
              <div className="shapes-sidebar-nested-dropdown-menu draw-tools-menu">
                {/* Brush */}
                <button
                  className={`dropdown-item draw-tool-item ${activeTool === 'brush' ? 'draw-tool-active' : ''}`}
                  onClick={() => activateDrawTool('brush')}
                >
                  <span className="draw-tool-icon-wrap brush-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M3 17c0 0 3-1 5-3s3-5 5-6c2-1 4 0 4 2s-2 4-4 5-4 1-5 2-2 3-2 3" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round"/>
                      <circle cx="18" cy="10" r="2" fill="#7c3aed" opacity="0.3"/>
                    </svg>
                  </span>
                  <span>Brush</span>
                </button>

                {/* Highlighter */}
                <button
                  className={`dropdown-item draw-tool-item ${activeTool === 'highlighter' ? 'draw-tool-active' : ''}`}
                  onClick={() => activateDrawTool('highlighter')}
                >
                  <span className="draw-tool-icon-wrap highlight-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="6" width="16" height="10" rx="2" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5"/>
                      <rect x="4" y="12" width="16" height="4" rx="0 0 2 2" fill="#fde047" opacity="0.7"/>
                      <line x1="9" y1="6" x2="9" y2="16" stroke="#ca8a04" strokeWidth="1" opacity="0.4"/>
                    </svg>
                  </span>
                  <span>Highlighter</span>
                </button>

                {/* Perfect Diagram */}
                <button
                  className="dropdown-item draw-tool-item"
                  onClick={() => activateDrawTool('brush')}
                  title="Draw any shape — it auto-snaps to the nearest perfect shape"
                >
                  <span className="draw-tool-icon-wrap perfect-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="#2c6dd4" strokeWidth="1.8" fill="#dbeafe"/>
                      <circle cx="17" cy="7" r="4" stroke="#2c6dd4" strokeWidth="1.8" fill="#dbeafe"/>
                      <polygon points="7,14 14,22 0,22" stroke="#2c6dd4" strokeWidth="1.5" fill="#dbeafe"/>
                    </svg>
                  </span>
                  <span>Perfect Shape</span>
                </button>
              </div>
            )}
          </div>

          {/* Eraser — standalone prominent button */}
          <button
            className={`tool-action-btn eraser-tool-btn ${activeTool === 'eraser' ? 'tool-active' : ''}`}
            onClick={() => {
              setActiveTool('eraser');
              setDrawMode(null);
              setSelectedId(null);
              setShowShapeMenu(false);
              setShowTextMenu(false);
              setShowDrawMenu(false);
            }}
            title="Eraser — click any object to delete it"
          >
            {/* Eraser icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/>
              <path d="M6.0 11.0 L13 18"/>
            </svg>
          </button>

          <div className="toolbox-section-divider"></div>

          {/* Widgets */}
          <button className="tool-action-btn" onClick={() => { handleAddObject('timer'); setShowShapeMenu(false); setShowTextMenu(false); setShowDrawMenu(false); }} title="Countdown Timer"><BiTimer /></button>
          <button className="tool-action-btn" onClick={() => { handleAddObject('clock'); setShowShapeMenu(false); setShowTextMenu(false); setShowDrawMenu(false); }} title="Live Clock"><FaRegClock /></button>
          <button className="tool-action-btn" onClick={() => { handleAddObject('homework'); setShowShapeMenu(false); setShowTextMenu(false); setShowDrawMenu(false); }} title="Homework Board"><FiBookOpen /></button>

          <div className="toolbox-section-divider"></div>
          <button className="tool-action-btn" onClick={handleWipeCanvas} title="Clear Canvas"><FiTrash2 style={{ color: '#ef4444' }} /></button>
        </aside>

        <main
          ref={boardSurfaceRef}
          className={`canvas-infinite-board-surface ${(activeTool === 'brush' || activeTool === 'highlighter') ? 'board-draw-mode' : ''} ${activeTool === 'eraser' ? 'board-erase-mode' : ''}`}
          style={{ cursor: getBoardCursor() }}
          onMouseDown={handleBoardPointerDown}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Live stroke preview */}
          {isDrawingStroke && currentStrokePoints.length > 0 && (
            <svg
              className="live-stroke-preview-layer"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
            >
              <path
                d={buildSmoothPath(currentStrokePoints)}
                fill="none"
                stroke={drawMode === 'highlighter' ? '#fef08a' : '#1e293b'}
                strokeOpacity={drawMode === 'highlighter' ? 0.45 : 1}
                strokeWidth={drawMode === 'highlighter' ? 14 : 4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          <div className="active-objects-render-layer">
            {objects.map((obj) => {
              const isSelected = selectedId === obj.id;

              let dynamicTimerRadius = '12px';
              if (obj.type === 'timer' || obj.type === 'clock') {
                if (obj.timerPresetShape === 'circle') dynamicTimerRadius = '24px';
                if (obj.timerPresetShape === 'square') dynamicTimerRadius = '12px';
                if (obj.timerPresetShape === 'triangle') dynamicTimerRadius = '0px';
              }

              const isLineLike = obj.type === 'shape' && (obj.subType === 'line' || obj.subType === 'arrow');

              const nodeStyles = {
                left: `${obj.x}px`,
                top: `${obj.y}px`,
                width: `${obj.width}px`,
                height: `${obj.height}px`,
                fontFamily: obj.fontFamily,
                fontSize: obj.fontSize,
                fontWeight: obj.fontWeight,
                fontStyle: obj.fontStyle,
                textDecoration: obj.textDecoration,
                color: obj.textColor,
                position: 'absolute',
                borderRadius: (obj.type === 'timer' || obj.type === 'clock') ? dynamicTimerRadius : undefined,
                border: (obj.type === 'timer' || obj.type === 'clock') ? '2px solid rgba(255,255,255,0.1)' : undefined,
                boxShadow: (obj.type === 'timer' || obj.type === 'clock') ? '0 10px 25px -5px rgba(0, 0, 0, 0.3)' : undefined,
                overflow: 'visible',
                cursor: activeTool === 'eraser' ? 'cell' : (activeTool === 'select' ? 'grab' : 'default')
              };

              return (
                <div
                  key={obj.id}
                  className={`live-render-node node-${obj.type} node-sub-${obj.subType} ${isSelected ? 'node-selected-focus' : ''} ${isLineLike ? 'node-line-like' : ''}`}
                  style={nodeStyles}
                  onMouseDown={(e) => handlePointerDown(e, obj)}
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.preventDefault()}
                >

                  {/* Top toolbar (shown when selected) */}
                  {isSelected && (
                    <div className="node-attached-top-toolbar" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>

                      {(obj.type === 'text' || obj.type === 'sticky' || (obj.type === 'shape' && !isLineLike) || obj.type === 'homework') && (
                        <div className="text-logical-collective-group">
                          <div className="toolbar-picker-wrapper" title="Font Color">
                            <span className="picker-dot-preview text-indicator" style={{ color: obj.textColor }}>A</span>
                            <input type="color" value={obj.textColor} onChange={(e) => updateObjectProperty(obj.id, 'textColor', e.target.value)} />
                          </div>
                          <button className={`hud-mini-toggle-btn ${obj.fontWeight === 'bold' ? 'toggle-active' : ''}`} onClick={() => updateObjectProperty(obj.id, 'fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold')} title="Bold"><FiBold /></button>
                          <button className={`hud-mini-toggle-btn ${obj.fontStyle === 'italic' ? 'toggle-active' : ''}`} onClick={() => updateObjectProperty(obj.id, 'fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic')} title="Italic"><FiItalic /></button>
                          <button className={`hud-mini-toggle-btn ${obj.textDecoration === 'underline' ? 'toggle-active' : ''}`} onClick={() => updateObjectProperty(obj.id, 'textDecoration', obj.textDecoration === 'underline' ? 'none' : 'underline')} title="Underline"><FiUnderline /></button>
                        </div>
                      )}

                      {/* Sticky note auto-numbering buttons */}
                      {obj.type === 'sticky' && (
                        <>
                          <div className="hud-divider-vertical"></div>
                          <button
                            className="hud-mini-toggle-btn"
                            onClick={() => handleStickyAutoNumber(obj.id, '123')}
                            title="Auto-number points as 1, 2, 3…"
                            style={{ fontSize: '0.72rem', fontWeight: '700', width: 'auto', padding: '0 6px' }}
                          >
                            1,2,3
                          </button>
                          <button
                            className="hud-mini-toggle-btn"
                            onClick={() => handleStickyAutoNumber(obj.id, 'ABC')}
                            title="Auto-number points as A, B, C…"
                            style={{ fontSize: '0.72rem', fontWeight: '700', width: 'auto', padding: '0 6px' }}
                          >
                            A,B,C
                          </button>
                          <div className="hud-divider-vertical"></div>
                        </>
                      )}

                      {obj.type === 'shape' && !isLineLike && (
                        <select
                          value={obj.shapeSizePreset || 'medium'}
                          onChange={(e) => handleShapeSizeChange(obj.id, e.target.value)}
                          className="toolbar-dropdown-select"
                          title="Shape Size"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                          <option value="xlarge">Extra Large</option>
                        </select>
                      )}

                      {(obj.type === 'shape' || obj.type === 'sticky' || obj.type === 'homework' || obj.type === 'timer' || obj.type === 'clock') && !isLineLike && (
                        <div className="toolbar-picker-wrapper" title="Background Color">
                          <span className="picker-dot-preview background-dot" style={{ backgroundColor: obj.color }} />
                          <input type="color" value={obj.color} onChange={(e) => updateObjectProperty(obj.id, 'color', e.target.value)} />
                        </div>
                      )}

                      {obj.type === 'shape' && (
                        <>
                          <div className="toolbar-picker-wrapper" title={isLineLike ? "Line Color" : "Border Color"}>
                            <span className="picker-dot-preview" style={{ border: `2px solid ${obj.borderColor || '#2c6dd4'}` }} />
                            <input type="color" value={obj.borderColor || '#2c6dd4'} onChange={(e) => updateObjectProperty(obj.id, 'borderColor', e.target.value)} />
                          </div>
                          <select value={obj.borderWidth} onChange={(e) => updateObjectProperty(obj.id, 'borderWidth', e.target.value)} className="toolbar-dropdown-select" title="Border Width">
                            <option value="1px">Thin</option>
                            <option value="2px">Medium</option>
                            <option value="4px">Thick</option>
                            <option value="6px">Heavy</option>
                          </select>
                          <select value={obj.borderStyle || 'solid'} onChange={(e) => updateObjectProperty(obj.id, 'borderStyle', e.target.value)} className="toolbar-dropdown-select">
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                          </select>
                        </>
                      )}

                      {obj.type === 'brush' && (
                        <>
                          <div className="toolbar-picker-wrapper" title="Stroke Color">
                            <span className="picker-dot-preview" style={{ border: `2px solid ${obj.borderColor || '#1e293b'}` }} />
                            <input type="color" value={obj.borderColor || '#1e293b'} onChange={(e) => updateObjectProperty(obj.id, 'borderColor', e.target.value)} />
                          </div>
                          <select value={obj.brushSize} onChange={(e) => updateObjectProperty(obj.id, 'brushSize', parseInt(e.target.value, 10))} className="toolbar-dropdown-select" title="Stroke Size">
                            <option value={2}>Hairline</option>
                            <option value={4}>Thin</option>
                            <option value={8}>Medium</option>
                            <option value={14}>Thick</option>
                            <option value={22}>Heavy</option>
                          </select>
                        </>
                      )}

                      {(obj.type === 'text' || obj.type === 'sticky' || (obj.type === 'shape' && !isLineLike)) && (
                        <select value={obj.fontSize} onChange={(e) => updateObjectProperty(obj.id, 'fontSize', e.target.value)} className="toolbar-dropdown-select" title="Font Size">
                          <option value="12px">XS</option>
                          <option value="16px">S</option>
                          <option value="20px">M</option>
                          <option value="26px">L</option>
                          <option value="36px">XL</option>
                          <option value="48px">XXL</option>
                        </select>
                      )}

                      <div className="hud-divider-vertical"></div>
                      <button className="toolbar-hud-icon danger" onClick={() => handleDeleteSelected(obj.id)} title="Delete"><FiTrash2 /></button>
                    </div>
                  )}

                  {/* Shape renderer */}
                  {obj.type === 'shape' && (
                    <div className="shape-vector-primitive-layer-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <svg
                        viewBox={isLineLike ? `0 0 ${obj.width} ${obj.height}` : '0 0 100 100'}
                        preserveAspectRatio={isLineLike ? 'xMidYMid meet' : 'none'}
                        style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
                      >
                        {obj.subType === 'rect' && (
                          <rect x="5" y="5" width="90" height="90" fill={obj.color} stroke={obj.borderColor || '#2c6dd4'} strokeWidth={parseInt(obj.borderWidth || '2px') * 1.5} strokeDasharray={obj.borderStyle === 'dashed' ? '5,5' : obj.borderStyle === 'dotted' ? '2,2' : 'none'} />
                        )}
                        {obj.subType === 'circle' && (
                          <circle cx="50" cy="50" r="44" fill={obj.color} stroke={obj.borderColor || '#2c6dd4'} strokeWidth={parseInt(obj.borderWidth || '2px') * 1.5} strokeDasharray={obj.borderStyle === 'dashed' ? '5,5' : obj.borderStyle === 'dotted' ? '2,2' : 'none'} />
                        )}
                        {obj.subType === 'triangle' && (
                          <polygon points="50,5 95,95 5,95" fill={obj.color} stroke={obj.borderColor || '#2c6dd4'} strokeWidth={parseInt(obj.borderWidth || '2px') * 1.5} strokeDasharray={obj.borderStyle === 'dashed' ? '5,5' : obj.borderStyle === 'dotted' ? '2,2' : 'none'} />
                        )}
                        {obj.subType === 'diamond' && (
                          <polygon points="50,5 95,50 50,95 5,50" fill={obj.color} stroke={obj.borderColor || '#2c6dd4'} strokeWidth={parseInt(obj.borderWidth || '2px') * 1.5} strokeDasharray={obj.borderStyle === 'dashed' ? '5,5' : obj.borderStyle === 'dotted' ? '2,2' : 'none'} />
                        )}
                        {obj.subType === 'line' && (() => {
                          const strokeW = Math.max(2, parseInt(obj.borderWidth || '2px'));
                          const midY = obj.height / 2;
                          const padX = strokeW;
                          return <line x1={padX} y1={midY} x2={obj.width - padX} y2={midY} stroke={obj.borderColor || '#2c6dd4'} strokeWidth={strokeW} strokeLinecap="round" strokeDasharray={obj.borderStyle === 'dashed' ? `${strokeW * 2.5},${strokeW * 2}` : obj.borderStyle === 'dotted' ? `${strokeW * 0.1},${strokeW * 1.8}` : 'none'} />;
                        })()}
                        {obj.subType === 'arrow' && (() => {
                          const strokeW = Math.max(2, parseInt(obj.borderWidth || '2px'));
                          const midY = obj.height / 2;
                          const headLength = Math.max(14, strokeW * 4.5);
                          const headWidth = Math.max(10, strokeW * 3.4);
                          const padStart = strokeW;
                          const padEnd = strokeW + headLength;
                          return (
                            <g>
                              <line x1={padStart} y1={midY} x2={obj.width - padEnd} y2={midY} stroke={obj.borderColor || '#2c6dd4'} strokeWidth={strokeW} strokeLinecap="round" strokeDasharray={obj.borderStyle === 'dashed' ? `${strokeW * 2.5},${strokeW * 2}` : obj.borderStyle === 'dotted' ? `${strokeW * 0.1},${strokeW * 1.8}` : 'none'} />
                              <polygon points={`${obj.width - padEnd},${midY - headWidth / 2} ${obj.width - padStart},${midY} ${obj.width - padEnd},${midY + headWidth / 2}`} fill={obj.borderColor || '#2c6dd4'} />
                            </g>
                          );
                        })()}
                      </svg>

                      {!isLineLike && (
                        <div className="shape-textarea-overlay-container">
                          <textarea
                            value={obj.text}
                            onChange={(e) => updateObjectProperty(obj.id, 'text', e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="inline-node-textarea"
                            style={{ background: 'transparent', fontSize: obj.fontSize, fontWeight: obj.fontWeight, fontStyle: obj.fontStyle, textDecoration: obj.textDecoration, color: obj.textColor }}
                            placeholder="Type inside shape..."
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Brush stroke renderer */}
                  {obj.type === 'brush' && (
                    <svg viewBox={`0 0 ${obj.width} ${obj.height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
                      <path d={buildSmoothPath(obj.points)} fill="none" stroke={obj.borderColor || '#1e293b'} strokeOpacity={obj.brushOpacity != null ? obj.brushOpacity : 1} strokeWidth={obj.brushSize || 4} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}

                  {/* Text / sticky / homework */}
                  {(obj.type === 'text' || obj.type === 'sticky' || obj.type === 'homework') && (
                    <textarea
                      value={obj.text}
                      onChange={(e) => updateObjectProperty(obj.id, 'text', e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="inline-node-textarea"
                      style={{
                        background: obj.type === 'sticky' ? obj.color : obj.type === 'homework' ? obj.color : 'transparent',
                        fontSize: obj.fontSize,
                        fontWeight: obj.fontWeight,
                        fontStyle: obj.fontStyle,
                        textDecoration: obj.textDecoration,
                        color: obj.textColor
                      }}
                    />
                  )}

                  {/* Timer widget */}
                  {obj.type === 'timer' && (
                    <div style={{ backgroundColor: obj.color || '#1e293b', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '12px', boxSizing: 'border-box', borderRadius: 'inherit', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }} onMouseDown={(e) => e.stopPropagation()}>
                        <span style={{ fontWeight: '600', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}><BiTimer /> COUNTDOWN TIMER</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => adjustTimer(obj.id, 60)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>+1m</button>
                          <button onClick={() => adjustTimer(obj.id, -60)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>-1m</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, margin: '10px 0' }}>
                        {obj.timerRunning ? (
                          <div style={{ fontSize: '42px', fontWeight: '700', fontFamily: 'monospace', color: obj.timerSeconds <= 10 ? '#ef4444' : '#34d399', letterSpacing: '1px' }}>
                            {Math.floor(obj.timerSeconds / 60).toString().padStart(2, '0')}:{(obj.timerSeconds % 60).toString().padStart(2, '0')}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onMouseDown={(e) => e.stopPropagation()}>
                            <input type="number" style={{ width: '60px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '32px', fontWeight: '700', textAlign: 'center', borderRadius: '6px', fontFamily: 'monospace' }} value={Math.floor(obj.timerSeconds / 60)} onChange={(e) => { const mins = Math.max(0, parseInt(e.target.value) || 0); updateObjectProperty(obj.id, 'timerSeconds', mins * 60 + (obj.timerSeconds % 60)); }} />
                            <span style={{ fontSize: '28px', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>:</span>
                            <input type="number" style={{ width: '60px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '32px', fontWeight: '700', textAlign: 'center', borderRadius: '6px', fontFamily: 'monospace' }} value={obj.timerSeconds % 60} onChange={(e) => { const secs = Math.max(0, Math.min(59, parseInt(e.target.value) || 0)); updateObjectProperty(obj.id, 'timerSeconds', Math.floor(obj.timerSeconds / 60) * 60 + secs); }} />
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }} onMouseDown={(e) => e.stopPropagation()}>
                        <button onClick={() => updateObjectProperty(obj.id, 'timerRunning', !obj.timerRunning)} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: obj.timerRunning ? '#f59e0b' : '#10b981', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                          {obj.timerRunning ? <FiPause /> : <FiPlay />} {obj.timerRunning ? 'Pause' : 'Start'}
                        </button>
                        <button onClick={() => { updateObjectProperty(obj.id, 'timerRunning', false); updateObjectProperty(obj.id, 'timerSeconds', 600); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          <FiRefreshCw /> Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Clock widget */}
                  {obj.type === 'clock' && (
                    <div style={{ backgroundColor: obj.color || '#0f172a', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '12px', boxSizing: 'border-box', borderRadius: 'inherit', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaRegClock /> CLOCK WIDGET
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'monospace', color: '#38bdf8', letterSpacing: '0.5px' }}>
                        {currentSystemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', fontFamily: 'sans-serif' }}>
                        {currentSystemTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )}

                  {/* Resize handle */}
                  {isSelected && obj.type !== 'brush' && (
                    <div
                      className="node-edge-resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, obj)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Canvas;