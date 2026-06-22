import React, { useState, useRef } from 'react';

function PrescriptionReader() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

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
    if (file) {
      processFile(file);
    }
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
    setError(null);
  };

  const handleSubmit = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const res = await fetch('/api/prescription/read', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed to read prescription (${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
      } else {
        throw new Error(data.error || 'Prescription analysis returned empty or invalid data.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasInfo = result && (result.doctorName || result.patientName || result.date || result.diagnosis);

  return (
    <div className="container" style={{ paddingBottom: '48px' }}>
      {/* Hero */}
      <section className="hero-section animate-fade-in">
        <h1 className="hero-title">
          Prescription <span className="text-gradient">Reader (OCR)</span>
        </h1>
        <p className="hero-subtitle">
          Upload an image of your doctor's prescription to automatically extract medications, dosage schedules, and professional advice.
        </p>
      </section>

      {/* Upload or Results View */}
      {!result ? (
        <div className="card-static mb-lg animate-slide-up" style={{ padding: '24px' }}>
          {!imagePreview ? (
            <div
              className={`upload-zone ${dragActive ? 'dragover' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{ minHeight: '260px' }}
            >
              <svg className="upload-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '48px', height: '48px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p className="upload-zone-text" style={{ marginTop: '16px' }}>Upload your prescription image</p>
              <p className="upload-zone-hint">Drag & drop or click to browse · Supports handwritten & printed Rx</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="image-preview-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <img src={imagePreview} alt="Prescription preview" className="image-preview" />
              {!loading && (
                <button className="image-preview-remove" onClick={removeImage} title="Remove prescription image">
                  ✕
                </button>
              )}
              {loading && (
                <div className="scanner-overlay">
                  <div className="scanner-line" />
                  <span className="scanner-text">Scanning Prescription...</span>
                </div>
              )}
            </div>
          )}

          {/* Action button */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              className="btn btn-primary btn-lg"
              disabled={!imageFile || loading}
              onClick={handleSubmit}
              style={{ width: '100%', maxWidth: '300px' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  Analyzing Prescription...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  Read Prescription
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="animate-fade-in">
          {/* Confidence Meter */}
          <div className="card-static mb-md" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: '500' }}>Extraction Confidence</span>
              <span className="font-mono" style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{result.confidence || 90}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${result.confidence || 90}%`,
                  height: '100%',
                  background: 'var(--gradient-primary)',
                  borderRadius: '3px',
                  boxShadow: 'var(--shadow-glow)',
                }}
              />
            </div>
          </div>

          <div className="prescription-results">
            {/* Image side */}
            <div className="prescription-image-side card-static" style={{ padding: '12px' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>Prescription Source</h4>
              <img src={imagePreview} alt="Analyzed prescription" />
            </div>

            {/* Extracted contents side */}
            <div>
              {/* Metadata Details Card */}
              {hasInfo && (
                <div className="prescription-info-grid animate-slide-up">
                  {result.patientName && (
                    <div className="prescription-info-item">
                      <div className="prescription-info-label">Patient Name</div>
                      <div className="prescription-info-value">{result.patientName}</div>
                    </div>
                  )}
                  {result.doctorName && (
                    <div className="prescription-info-item">
                      <div className="prescription-info-label">Doctor / Clinic</div>
                      <div className="prescription-info-value">{result.doctorName}</div>
                    </div>
                  )}
                  {result.date && (
                    <div className="prescription-info-item">
                      <div className="prescription-info-label">Date</div>
                      <div className="prescription-info-value">{result.date}</div>
                    </div>
                  )}
                  {result.diagnosis && (
                    <div className="prescription-info-item">
                      <div className="prescription-info-label">Diagnosis</div>
                      <div className="prescription-info-value">{result.diagnosis}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Medicines List */}
              <h3 className="section-title animate-fade-in" style={{ fontSize: '1.1rem', marginBottom: '12px', marginTop: '8px' }}>Extracted Medicines</h3>
              
              {result.medicines && result.medicines.length > 0 ? (
                <div className="animate-slide-up">
                  {result.medicines.map((med, idx) => (
                    <div key={idx} className="medicine-extract-card">
                      <h4 className="medicine-extract-name">{med.name}</h4>
                      <div className="medicine-extract-grid">
                        <div className="medicine-extract-field">
                          <div className="medicine-extract-field-label">Dosage</div>
                          <div className="medicine-extract-field-value">{med.dosage || 'Not specified'}</div>
                        </div>
                        <div className="medicine-extract-field">
                          <div className="medicine-extract-field-label">Frequency</div>
                          <div className="medicine-extract-field-value">{med.frequency || 'Not specified'}</div>
                        </div>
                        <div className="medicine-extract-field">
                          <div className="medicine-extract-field-label">Duration</div>
                          <div className="medicine-extract-field-value">{med.duration || 'Not specified'}</div>
                        </div>
                        <div className="medicine-extract-field">
                          <div className="medicine-extract-field-label">Instructions</div>
                          <div className="medicine-extract-field-value">{med.instructions || 'None'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-static mb-lg text-center" style={{ padding: '24px', color: 'var(--text-secondary)' }}>
                  No medications could be extracted from this prescription image.
                </div>
              )}

              {/* Additional notes */}
              {result.additionalNotes && (
                <div className="card-static mb-md animate-fade-in" style={{ padding: '16px 20px', marginTop: '16px' }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>Additional Doctor Notes</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                    {result.additionalNotes}
                  </p>
                </div>
              )}

              {/* Summary */}
              {result.summary && (
                <div className="card-static mb-lg animate-fade-in" style={{ padding: '16px 20px', marginTop: '12px' }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>Prescription Summary</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {result.summary}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reset */}
          <div className="text-center" style={{ marginTop: '32px' }}>
            <button className="btn btn-secondary btn-lg" onClick={handleReset}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Scan Another Prescription
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="error-banner mb-lg animate-fade-in" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', marginTop: '20px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ marginLeft: '10px' }}>{error}</span>
        </div>
      )}
    </div>
  );
}

export default PrescriptionReader;
