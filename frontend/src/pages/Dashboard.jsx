import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiGrid, FiFolder, FiSliders, FiLogOut, FiTrash2, FiExternalLink, FiClock, FiActivity, FiUsers, FiTv } from 'react-icons/fi';
import '../styles/Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Educator');
  const [boards, setBoards] = useState([]); // Dynamic loading mapping state block array initialization

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const savedName = localStorage.getItem('user_name');
    if (savedName) setUserName(savedName);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

  const deleteBoard = (id, e) => {
    e.stopPropagation();
    setBoards(boards.filter(board => board.id !== id));
  };

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <FiActivity style={{ color: '#2c6dd4' }} /> TeachBoard
        </div>
        
        <nav className="sidebar-menu">
          <button className="menu-item active"><FiGrid /> Overview</button>
          <button className="menu-item"><FiFolder /> My Whiteboards</button>
          <button className="menu-item"><FiSliders /> Global Widgets</button>
        </nav>

        <button className="sidebar-logout" onClick={handleLogout}>
          <FiLogOut /> Logout Panel
        </button>
      </aside>

      <main className="dashboard-main-content">
        <header className="dashboard-top-bar">
          <div className="welcome-text">
            <h2>Welcome back, {userName}!</h2>
            <p>Ready to manage your smart interactive canvas layers today?</p>
          </div>
          
          <button className="create-board-btn" onClick={() => navigate('/canvas/new')}>
            <FiPlus /> New Canvas Board
          </button>
        </header>

        <section className="metrics-summary-row">
          <div className="metric-card">
            <div className="metric-info">
              <h3>{boards.length}</h3>
              <p>Total Saved Canvases</p>
            </div>
            <span className="metric-badge-icon" style={{ color: '#2c6dd4' }}><FiGrid /></span>
          </div>
          <div className="metric-card">
            <div className="metric-info">
              <h3>0</h3>
              <p>Active Live Classrooms</p>
            </div>
            <span className="metric-badge-icon" style={{ color: '#10b981' }}><FiUsers /></span>
          </div>
          <div className="metric-card">
            <div className="metric-info">
              <h3>0 hrs</h3>
              <p>Recorded Lectures</p>
            </div>
            <span className="metric-badge-icon" style={{ color: '#f59e0b' }}><FiTv /></span>
          </div>
        </section>

        <section className="boards-management-section">
          <div className="section-title-row">
            <h3>Your Recent Whiteboards</h3>
          </div>

          {boards.length === 0 ? (
            <div className="empty-state-card">
              <p>No active workspace canvases found. Start drawing now!</p>
              <button className="create-board-btn" onClick={() => navigate('/canvas/new')}>
                <FiPlus /> Create First Board
              </button>
            </div>
          ) : (
            <div className="boards-layout-grid">
              {boards.map((board) => (
                <div 
                  key={board.id} 
                  className="canvas-preview-card"
                  onClick={() => navigate(`/canvas/${board.id}`)}
                >
                  <div className="card-mock-thumbnail">
                    <span className="thumbnail-placeholder-artwork" style={{ color: '#64748b' }}><FiFolder /></span>
                  </div>
                  
                  <div className="card-details-area">
                    <h4>{board.title}</h4>
                    <div className="card-meta-metrics-row">
                      <span><FiClock /> {board.lastModified}</span>
                      <span>• {board.elementsCount} objects</span>
                    </div>
                  </div>

                  <div className="card-actions-hover-overlay">
                    <button 
                      className="overlay-action-btn delete-trigger" 
                      onClick={(e) => deleteBoard(board.id, e)}
                      title="Delete Template Data"
                    >
                      <FiTrash2 />
                    </button>
                    <button className="overlay-action-btn enter-trigger" title="Launch Board Canvas Editor">
                      <FiExternalLink />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;