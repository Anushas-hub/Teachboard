import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit3, FiUsers, FiDownload, FiVideo, FiLayers, FiSettings, FiActivity, FiSun, FiMoon, FiPlay, FiLogIn, FiUserCheck, FiX } from 'react-icons/fi';
import '../styles/Landing.css';

function Landing() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) setIsLoggedIn(true);

    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowGateModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.body.classList.add('dark-theme-mode');
    } else {
      document.body.classList.remove('dark-theme-mode');
    }
  };

  const handleWorkspaceTrigger = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      setShowGateModal(true);
    }
  };

  return (
    <div className="landing-page">
      
      {/* Premium Minimal Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo-container">
          <FiActivity className="logo-icon-animated" /> 
          <span className="logo-text">TeachBoard</span>
        </div>

        <div className="landing-nav-action-center">
          {/* Theme Switcher Action Control */}
          <button className="theme-icon-toggle-btn" onClick={toggleTheme} title="Switch Interface Mode">
            {isDarkMode ? <FiSun style={{ color: '#fbbf24' }} /> : <FiMoon style={{ color: '#64748b' }} />}
          </button>

          <div className="nav-vertical-divider"></div>

          <button onClick={handleWorkspaceTrigger} className="premium-nav-action-cta">
            {isLoggedIn ? "Workspace Console" : "Launch Studio Workspace"}
          </button>
        </div>
      </nav>

      {/* Main Studio Hero Structure */}
      <section className="landing-hero">
        <div className="hero-badge">Next-Gen Virtual Classroom Canvas</div>
        <h1>The smart whiteboard built for teaching</h1>
        <p>
          Create, collaborate, and teach better with a digital whiteboard designed 
          for modern classrooms. Enjoy fluid layouts, sticky notes, widgets, and live sharing.
        </p>
        
        <div className="landing-hero-buttons">
          <button className="landing-cta-primary-video" onClick={() => alert("Tutorial video connector placeholder dynamic switch ready.")}>
            <FiPlay /> Watch Tutorial
          </button>
        </div>
      </section>

      {/* Gateway Entry Interactive Modal */}
      {showGateModal && (
        <div className="gateway-modal-overlay">
          <div className="gateway-modal-card" ref={modalRef}>
            <button className="modal-close-btn" onClick={() => setShowGateModal(false)}>
              <FiX />
            </button>
            <h3>Choose Workspace Mode</h3>
            <p>Sign in to track cloud analytics or enter immediately as a guest.</p>
            
            <div className="gateway-options-stack">
              <button className="gate-btn primary-gate-btn" onClick={() => navigate('/login')}>
                <FiLogIn /> Sign In / Create Account
              </button>
              <div className="gate-divider"><span>OR</span></div>
              <button className="gate-btn secondary-gate-btn" onClick={() => navigate('/canvas')}>
                <FiUserCheck /> Continue without Login (Guest)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Features System Architecture Grid */}
      <section className="landing-features">
        <div className="landing-feature-card">
          <div className="icon-wrapper"><FiEdit3 /></div>
          <h3>Interactive Canvas</h3>
          <p>Draw, write, and align shapes or sticky notes with pixel-perfect precision.</p>
        </div>
        <div className="landing-feature-card">
          <div className="icon-wrapper"><FiUsers /></div>
          <h3>Live Collaboration</h3>
          <p>Generate a room link instantly to let your students join and interact live.</p>
        </div>
        <div className="landing-feature-card">
          <div className="icon-wrapper"><FiVideo /></div>
          <h3>Screen Recording</h3>
          <p>Record your lectures on the go and save recordings straight to your dashboard.</p>
        </div>
        <div className="landing-feature-card">
          <div className="icon-wrapper"><FiDownload /></div>
          <h3>Export Options</h3>
          <p>Convert your canvas notes into high-quality PDFs or images with a single click.</p>
        </div>
        <div className="landing-feature-card">
          <div className="icon-wrapper"><FiLayers /></div>
          <h3>Layered Workspace</h3>
          <p>Manage elements easily. Lock components, group shapes, and stack visual layers freely.</p>
        </div>
        <div className="landing-feature-card">
          <div className="icon-wrapper"><FiSettings /></div>
          <h3>Custom Classroom Widgets</h3>
          <p>Add custom visual timers, traffic lights, noise level indicators, and counters.</p>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2026 TeachBoard. Designed for educators, built with performance in mind.</p>
      </footer>
    </div>
  );
}

export default Landing;