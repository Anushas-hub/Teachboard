import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEdit3, FiUsers, FiDownload, FiVideo, FiLayers, FiSettings, FiActivity, FiArrowRight, FiLogIn, FiUserPlus, FiUserPlus as FiUserCheck, FiX } from 'react-icons/fi';
import '../styles/Landing.css';

function Landing() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsLoggedIn(true);
    }

    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowGateModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleActionClick = (e) => {
    e.preventDefault();
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      setShowGateModal(true);
    }
  };

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <FiActivity className="logo-icon" style={{ color: '#2c6dd4' }} /> TeachBoard
        </div>
        <div className="landing-nav-buttons">
          {isLoggedIn ? (
            <Link to="/dashboard" className="landing-nav-btn">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="landing-nav-link">Log in</Link>
              <button onClick={handleActionClick} className="landing-nav-btn">
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-badge">Next-Gen Virtual Classroom Canvas</div>
        <h1>The smart whiteboard built for teaching</h1>
        <p>
          Create, collaborate, and teach better with a digital whiteboard designed 
          for modern classrooms. Enjoy fluid layouts, sticky notes, widgets, and live sharing.
        </p>
        <div className="landing-hero-buttons">
          <button onClick={handleActionClick} className="landing-cta-primary" style={{ border: 'none', cursor: 'pointer' }}>
            Start Working <FiArrowRight style={{ marginLeft: '8px', display: 'inline-block', verticalAlign: 'middle' }} />
          </button>
        </div>
      </section>

      {/* Gateway Option Workspace Modal Backdrop Layer */}
      {showGateModal && (
        <div className="gateway-modal-overlay">
          <div className="gateway-modal-card" ref={modalRef}>
            <button className="modal-close-btn" onClick={() => setShowGateModal(false)}>
              <FiX />
            </button>
            <h3>Choose Workspace Mode</h3>
            <p>Sign in to tracking analytics or enter immediately as guest.</p>
            
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

      {/* Features Grid */}
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

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 TeachBoard. Designed for educators, built with performance in mind.</p>
      </footer>
    </div>
  );
}

export default Landing;