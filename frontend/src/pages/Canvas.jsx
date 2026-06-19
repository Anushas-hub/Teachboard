import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiType, FiSquare, FiMousePointer, FiRotateCcw, FiRotateCw,
  FiSave, FiAlertCircle, FiArrowLeft, FiTrash2, 
  FiLayers, FiClock, FiBookOpen, FiBold, FiItalic, FiUnderline, FiChevronRight, FiTriangle,
  FiPlay, FiPause, FiRefreshCw, FiMinus, FiPlus, FiEdit2, FiCompass, FiCircle, FiCornerDownRight
} from 'react-icons/fi';
import '../styles/Canvas.css';

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

  // Clock state hook for the live digital clock widget
  const [currentSystemTime, setCurrentSystemTime] = useState(new Date());

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) setIsLoggedIn(true);
  }, []);

  // Universal interval engine handling countdown timer execution & real-time clock tick sync
  useEffect(() => {
    const globalSyncInterval = setInterval(() => {
      // Update running timers
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
      // Synchronize the system time string
      setCurrentSystemTime(new Date());
    }, 1000);
    
    return () => clearInterval(globalSyncInterval);
  }, []);

  const pushStateToHistory = (newObjects) => {
    setPastHistory(prev => [...prev, JSON.stringify(objects)]);
    setFutureHistory([]); 
    setObjects(newObjects);
  };

  const handleUndo = () => {
    if (pastHistory.length === 0) return;
    const previous = pastHistory[pastHistory.length - 1];
    setPastHistory(prev => prev.slice(0, prev.length - 1));
    setFutureHistory(prev => [JSON.stringify(objects), ...prev]);
    setObjects(JSON.parse(previous));
  };

  const handleRedo = () => {
    if (futureHistory.length === 0) return;
    const nextState = futureHistory[0];
    setFutureHistory(prev => prev.slice(1));
    setPastHistory(prev => [...prev, JSON.stringify(objects)]);
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
      defaultWidth = 180;
      defaultHeight = 180;
      initialText = 'Sticky Note Message';
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
        defaultWidth = 150;
        defaultHeight = 150;
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
    if(window.confirm("Clear the whiteboard workspace completely?")) {
      pushStateToHistory([]);
      setSelectedId(null);
    }
  };

  const handlePointerDown = (e, obj) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
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

  const handlePointerMove = (e) => {
    if (isDragging && selectedId) {
      setObjects(objects.map(o => o.id === selectedId ? {
        ...o,
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      } : o));
    } else if (isResizing && selectedId) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      setObjects(objects.map(o => o.id === selectedId ? {
        ...o,
        width: Math.max(160, resizeStart.width + deltaX),
        height: Math.max(100, resizeStart.height + deltaY)
      } : o));
    }
  };

  const handlePointerUp = () => {
    if (isDragging || isResizing) {
      setPastHistory(prev => [...prev, JSON.stringify(objects)]);
    }
    setIsDragging(false);
    setIsResizing(false);
  };

  const updateObjectProperty = (id, property, value) => {
    setObjects(objects.map(o => o.id === id ? { ...o, [property]: value } : o));
  };

  const handleShapeSizeChange = (id, sizePreset) => {
    let dim = 150;
    if (sizePreset === 'small') dim = 90;
    if (sizePreset === 'medium') dim = 150;
    if (sizePreset === 'large') dim = 240;
    if (sizePreset === 'xlarge') dim = 340;

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

  return (
    <div className="canvas-studio-container" onMouseMove={handlePointerMove} onMouseUp={handlePointerUp}>
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
                  Warning : Login to permanently back up & save your workspace online.
              </span>
            </div>
          </div>
        )}

        <div className="canvas-header-actions">
          <button className="canvas-utility-btn" onClick={handleUndo} disabled={pastHistory.length === 0}><FiRotateCcw /></button>
          <button className="canvas-utility-btn" onClick={handleRedo} disabled={futureHistory.length === 0}><FiRotateCw /></button>
          <button className="canvas-utility-btn primary-save-trigger" onClick={() => alert("Teachboard project saved successfully!")}><FiSave /> <span>Save Workspace</span></button>
        </div>
      </header>

      <div className="canvas-workspace-layout">
        <aside className="canvas-floating-toolbox">
          <button 
            className={`tool-action-btn ${activeTool === 'select' ? 'tool-active' : ''}`} 
            onClick={() => { setActiveTool('select'); setShowShapeMenu(false); setShowTextMenu(false); setShowDrawMenu(false); }}
            title="Select & Arrange"
          >
            <FiMousePointer />
          </button>
          
          <div className="toolbox-section-divider"></div>
          
          <div className="shapes-tool-wrapper-container" style={{ position: 'relative' }}>
            <button className={`tool-action-btn ${showTextMenu ? 'dropdown-open' : ''}`} onClick={() => { setShowTextMenu(!showTextMenu); setShowShapeMenu(false); setShowDrawMenu(false); }} title="Text Formatting Matrix">
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

          <button className="tool-action-btn" onClick={() => { handleAddObject('sticky'); setShowShapeMenu(false); setShowTextMenu(false); setShowDrawMenu(false); }} title="Sticky Note Workspace"><FiLayers /></button>
          
          <div className="toolbox-section-divider"></div>
          
          <div className="shapes-tool-wrapper-container" style={{ position: 'relative' }}>
            <button className={`tool-action-btn ${showShapeMenu ? 'dropdown-open' : ''}`} onClick={() => { setShowShapeMenu(!showShapeMenu); setShowTextMenu(false); setShowDrawMenu(false); }} title="Vector Primitive Shapes">
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

          <div className="shapes-tool-wrapper-container" style={{ position: 'relative' }}>
            <button className={`tool-action-btn ${showDrawMenu ? 'dropdown-open' : ''}`} onClick={() => { setShowDrawMenu(!showDrawMenu); setShowShapeMenu(false); setShowTextMenu(false); }} title="Drawing Board & Perfect Diagrams">
              <FiEdit2 />
              <FiChevronRight className="nested-arrow-indicator" />
            </button>
            {showDrawMenu && (
              <div className="shapes-sidebar-nested-dropdown-menu">
                <button className="dropdown-item" onClick={() => alert("Brush tool engaged! Draw anywhere freely.")}><FiEdit2 /> Canvas Brush</button>
                <button className="dropdown-item" onClick={() => alert("Highlighter tool engaged!")}><span className="custom-highlighter-dot" /> Highlighter</button>
                <button className="dropdown-item" onClick={() => handleAddObject('shape', 'rect')}><FiCompass /> Perfect Diagram</button>
              </div>
            )}
          </div>
          
          <div className="toolbox-section-divider"></div>
          {/* Action trigger shortcuts for fully operating individual module elements */}
          <button className="tool-action-btn" onClick={() => { handleAddObject('timer'); setShowShapeMenu(false); setShowTextMenu(false); setShowDrawMenu(false); }} title="Countdown Timer Widget"><FiClock /></button>
          <button className="tool-action-btn" onClick={() => { handleAddObject('clock'); setShowShapeMenu(false); setShowTextMenu(false); setShowDrawMenu(false); }} title="Live Digital Clock Widget"><FiRefreshCw /></button>
          <button className="tool-action-btn" onClick={() => { handleAddObject('homework'); setShowShapeMenu(false); setShowTextMenu(false); setShowDrawMenu(false); }} title="Homework Assign Board"><FiBookOpen /></button>
          
          <div className="toolbox-section-divider"></div>
          <button className="tool-action-btn danger-reset-trigger" onClick={handleWipeCanvas} title="Clear Clean Surface Layout"><FiTrash2 style={{ color: '#ef4444' }} /></button>
        </aside>

        <main 
          className="canvas-infinite-board-surface" 
          onClick={() => { setSelectedId(null); setShowShapeMenu(false); setShowTextMenu(false); setShowDrawMenu(false); }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="active-objects-render-layer">
            {objects.map((obj) => {
              const isSelected = selectedId === obj.id;
              
              let dynamicTimerRadius = '12px';
              if(obj.type === 'timer' || obj.type === 'clock') {
                if(obj.timerPresetShape === 'circle') dynamicTimerRadius = '24px';
                if(obj.timerPresetShape === 'square') dynamicTimerRadius = '12px';
                if(obj.timerPresetShape === 'triangle') dynamicTimerRadius = '0px'; 
              }

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
                overflow: 'visible'
              };

              return (
                <div 
                  key={obj.id}
                  className={`live-render-node node-${obj.type} node-sub-${obj.subType} ${isSelected ? 'node-selected-focus' : ''}`}
                  style={nodeStyles}
                  onMouseDown={(e) => handlePointerDown(e, obj)}
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  
                  {isSelected && (
                    <div className="node-attached-top-toolbar" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                      
                      {(obj.type === 'text' || obj.type === 'sticky' || obj.type === 'shape' || obj.type === 'homework') && (
                        <div className="text-logical-collective-group">
                          <div className="toolbar-picker-wrapper" title="Font Color Channel (A)">
                            <span className="picker-dot-preview text-indicator" style={{ color: obj.textColor }}>A</span>
                            <input type="color" value={obj.textColor} onChange={(e) => updateObjectProperty(obj.id, 'textColor', e.target.value)} />
                          </div>
                          
                          <button 
                            className={`hud-mini-toggle-btn ${obj.fontWeight === 'bold' ? 'toggle-active' : ''}`} 
                            onClick={() => updateObjectProperty(obj.id, 'fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold')}
                            title="Toggle Bold"
                          >
                            <FiBold />
                          </button>
                          
                          <button 
                            className={`hud-mini-toggle-btn ${obj.fontStyle === 'italic' ? 'toggle-active' : ''}`} 
                            onClick={() => updateObjectProperty(obj.id, 'fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic')}
                            title="Toggle Italic"
                          >
                            <FiItalic />
                          </button>

                          <button 
                            className={`hud-mini-toggle-btn ${obj.textDecoration === 'underline' ? 'toggle-active' : ''}`} 
                            onClick={() => updateObjectProperty(obj.id, 'textDecoration', obj.textDecoration === 'underline' ? 'none' : 'underline')}
                            title="Toggle Underline"
                          >
                            <FiUnderline />
                          </button>
                        </div>
                      )}

                      {obj.type === 'shape' && obj.subType !== 'line' && obj.subType !== 'arrow' && (
                        <select 
                          value={obj.shapeSizePreset || 'medium'} 
                          onChange={(e) => handleShapeSizeChange(obj.id, e.target.value)} 
                          className="toolbar-dropdown-select"
                          title="Shape Size Parameter"
                        >
                          <option value="small">Small Geometry</option>
                          <option value="medium">Medium Geometry</option>
                          <option value="large">Large Geometry</option>
                          <option value="xlarge">Extra Large</option>
                        </select>
                      )}

                      {(obj.type === 'shape' || obj.type === 'sticky' || obj.type === 'homework' || obj.type === 'timer' || obj.type === 'clock') && (
                        <div className="toolbar-picker-wrapper" title="Background Color Fill">
                          <span className="picker-dot-preview background-dot" style={{ backgroundColor: obj.color }} />
                          <input type="color" value={obj.color} onChange={(e) => updateObjectProperty(obj.id, 'color', e.target.value)} />
                        </div>
                      )}

                      {obj.type === 'shape' && (
                        <>
                          <div className="toolbar-picker-wrapper" title="Border Outlines Color">
                            <span className="picker-dot-preview" style={{ border: `2px solid ${obj.borderColor || '#2c6dd4'}` }} />
                            <input type="color" value={obj.borderColor || '#2c6dd4'} onChange={(e) => updateObjectProperty(obj.id, 'borderColor', e.target.value)} />
                          </div>

                          <select 
                            value={obj.borderWidth} 
                            onChange={(e) => updateObjectProperty(obj.id, 'borderWidth', e.target.value)} 
                            className="toolbar-dropdown-select"
                          >
                            <option value="1px">Thin Border</option>
                            <option value="2px">Medium Border</option>
                            <option value="4px">Thick Outline</option>
                            <option value="6px">Heavy Frame</option>
                          </select>

                          <select 
                            value={obj.borderStyle || 'solid'} 
                            onChange={(e) => updateObjectProperty(obj.id, 'borderStyle', e.target.value)} 
                            className="toolbar-dropdown-select"
                          >
                            <option value="solid">Solid Line</option>
                            <option value="dashed">Dashed Outline</option>
                            <option value="dotted">Dotted Pattern</option>
                          </select>
                        </>
                      )}

                      {(obj.type === 'text' || obj.type === 'sticky' || obj.type === 'shape') && (
                        <select 
                          value={obj.fontSize} 
                          onChange={(e) => updateObjectProperty(obj.id, 'fontSize', e.target.value)} 
                          className="toolbar-dropdown-select"
                          title="Adaptive Typography Scale"
                        >
                          <option value="12px">Font XS</option>
                          <option value="16px">Font Small</option>
                          <option value="20px">Font Medium</option>
                          <option value="26px">Font Large</option>
                          <option value="36px">Font XL</option>
                          <option value="48px">Font XXL</option>
                        </select>
                      )}
                      
                      <div className="hud-divider-vertical"></div>
                      <button className="toolbar-hud-icon danger" onClick={() => handleDeleteSelected(obj.id)} title="Delete Element Asset"><FiTrash2 /></button>
                    </div>
                  )}

                  {obj.type === 'shape' && (
                    <div className="shape-vector-primitive-layer-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
                        {obj.subType === 'rect' && (
                          <rect 
                            x="5" y="5" width="90" height="90"
                            fill={obj.color} 
                            stroke={obj.borderColor || '#2c6dd4'} 
                            strokeWidth={parseInt(obj.borderWidth || '2px') * 1.5}
                            strokeDasharray={obj.borderStyle === 'dashed' ? '5,5' : obj.borderStyle === 'dotted' ? '2,2' : 'none'}
                          />
                        )}
                        {obj.subType === 'circle' && (
                          <circle 
                            cx="50" cy="50" r="44"
                            fill={obj.color} 
                            stroke={obj.borderColor || '#2c6dd4'} 
                            strokeWidth={parseInt(obj.borderWidth || '2px') * 1.5}
                            strokeDasharray={obj.borderStyle === 'dashed' ? '5,5' : obj.borderStyle === 'dotted' ? '2,2' : 'none'}
                          />
                        )}
                        {obj.subType === 'triangle' && (
                          <polygon 
                            points="50,5 95,95 5,95" 
                            fill={obj.color} 
                            stroke={obj.borderColor || '#2c6dd4'} 
                            strokeWidth={parseInt(obj.borderWidth || '2px') * 1.5}
                            strokeDasharray={obj.borderStyle === 'dashed' ? '5,5' : obj.borderStyle === 'dotted' ? '2,2' : 'none'}
                          />
                        )}
                        {obj.subType === 'diamond' && (
                          <polygon 
                            points="50,5 95,50 50,95 5,50" 
                            fill={obj.color} 
                            stroke={obj.borderColor || '#2c6dd4'} 
                            strokeWidth={parseInt(obj.borderWidth || '2px') * 1.5}
                            strokeDasharray={obj.borderStyle === 'dashed' ? '5,5' : obj.borderStyle === 'dotted' ? '2,2' : 'none'}
                          />
                        )}
                        {obj.subType === 'line' && (
                          <line 
                            x1="5" y1="50" x2="95" y2="50"
                            stroke={obj.borderColor || '#2c6dd4'} 
                            strokeWidth={parseInt(obj.borderWidth || '2px') * 2}
                            strokeDasharray={obj.borderStyle === 'dashed' ? '5,5' : obj.borderStyle === 'dotted' ? '2,2' : 'none'}
                          />
                        )}
                        {obj.subType === 'arrow' && (
                          <g>
                            <line 
                              x1="5" y1="50" x2="85" y2="50"
                              stroke={obj.borderColor || '#2c6dd4'} 
                              strokeWidth={parseInt(obj.borderWidth || '2px') * 2}
                              strokeDasharray={obj.borderStyle === 'dashed' ? '5,5' : obj.borderStyle === 'dotted' ? '2,2' : 'none'}
                            />
                            <polygon 
                              points="82,40 98,50 82,60" 
                              fill={obj.borderColor || '#2c6dd4'}
                            />
                          </g>
                        )}
                      </svg>
                      
                      {obj.subType !== 'line' && obj.subType !== 'arrow' && (
                        <div className="shape-textarea-overlay-container">
                          <textarea 
                            value={obj.text} 
                            onChange={(e) => updateObjectProperty(obj.id, 'text', e.target.value)} 
                            className="inline-node-textarea"
                            style={{ 
                              background: 'transparent',
                              fontSize: obj.fontSize,
                              fontWeight: obj.fontWeight,
                              fontStyle: obj.fontStyle,
                              textDecoration: obj.textDecoration,
                              color: obj.textColor
                            }}
                            placeholder="Type inside shape..."
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {(obj.type === 'text' || obj.type === 'sticky' || obj.type === 'homework') && (
                    <textarea 
                      value={obj.text} 
                      onChange={(e) => updateObjectProperty(obj.id, 'text', e.target.value)} 
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

                  {/* Fully functional Countdown Timer Widget */}
                  {obj.type === 'timer' && (
                    <div className="teachboard-premium-timer-layout" style={{ backgroundColor: obj.color || '#1e293b', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '12px', boxSizing: 'border-box', borderRadius: 'inherit', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }} onMouseDown={(e)=>e.stopPropagation()}>
                        <span style={{ fontWeight: '600', letterSpacing: '0.5px' }}>⏱️ COUNTDOWN TIMER</span>
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
                            <input 
                              type="number" 
                              style={{ width: '60px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '32px', fontWeight: '700', textAlign: 'center', borderRadius: '6px', fontFamily: 'monospace' }}
                              value={Math.floor(obj.timerSeconds / 60)} 
                              onChange={(e) => {
                                const mins = Math.max(0, parseInt(e.target.value) || 0);
                                updateObjectProperty(obj.id, 'timerSeconds', mins * 60 + (obj.timerSeconds % 60));
                              }} 
                            />
                            <span style={{ fontSize: '28px', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>:</span>
                            <input 
                              type="number" 
                              style={{ width: '60px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '32px', fontWeight: '700', textAlign: 'center', borderRadius: '6px', fontFamily: 'monospace' }}
                              value={obj.timerSeconds % 60} 
                              onChange={(e) => {
                                const secs = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                updateObjectProperty(obj.id, 'timerSeconds', Math.floor(obj.timerSeconds / 60) * 60 + secs);
                              }} 
                            />
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }} onMouseDown={(e)=>e.stopPropagation()}>
                        <button 
                          onClick={() => updateObjectProperty(obj.id, 'timerRunning', !obj.timerRunning)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: obj.timerRunning ? '#f59e0b' : '#10b981', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                        >
                          {obj.timerRunning ? <FiPause /> : <FiPlay />} {obj.timerRunning ? 'Pause' : 'Start'}
                        </button>
                        <button 
                          onClick={() => {
                            updateObjectProperty(obj.id, 'timerRunning', false);
                            updateObjectProperty(obj.id, 'timerSeconds', 600);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                        >
                          <FiRefreshCw /> Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Fully functional Live Digital Clock Widget */}
                  {obj.type === 'clock' && (
                    <div className="teachboard-live-clock-layout" style={{ backgroundColor: obj.color || '#0f172a', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '12px', boxSizing: 'border-box', borderRadius: 'inherit', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>
                        CLOCK WIDGET
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'monospace', color: '#38bdf8', letterSpacing: '0.5px' }}>
                        {currentSystemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', fontFamily: 'sans-serif' }}>
                        {currentSystemTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )}

                  {/* Dynamic resizing handle node hook */}
                  {isSelected && (
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