import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiType, FiSquare, FiMousePointer, FiRotateCcw, 
  FiSave, FiAlertCircle, FiPlus, FiArrowLeft, FiTrash2, 
  FiFileText, FiClock, FiHelpCircle, FiSettings, FiMaximize2,
  FiBold, FiItalic, FiBookOpen, FiActivity
} from 'react-icons/fi';
import axios from 'axios';
import '../styles/Canvas.css';

function Canvas() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTool, setActiveTool] = useState('select');
  const [objects, setObjects] = useState([]);
  const [boardId, setBoardId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  
  // Drag-and-Drop & Resize Interactive Operational States
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [tickerToggle, setTickerToggle] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) setIsLoggedIn(true);

    const alertTimer = setInterval(() => {
      setTickerToggle(prev => !prev);
    }, 4000);
    return () => clearInterval(alertTimer);
  }, []);

  // Custom Live Interactive Countdown System Inside Canvas Items 
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setObjects(prevObjects => 
        prevObjects.map(obj => {
          if (obj.type === 'timer' && obj.timerRunning && obj.timerSeconds > 0) {
            return { ...obj, timerSeconds: obj.timerSeconds - 1 };
          } else if (obj.type === 'timer' && obj.timerRunning && obj.timerSeconds === 0) {
            return { ...obj, timerRunning: false, text: "🕒 Time's Up!" };
          }
          return obj;
        })
      );
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const handleAddObject = (type, subType = '') => {
    const baseOffset = objects.length * 20;
    
    let defaultWidth = 160;
    let defaultHeight = 110;
    let initialText = '';
    
    if (type === 'text') {
      defaultWidth = 220;
      defaultHeight = 60;
      initialText = subType === 'heading' ? 'Main Heading Title' : subType === 'subheading' ? 'Subheading Topic' : 'Standard paragraph body text...';
    } else if (type === 'sticky') {
      defaultWidth = 150;
      defaultHeight = 150;
      initialText = 'Sticky Note Idea';
    } else if (type === 'timer') {
      defaultWidth = 200;
      defaultHeight = 120;
      initialText = 'Exam Countdown';
    } else if (type === 'homework') {
      defaultWidth = 320;
      defaultHeight = 180;
      initialText = '📝 HOMEWORK TASK:\n1. Solve Exercise 4.2 Complete.\n2. Review theorem proofs.';
    }

    const newObj = {
      id: Date.now().toString(),
      type: type,
      subType: subType, // 'heading', 'circle', 'diamond' etc
      x: 350 + baseOffset,
      y: 180 + baseOffset,
      text: initialText,
      width: defaultWidth,
      height: defaultHeight,
      // Advanced Dynamic Custom Attributes
      fontFamily: 'Inter, sans-serif',
      fontSize: subType === 'heading' ? '24px' : subType === 'subheading' ? '18px' : '14px',
      fontWeight: subType === 'heading' || subType === 'subheading' ? 'bold' : 'normal',
      color: type === 'sticky' ? '#fff9c4' : '#ffffff',
      textColor: '#1e293b',
      timerSeconds: 300, // 5 Mins default
      timerRunning: false
    };
    
    setObjects([...objects, newObj]);
    setSelectedId(newObj.id);
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
        width: Math.max(80, resizeStart.width + deltaX),
        height: Math.max(40, resizeStart.height + deltaY)
      } : o));
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Node Multi-property Editor Update Modifiers
  const updateSelectedProperty = (property, value) => {
    if (!selectedId) return;
    setObjects(objects.map(o => o.id === selectedId ? { ...o, [property]: value } : o));
  };

  const toggleTimer = (id) => {
    setObjects(objects.map(o => o.id === id ? { ...o, timerRunning: !o.timerRunning } : o));
  };

  const formatTimerValue = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSyncBackend = async () => {
    try {
      const payload = { board_id: boardId, title: "TeachBoard Advanced Space", objects };
      const res = await axios.post('http://127.0.0.1:8000/api/save-board/', payload);
      if(res.data.status === 'success') {
        setBoardId(res.data.board_id);
        alert("Board layouts sync down to production server state!");
      }
    } catch (err) {
      console.error(err);
      alert("Error processing cluster persistence synchronization update.");
    }
  };

  const currentSelectedNode = objects.find(o => o.id === selectedId);

  return (
    <div className="canvas-studio-container" onMouseMove={handlePointerMove} onMouseUp={handlePointerUp}>
      <header className="canvas-header-nav">
        <div className="header-meta-group">
          <button className="canvas-back-btn" onClick={() => navigate('/')}><FiArrowLeft /></button>
          <span className="project-title-badge">TeachBoard Smart Sandbox</span>
        </div>

        {/* Dynamic Context Font-Size Styling Context Topbar HUD */}
        {currentSelectedNode && (
          <div className="canvas-node-context-hud animate-slide-in">
            <span className="hud-label">Format Node:</span>
            <select 
              value={currentSelectedNode.fontFamily} 
              onChange={(e) => updateSelectedProperty('fontFamily', e.target.value)}
              className="hud-selector"
            >
              <option value="Inter, sans-serif">Sans-Serif (Clean)</option>
              <option value="'Playfair Display', serif">Serif (Formal)</option>
              <option value="'Courier New', monospace">Monospace (Code)</option>
              <option value="'Comic Sans MS', cursive">Comic (Kids/School)</option>
            </select>

            <select 
              value={currentSelectedNode.fontSize} 
              onChange={(e) => updateSelectedProperty('fontSize', e.target.value)}
              className="hud-selector"
            >
              <option value="12px">Small Text</option>
              <option value="15px">Body Medium</option>
              <option value="20px">Subheading (H2)</option>
              <option value="28px">Title Header (H1)</option>
            </select>

            <input 
              type="color" 
              value={currentSelectedNode.textColor || '#000000'} 
              onChange={(e) => updateSelectedProperty('textColor', e.target.value)}
              className="hud-color-dot"
              title="Font Color Picker"
            />
          </div>
        )}

        <div className="canvas-header-actions">
          <button className="canvas-utility-btn primary-save-trigger" onClick={handleSyncBackend}><FiSave /> <span>Save Space</span></button>
        </div>
      </header>

      <div className="canvas-workspace-layout">
        <aside className="canvas-floating-toolbox">
          <button className={`tool-action-btn ${activeTool === 'select' ? 'tool-active' : ''}`} onClick={() => setActiveTool('select')} title="Selection Mode"><FiMousePointer /></button>
          
          <div className="toolbox-section-divider"></div>
          
          {/* Typography Complex Cluster Actions */}
          <button className="tool-action-btn" onClick={() => handleAddObject('text', 'heading')} title="Add Heading (H1)"><FiBold /></button>
          <button className="tool-action-btn" onClick={() => handleAddObject('text', 'paragraph')} title="Add Body Text"><FiType /></button>
          <button className="tool-action-btn" onClick={() => handleAddObject('sticky', '')} title="Yellow Sticky Notes"><FiFileText /></button>
          
          <div className="toolbox-section-divider"></div>
          
          {/* Advanced Shape Primitive Matrices */}
          <button className="tool-action-btn" onClick={() => handleAddObject('shape', 'rect')} title="Add Rectangle Shape"><FiSquare /></button>
          <button className="tool-action-btn" onClick={() => handleAddObject('shape', 'circle')} title="Add Interactive Circle"><span className="custom-circle-icon-primitive"></span></button>
          
          <div className="toolbox-section-divider"></div>
          
          {/* Smart Functional Whiteboard Utilities */}
          <button className="tool-action-btn timer-widget-trigger" onClick={() => handleAddObject('timer')} title="Inject Live Countdown Timer"><FiClock /></button>
          <button className="tool-action-btn homework-widget-trigger" onClick={() => handleAddObject('homework')} title="Deploy Homework Section Block"><FiBookOpen /></button>
          
          <div className="toolbox-section-divider"></div>
          
          <button className="tool-action-btn danger-reset-trigger" onClick={() => setObjects([])} title="Wipe Workspace Clean"><FiTrash2 /></button>
        </aside>

        <main className="canvas-infinite-board-surface" onClick={() => setSelectedId(null)}>
          {objects.length === 0 && (
            <div className="empty-canvas-fallback">
              <div className="fallback-illustration-box"><FiPlus className="pulse-icon" /></div>
              <h4>TeachBoard Sandbox Canvas Empty</h4>
              <p>Deploy custom typography font nodes, geometric vector arrays, interactive test countdown timers or homework assignment blocks from the left toolkit stack layer.</p>
            </div>
          )}

          <div className="active-objects-render-layer">
            {objects.map((obj) => {
              const nodeStyles = {
                left: `${obj.x}px`,
                top: `${obj.y}px`,
                width: `${obj.width}px`,
                height: `${obj.height}px`,
                fontFamily: obj.fontFamily,
                fontSize: obj.fontSize,
                fontWeight: obj.fontWeight,
                color: obj.textColor
              };

              return (
                <div 
                  key={obj.id}
                  className={`live-render-node node-${obj.type} node-sub-${obj.subType} ${selectedId === obj.id ? 'node-selected-focus' : ''}`}
                  style={nodeStyles}
                  onMouseDown={(e) => handlePointerDown(e, obj)}
                >
                  {/* Rendering Controllers Based On Schema Context Types */}
                  {obj.type === 'shape' && obj.subType === 'rect' && (
                    <div className="shape-box-placeholder-inner rect-node-primitive"><span>Rectangle</span></div>
                  )}

                  {obj.type === 'shape' && obj.subType === 'circle' && (
                    <div className="shape-box-placeholder-inner circle-node-primitive"><span>Circle Grid</span></div>
                  )}

                  {(obj.type === 'text' || obj.type === 'sticky' || obj.type === 'homework') && (
                    <textarea 
                      value={obj.text} 
                      onChange={(e) => setObjects(objects.map(o => o.id === obj.id ? { ...o, text: e.target.value } : o))} 
                      className="inline-node-textarea"
                      style={{ fontFamily: obj.fontFamily, fontSize: obj.fontSize, color: obj.textColor }}
                    />
                  )}

                  {obj.type === 'timer' && (
                    <div className="live-timer-container-card">
                      <div className="timer-icon-group-row"><FiClock /> <span>{obj.text || 'Quiz Timer'}</span></div>
                      <div className="timer-clock-digits-face">{formatTimerValue(obj.timerSeconds)}</div>
                      <div className="timer-control-row-interaction">
                        <button 
                          className={`timer-toggle-btn ${obj.timerRunning ? 'running' : 'paused'}`}
                          onClick={(e) => { e.stopPropagation(); toggleTimer(obj.id); }}
                        >
                          {obj.timerRunning ? 'Pause' : 'Start'}
                        </button>
                        <button 
                          className="timer-reset-btn"
                          onClick={(e) => { e.stopPropagation(); setObjects(objects.map(o => o.id === obj.id ? { ...o, timerSeconds: 300, timerRunning: false, text: 'Quiz Timer' } : o)); }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Node Scalable Drag Resize Pull Points */}
                  {selectedId === obj.id && (
                    <div className="node-resize-handle" onMouseDown={(e) => handleResizeStart(e, obj)} />
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