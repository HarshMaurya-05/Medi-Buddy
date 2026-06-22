import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';

function VerificationHistory() {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState({});

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('medverify_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load history:', e);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all verification history? This action cannot be undone.')) {
      try {
        localStorage.removeItem('medverify_history');
        setHistory([]);
        setExpandedId(null);
      } catch (e) {
        console.warn('Failed to clear history:', e);
      }
    }
  };

  const handleDeleteItem = (id, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this verification record?')) {
      try {
        const updated = history.filter(item => item.id !== id);
        localStorage.setItem('medverify_history', JSON.stringify(updated));
        setHistory(updated);
        if (expandedId === id) setExpandedId(null);
      } catch (e) {
        console.warn('Failed to delete item:', e);
      }
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Stats calculation
  const totalCount = history.length;
  const verifiedCount = history.filter(item => item.result?.status === 'VERIFIED').length;
  const suspiciousCount = history.filter(item => item.result?.status === 'SUSPICIOUS').length;
  const unverifiedCount = history.filter(item => item.result?.status === 'UNVERIFIED' || item.result?.status === 'INSUFFICIENT_DATA').length;

  // Filter & search logic
  const filteredHistory = history.filter(item => {
    const statusMatch = filter === 'all' || 
      (filter === 'VERIFIED' && item.result?.status === 'VERIFIED') ||
      (filter === 'SUSPICIOUS' && item.result?.status === 'SUSPICIOUS') ||
      (filter === 'UNVERIFIED' && (item.result?.status === 'UNVERIFIED' || item.result?.status === 'INSUFFICIENT_DATA'));
    
    const searchMatch = searchQuery.trim() === '' || 
      item.medicineName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.result?.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());

    return statusMatch && searchMatch;
  });

  const getStatusText = (status) => {
    switch (status) {
      case 'VERIFIED': return 'Verified Authentic';
      case 'SUSPICIOUS': return 'Suspicious';
      case 'UNVERIFIED': return 'Unverified / Avoid';
      default: return 'Insufficient Data';
    }
  };

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }) + ' at ' + date.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return isoString;
    }
  };

  // PDF Export logic
  const handleExportPDF = async (item, e) => {
    e.stopPropagation();
    const id = item.id;
    setPdfGenerating(prev => ({ ...prev, [id]: true }));

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const res = item.result || {};
      const medName = item.medicineName || 'Unknown Medicine';
      const status = res.status || 'UNKNOWN';
      const confidence = res.confidence || 0;
      const dateStr = formatDate(item.timestamp);

      // PDF styling settings
      doc.setFillColor(10, 15, 28); // deep navy background for header
      doc.rect(0, 0, 210, 45, 'F');

      // Title
      doc.setTextColor(6, 182, 212); // teal/cyan
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('MedVerify', 15, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Pharmaceutical Authentication Report', 15, 26);

      // Timestamp of export
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(9);
      doc.text(`Report Generated: ${new Date().toLocaleString()}`, 140, 26);

      // Draw horizontal separator
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.5);
      doc.line(15, 45, 195, 45);

      // Section 1: Verification Result Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(241, 245, 249);
      doc.setFillColor(26, 34, 54); // Card background
      doc.rect(15, 55, 180, 32, 'F');

      // Add status specific coloring
      if (status === 'VERIFIED') {
        doc.setTextColor(16, 185, 129); // Green
        doc.text('STATUS: VERIFIED AUTHENTIC', 20, 64);
      } else if (status === 'SUSPICIOUS') {
        doc.setTextColor(245, 158, 11); // Amber
        doc.text('STATUS: SUSPICIOUS / UNVERIFIED DETAILS', 20, 64);
      } else {
        doc.setTextColor(239, 68, 68); // Red
        doc.text('STATUS: UNVERIFIED / HIGH RISK', 20, 64);
      }

      doc.setTextColor(241, 245, 249);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Medicine Name: ${medName}`, 20, 72);
      doc.text(`AI Confidence Score: ${confidence}%`, 20, 78);
      doc.text(`Date of Scan: ${dateStr}`, 120, 78);

      // Section 2: Detailed Attributes
      let y = 100;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(6, 182, 212);
      doc.text('CHEMICAL & MANUFACTURER DETAILS', 15, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85); // Dark text for body since PDF is printed on white

      const details = [
        ['Manufacturer:', res.manufacturer || 'Unknown / Not specified'],
        ['Batch Number:', res.batchNumber || 'Not specified'],
        ['Expiry Date:', res.expiryDate || 'Not specified'],
        ['Active Ingredients:', Array.isArray(res.activeIngredients) ? res.activeIngredients.join(', ') : (res.activeIngredients || 'Not detected')]
      ];

      details.forEach(([label, val]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 15, y);
        doc.setFont('helvetica', 'normal');
        
        // Wrap text for active ingredients in case they are long
        const splitText = doc.splitTextToSize(String(val), 130);
        doc.text(splitText, 55, y);
        y += (splitText.length * 5) + 2;
      });

      // Section 3: Safety Warnings & Indicators
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(6, 182, 212);
      doc.text('SAFETY INFORMATION & WARNINGS', 15, y);
      y += 8;

      doc.setFontSize(10);
      
      const safetyInfo = [
        ['Indications / Uses:', Array.isArray(res.indications) ? res.indications.join(', ') : (res.indications || 'General therapeutic use')],
        ['Warnings & Contraindications:', Array.isArray(res.warnings) ? res.warnings.join('; ') : (res.warnings || 'Consult physician before use')],
        ['Side Effects:', Array.isArray(res.sideEffects) ? res.sideEffects.join(', ') : (res.sideEffects || 'None reported')],
        ['Drug Interactions:', Array.isArray(res.interactions) ? res.interactions.join(', ') : (res.interactions || 'None reported')]
      ];

      safetyInfo.forEach(([label, val]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 15, y);
        doc.setFont('helvetica', 'normal');
        const wrappedVal = doc.splitTextToSize(String(val), 130);
        doc.text(wrappedVal, 55, y);
        y += (wrappedVal.length * 5) + 3;
      });

      // Section 4: AI Analysis Summary
      if (res.summary) {
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(6, 182, 212);
        doc.text('ANALYSIS SUMMARY', 15, y);
        y += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const wrappedSummary = doc.splitTextToSize(res.summary, 175);
        doc.text(wrappedSummary, 15, y);
        y += (wrappedSummary.length * 5) + 5;
      }

      // Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 275, 195, 275);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('This is an AI-assisted report generated by MedVerify. It does not replace professional medical or pharmacist advice.', 15, 280);
      doc.text('Page 1 of 1', 180, 280);

      // Download the PDF
      const sanitizeName = medName.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`MedVerify_${sanitizeName}_Report.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setPdfGenerating(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '48px' }}>
      {/* Hero */}
      <section className="hero-section animate-fade-in">
        <h1 className="hero-title">
          Verification <span className="text-gradient">History</span>
        </h1>
        <p className="hero-subtitle">
          Access local logs of all your scanned medicine packages, view full reports, and download PDF certifications.
        </p>
      </section>

      {/* Stats Cards */}
      <div className="stats-row animate-slide-up">
        <div className="stat-card">
          <div className="stat-card-value font-mono" style={{ color: 'var(--text-primary)' }}>{totalCount}</div>
          <div className="stat-card-label">Total Scans</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value font-mono" style={{ color: 'var(--accent-emerald)' }}>{verifiedCount}</div>
          <div className="stat-card-label">Verified</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value font-mono" style={{ color: 'var(--accent-amber)' }}>{suspiciousCount}</div>
          <div className="stat-card-label">Suspicious</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value font-mono" style={{ color: 'var(--accent-red)' }}>{unverifiedCount}</div>
          <div className="stat-card-label">Unverified</div>
        </div>
      </div>

      {/* Controls */}
      <div className="card-static mb-lg animate-fade-in" style={{ padding: '16px 20px' }}>
        <div className="history-controls">
          {/* Search bar */}
          <div className="history-search">
            <svg className="history-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="input"
              placeholder="Search history by medicine name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="history-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === 'VERIFIED' ? 'active' : ''}`}
              onClick={() => setFilter('VERIFIED')}
            >
              Verified
            </button>
            <button
              className={`filter-btn ${filter === 'SUSPICIOUS' ? 'active' : ''}`}
              onClick={() => setFilter('SUSPICIOUS')}
            >
              Suspicious
            </button>
            <button
              className={`filter-btn ${filter === 'UNVERIFIED' ? 'active' : ''}`}
              onClick={() => setFilter('UNVERIFIED')}
            >
              Unverified
            </button>
          </div>

          {/* Clear all */}
          {history.length > 0 && (
            <button className="btn btn-secondary" onClick={handleClearAll} style={{ padding: '6px 14px', fontSize: '0.8rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: 'var(--accent-red)' }}>
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {/* History list */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {filteredHistory.length > 0 ? (
          filteredHistory.map((item) => {
            const isExpanded = expandedId === item.id;
            const res = item.result || {};
            const statusLower = String(res.status || 'unverified').toLowerCase();
            const statusClass = statusLower === 'verified' ? 'verified' : (statusLower === 'suspicious' ? 'suspicious' : 'unverified');

            return (
              <div key={item.id} className="history-item" onClick={() => toggleExpand(item.id)}>
                <div className="history-item-header">
                  <div className={`history-status-bar ${statusClass}`} />
                  <div className="history-item-info">
                    <div className="history-item-name">{item.medicineName}</div>
                    <div className="history-item-date">{formatDate(item.timestamp)}</div>
                  </div>
                  <div className="history-item-meta">
                    <span className="mode-badge">
                      {item.mode === 'image' ? '📸 Image Scan' : '✏️ Text Input'}
                    </span>
                    <span className={`severity-badge severity-${res.status || 'UNVERIFIED'}`} style={{ fontSize: '0.65rem' }}>
                      {getStatusText(res.status)}
                    </span>
                    <span className="font-mono text-muted" style={{ fontSize: '0.8rem', minWidth: '40px', textAlign: 'right' }}>
                      {res.confidence || 0}%
                    </span>
                    <span className={`history-item-expand ${isExpanded ? 'open' : ''}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="history-item-details" onClick={(e) => e.stopPropagation()}>
                    <div className="result-grid" style={{ marginTop: '16px' }}>
                      <div className="result-item">
                        <div className="result-item-title">Manufacturer</div>
                        <div className="result-item-content">{res.manufacturer || 'Unknown'}</div>
                      </div>
                      <div className="result-item">
                        <div className="result-item-title">Batch Number</div>
                        <div className="result-item-content font-mono">{res.batchNumber || 'N/A'}</div>
                      </div>
                      <div className="result-item">
                        <div className="result-item-title">Expiry Date</div>
                        <div className="result-item-content">{res.expiryDate || 'N/A'}</div>
                      </div>
                      <div className="result-item">
                        <div className="result-item-title">Active Ingredients</div>
                        <div className="result-item-content">
                          {Array.isArray(res.activeIngredients) ? res.activeIngredients.join(', ') : (res.activeIngredients || 'None')}
                        </div>
                      </div>
                    </div>

                    <div className="result-grid" style={{ marginTop: '12px' }}>
                      {res.indications && res.indications.length > 0 && (
                        <div className="result-item">
                          <div className="result-item-title">Indications / Uses</div>
                          <div className="result-item-list">
                            {res.indications.map((item, i) => (
                              <span className="result-item-list-item" key={i}>{item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {res.warnings && res.warnings.length > 0 && (
                        <div className="result-item">
                          <div className="result-item-title">Contraindications & Warnings</div>
                          <div className="result-item-list">
                            {res.warnings.map((item, i) => (
                              <span className="result-item-list-item warning" key={i}>{item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {res.summary && (
                      <div style={{ background: 'var(--bg-input)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginTop: '16px' }}>
                        <div className="result-item-title" style={{ marginBottom: '6px' }}>Report Summary</div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{res.summary}</p>
                      </div>
                    )}

                    <div className="history-detail-actions">
                      <button
                        className="btn btn-primary"
                        onClick={(e) => handleExportPDF(item, e)}
                        disabled={pdfGenerating[item.id]}
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        {pdfGenerating[item.id] ? (
                          <>
                            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
                            Generating PDF...
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Export PDF Report
                          </>
                        )}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        style={{ padding: '6px 14px', fontSize: '0.8rem', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      >
                        Delete Record
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="card-static empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div className="empty-state-text">No matching logs found</div>
            <div className="empty-state-hint">
              {history.length === 0 
                ? 'Your verification history is empty. Scanned medicines will appear here.'
                : 'Try adjusting your search query or status filter.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerificationHistory;
