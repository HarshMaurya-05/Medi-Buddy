import React, { useState, useRef } from 'react';

const initialFormData = {
  medicineName: '',
  manufacturer: '',
  batchNumber: '',
  expiryDate: '',
  additionalInfo: '',
};

function MedicineVerifier() {
  const [mode, setMode] = useState('image');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const fileInputRef = useRef(null);

  /* ── Drag & Drop handlers ─────────────── */
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file) => {
    setImageFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Form handlers ────────────────────── */
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ── History handler ───────────────────── */
  const saveToHistory = (resultData) => {
    try {
      const history = JSON.parse(localStorage.getItem('medverify_history') || '[]');
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        mode,
        medicineName: resultData.medicineName || formData.medicineName || 'Unknown Medicine',
        result: resultData,
      };
      history.unshift(entry); // newest first
      // Keep max 50 entries
      if (history.length > 50) history.pop();
      localStorage.setItem('medverify_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save to history:', e);
    }
  };

  /* ── Submit handlers ──────────────────── */
  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      let res;

      if (mode === 'image') {
        const fd = new FormData();
        fd.append('image', imageFile);
        res = await fetch('/api/verify/image', {
          method: 'POST',
          body: fd,
        });
      } else {
        res = await fetch('/api/verify/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Verification failed (${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
        saveToHistory(data.data);
      } else {
        throw new Error(data.error || 'Verification returned no data.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setResult(null);
    setError(null);
    setImageFile(null);
    setImagePreview(null);
    setFormData(initialFormData);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSubmit =
    mode === 'image' ? !!imageFile && !loading : formData.medicineName.trim() !== '' && !loading;

  /* ── Status helpers ───────────────────── */
  const getStatusConfig = (status) => {
    switch (status) {
      case 'VERIFIED':
        return { cls: 'verified', icon: '✓', label: 'Verified Authentic', desc: 'This medicine has been verified as authentic.' };
      case 'SUSPICIOUS':
        return { cls: 'suspicious', icon: '⚠', label: 'Suspicious', desc: 'Some details could not be verified. Exercise caution.' };
      case 'UNVERIFIED':
        return { cls: 'unverified', icon: '✕', label: 'Unverified', desc: 'This medicine could not be verified. Do not consume.' };
      default:
        return { cls: 'insufficient', icon: 'ℹ', label: 'Insufficient Data', desc: 'Not enough information to make a determination.' };
    }
  };

  const getConfidenceClass = (pct) => {
    if (pct >= 70) return 'high';
    if (pct >= 40) return 'medium';
    return 'low';
  };

  /* ── Render ───────────────────────────── */
  return (
    <div className="container" style={{ paddingBottom: '48px' }}>
      {/* Hero */}
      <section className="hero-section animate-fade-in">
        <h1 className="hero-title">
          Verify Medicine <span className="text-gradient">Authenticity</span>
        </h1>
        <p className="hero-subtitle">
          Upload an image of your medicine or enter its details to verify authenticity, check interactions, and access safety information.
        </p>
      </section>

      {/* If result exists, show results instead of form */}
      {result ? (
        <ResultsView result={result} getStatusConfig={getStatusConfig} getConfidenceClass={getConfidenceClass} onReset={resetAll} />
      ) : (
        <>
          {/* Mode Toggle */}
          <div className="mode-toggle mb-md animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className={`mode-card ${mode === 'image' ? 'active' : ''}`} onClick={() => setMode('image')}>
              <svg className="mode-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <div className="mode-card-title">Scan Image</div>
              <div className="mode-card-desc">Upload a photo of the medicine packaging or label</div>
            </div>
            <div className={`mode-card ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>
              <svg className="mode-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <div className="mode-card-title">Enter Details</div>
              <div className="mode-card-desc">Manually type the medicine name, batch number, and more</div>
            </div>
          </div>

          {/* Image Mode */}
          {mode === 'image' && (
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {!imagePreview ? (
                <div
                  className={`upload-zone ${dragActive ? 'dragover' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <svg className="upload-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="upload-zone-text">Drag & drop your medicine image here</p>
                  <p className="upload-zone-hint">or click to browse · JPG, PNG, WebP supported</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Medicine preview" className="image-preview" />
                  {!loading && (
                    <button className="image-preview-remove" onClick={removeImage} title="Remove image">
                      ✕
                    </button>
                  )}
                  {loading && (
                    <div className="scanner-overlay">
                      <div className="scanner-line" />
                      <span className="scanner-text">Analyzing...</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-lg text-center">
                <button className="btn btn-primary btn-lg" disabled={!canSubmit} onClick={handleSubmit}>
                  {loading ? (
                    <>
                      <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      Analyze Medicine
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Text Mode */}
          {mode === 'text' && (
            <div className="card-static animate-fade-in" style={{ padding: '32px', animationDelay: '0.2s' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="medicineName">Medicine Name *</label>
                <input
                  id="medicineName"
                  className="input"
                  name="medicineName"
                  placeholder="e.g., Paracetamol 500mg"
                  value={formData.medicineName}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="manufacturer">Manufacturer</label>
                <input
                  id="manufacturer"
                  className="input"
                  name="manufacturer"
                  placeholder="e.g., GlaxoSmithKline"
                  value={formData.manufacturer}
                  onChange={handleFormChange}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="batchNumber">Batch Number</label>
                  <input
                    id="batchNumber"
                    className="input font-mono"
                    name="batchNumber"
                    placeholder="e.g., BN-2024-0847"
                    value={formData.batchNumber}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="expiryDate">Expiry Date</label>
                  <input
                    id="expiryDate"
                    className="input"
                    name="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={handleFormChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="additionalInfo">Additional Information</label>
                <textarea
                  id="additionalInfo"
                  className="textarea"
                  name="additionalInfo"
                  placeholder="Any other details — dosage, markings, color, shape, etc."
                  value={formData.additionalInfo}
                  onChange={handleFormChange}
                  rows={3}
                />
              </div>

              <div className="mt-lg text-center">
                <button className="btn btn-primary btn-lg" disabled={!canSubmit} onClick={handleSubmit}>
                  {loading ? (
                    <>
                      <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Verify Medicine
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="error-banner mt-lg animate-fade-in">
              <span className="error-banner-icon">⚠</span>
              <span className="error-banner-text">{error}</span>
              <button className="btn btn-secondary btn-sm" onClick={handleSubmit}>
                Retry
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Results Sub-Component ────────────────── */
function ResultsView({ result, getStatusConfig, getConfidenceClass, onReset }) {
  const status = getStatusConfig(result.status);
  const confidence = result.confidence ?? 0;

  return (
    <div className="animate-slide-up">
      {/* Status Banner */}
      <div className={`status-banner ${status.cls}`}>
        <div className="status-banner-icon">{status.icon}</div>
        <div className="status-banner-text">
          <h3>{status.label}</h3>
          <p>{status.desc}</p>
        </div>
        <span className={`badge status-${status.cls}`} style={{ marginLeft: 'auto' }}>
          {result.status}
        </span>
      </div>

      {/* Confidence Bar */}
      <div className="confidence-bar-container mb-md">
        <div className="confidence-bar-label">
          <span>Confidence Level</span>
          <span className="font-mono" style={{ fontWeight: 600 }}>{confidence}%</span>
        </div>
        <div className="confidence-bar">
          <div
            className={`confidence-bar-fill ${getConfidenceClass(confidence)}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {/* Detail Grid */}
      <div className="result-grid mb-md">
        {result.activeIngredients && result.activeIngredients.length > 0 && (
          <div className="result-item">
            <div className="result-item-title">Active Ingredients</div>
            <div className="result-item-list">
              {result.activeIngredients.map((item, i) => (
                <span className="result-item-list-item" key={i}>{item}</span>
              ))}
            </div>
          </div>
        )}

        {result.manufacturer && (
          <div className="result-item">
            <div className="result-item-title">Manufacturer</div>
            <div className="result-item-content">
              <div style={{ fontWeight: 600 }}>{result.manufacturer.name || result.manufacturer}</div>
              {result.manufacturer.country && (
                <div className="text-sm" style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                  {result.manufacturer.country}
                </div>
              )}
              {result.manufacturer.verified && (
                <span className="badge status-verified mt-sm" style={{ fontSize: '0.65rem' }}>
                  ✓ Verified Manufacturer
                </span>
              )}
            </div>
          </div>
        )}

        {result.dosageInfo && (
          <div className="result-item">
            <div className="result-item-title">Dosage Information</div>
            <div className="result-item-content">{result.dosageInfo}</div>
          </div>
        )}

        {result.storageConditions && (
          <div className="result-item">
            <div className="result-item-title">Storage Conditions</div>
            <div className="result-item-content">{result.storageConditions}</div>
          </div>
        )}

        {result.warnings && result.warnings.length > 0 && (
          <div className="result-item">
            <div className="result-item-title" style={{ color: 'var(--accent-amber)' }}>Warnings</div>
            <div className="result-item-list">
              {result.warnings.map((item, i) => (
                <span className="result-item-list-item warning" key={i}>{item}</span>
              ))}
            </div>
          </div>
        )}

        {result.sideEffects && result.sideEffects.length > 0 && (
          <div className="result-item">
            <div className="result-item-title">Side Effects</div>
            <div className="result-item-list">
              {result.sideEffects.map((item, i) => (
                <span className="result-item-list-item" key={i}>{item}</span>
              ))}
            </div>
          </div>
        )}

        {result.interactions && result.interactions.length > 0 && (
          <div className="result-item">
            <div className="result-item-title">Drug Interactions</div>
            <div className="result-item-list">
              {result.interactions.map((item, i) => (
                <span className="result-item-list-item warning" key={i}>{item}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {result.summary && (
        <div className="card-static" style={{ padding: '20px 24px', marginBottom: 20 }}>
          <div className="result-item-title" style={{ marginBottom: 8 }}>Analysis Summary</div>
          <p className="result-item-content" style={{ color: 'var(--text-secondary)' }}>
            {result.summary}
          </p>
        </div>
      )}

      {/* Reset */}
      <div className="text-center">
        <button className="btn btn-secondary btn-lg" onClick={onReset}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Verify Another Medicine
        </button>
      </div>
    </div>
  );
}

export default MedicineVerifier;
