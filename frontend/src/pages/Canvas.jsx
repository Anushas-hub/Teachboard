import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiSquare, FiCircle, FiCornerRightDown, FiTrash2, FiDownload, FiArrowLeft } from 'react-icons/fi';
import '../styles/Canvas.css';

function Canvas() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#2c6dd4'); // Defaults to branding teal-blue hex profile

  useEffect(() => {
    const canvas = canvasRef.current;
    // Window resolution support handling setup
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext('2d');
    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = color;
    context.lineWidth = 4;
    contextRef.current = context;
  }, []);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
    }
  }, [color]);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="canvas-workspace-wrapper">
      {/* Floating Header Toolbar Area */}
      <div className="canvas-floating-toolbar">
        <button className="toolbar-back-btn" onClick={() => navigate('/')}>
          <FiArrowLeft /> Back
        </button>
        
        <div className="toolbar-divider"></div>
        
        {/* Color Palette Controls */}
        <div className="color-selectors">
          <button className={`color-dot ${color === '#2c6dd4' ? 'active' : ''}`} style={{ backgroundColor: '#2c6dd4' }} onClick={() => setColor('#2c6dd4')}></button>
          <button className={`color-dot ${color === '#ef4444' ? 'active' : ''}`} style={{ backgroundColor: '#ef4444' }} onClick={() => setColor('#ef4444')}></button>
          <button className={`color-dot ${color === '#10b981' ? 'active' : ''}`} style={{ backgroundColor: '#10b981' }} onClick={() => setColor('#10b981')}></button>
          <button className={`color-dot ${color === '#0f172a' ? 'active' : ''}`} style={{ backgroundColor: '#0f172a' }} onClick={() => setColor('#0f172a')}></button>
        </div>

        <div className="toolbar-divider"></div>

        <button className="toolbar-action-btn" onClick={clearCanvas} title="Clear Entire Canvas Layout">
          <FiTrash2 /> Clear
        </button>
      </div>

      {/* Main Vector Layer Sheet Canvas HTML5 Target Anchor */}
      <canvas
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        ref={canvasRef}
        className="realtime-drawing-board"
      />
    </div>
  );
}

export default Canvas;