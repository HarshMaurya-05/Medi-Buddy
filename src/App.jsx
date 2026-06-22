import React, { useState } from 'react';
import MedicineVerifier from './components/MedicineVerifier';
import HealthChatbot from './components/HealthChatbot';
import DrugInteractionChecker from './components/DrugInteractionChecker';
import PrescriptionReader from './components/PrescriptionReader';
import VerificationHistory from './components/VerificationHistory';

function App() {
  const [activeTab, setActiveTab] = useState('verify');

  return (
    <div className="app">
      {/* ── Header ─────────────────────────── */}
      <header className="header">
        <div className="header-inner">
          <a href="/" className="nav-brand">
            <svg className="nav-brand-icon" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M18 2L4 9v9c0 9.25 5.97 17.9 14 20 8.03-2.1 14-10.75 14-20V9L18 2z"
                fill="url(#shield-grad)"
                fillOpacity="0.15"
                stroke="url(#shield-grad)"
                strokeWidth="1.5"
              />
              <path
                d="M13 18h10M18 13v10"
                stroke="url(#shield-grad)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="shield-grad" x1="4" y1="2" x2="32" y2="31" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#06b6d4" />
                  <stop offset="1" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="nav-brand-text">
              <span className="nav-brand-name">MedVerify</span>
              <span className="nav-brand-subtitle">Pharmaceutical Authentication Platform</span>
            </div>
          </a>

          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'verify' ? 'active' : ''}`}
              onClick={() => setActiveTab('verify')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="nav-tab-label">Verify</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'interactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('interactions')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 8 16 13" />
                <line x1="21" y1="8" x2="9" y2="8" />
                <polyline points="8 21 3 16 8 11" />
                <line x1="3" y1="16" x2="15" y2="16" />
              </svg>
              <span className="nav-tab-label">Interactions</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'prescription' ? 'active' : ''}`}
              onClick={() => setActiveTab('prescription')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="nav-tab-label">Prescription</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="nav-tab-label">Assistant</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="nav-tab-label">History</span>
            </button>
          </nav>

          <div className="nav-status">
            <span className="nav-status-dot" />
            <span>System Online</span>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────── */}
      <main>
        {activeTab === 'verify' && <MedicineVerifier />}
        {activeTab === 'interactions' && <DrugInteractionChecker />}
        {activeTab === 'prescription' && <PrescriptionReader />}
        {activeTab === 'chat' && <HealthChatbot />}
        {activeTab === 'history' && <VerificationHistory />}
      </main>

      {/* ── Footer ─────────────────────────── */}
      {activeTab !== 'chat' && (
        <footer className="footer">
          <p className="footer-text">
            © {new Date().getFullYear()} MedVerify — Pharmaceutical Authentication Platform.
            <br />
            <span style={{ opacity: 0.7 }}>
              This tool provides AI-assisted verification and is not a substitute for professional pharmaceutical consultation.
            </span>
          </p>
        </footer>
      )}
    </div>
  );
}

export default App;
