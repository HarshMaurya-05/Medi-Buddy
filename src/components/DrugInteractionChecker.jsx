import React, { useState } from 'react';

function DrugInteractionChecker() {
  const [medicines, setMedicines] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAddMedicine = (e) => {
    e.preventDefault();
    const name = currentInput.trim();
    if (!name) return;

    if (medicines.some(m => m.toLowerCase() === name.toLowerCase())) {
      setError(`"${name}" is already in the list.`);
      return;
    }

    setMedicines([...medicines, name]);
    setCurrentInput('');
    setError(null);
  };

  const handleRemoveMedicine = (indexToRemove) => {
    setMedicines(medicines.filter((_, idx) => idx !== indexToRemove));
    setError(null);
  };

  const handleCheckInteractions = async () => {
    if (medicines.length < 2) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicines }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed to check interactions (${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
      } else {
        throw new Error(data.error || 'No interaction data returned.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMedicines([]);
    setCurrentInput('');
    setResult(null);
    setError(null);
  };

  const getRiskConfig = (level) => {
    switch (level?.toUpperCase()) {
      case 'HIGH':
        return { cls: 'severity-HIGH', label: 'High Risk', desc: 'Serious interactions detected. Medical consultation is strongly advised before taking these together.' };
      case 'MODERATE':
        return { cls: 'severity-MODERATE', label: 'Moderate Risk', desc: 'Moderate interactions detected. Consult a healthcare professional or pharmacist.' };
      case 'LOW':
        return { cls: 'severity-LOW', label: 'Low Risk', desc: 'Minor interactions detected. Monitor for symptoms, but generally considered manageable.' };
      default:
        return { cls: 'severity-NONE', label: 'No Interaction / None', desc: 'No significant interactions detected between these drugs.' };
    }
  };

  const riskConfig = result ? getRiskConfig(result.riskLevel) : null;

  return (
    <div className="container" style={{ paddingBottom: '48px' }}>
      {/* Hero */}
      <section className="hero-section animate-fade-in">
        <h1 className="hero-title">
          Drug <span className="text-gradient">Interaction Checker</span>
        </h1>
        <p className="hero-subtitle">
          Add two or more medications to analyze potential drug-drug interactions, severity levels, and safety guidelines.
        </p>
      </section>

      {/* Main interface */}
      <div className="card-static mb-lg animate-slide-up" style={{ padding: '24px' }}>
        <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Medication List</h2>
        
        <form onSubmit={handleAddMedicine} className="medicine-input-area">
          <input
            type="text"
            className="input"
            placeholder="Type medicine name (e.g. Aspirin, Ibuprofen, Paracetamol)..."
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-secondary" disabled={loading || !currentInput.trim()}>
            Add
          </button>
        </form>

        {medicines.length > 0 ? (
          <>
            <div className="medicine-chips">
              {medicines.map((med, idx) => (
                <div key={idx} className="medicine-chip">
                  <span>{med}</span>
                  <button
                    type="button"
                    className="medicine-chip-remove"
                    onClick={() => handleRemoveMedicine(idx)}
                    disabled={loading}
                    title={`Remove ${med}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                {medicines.length} {medicines.length === 1 ? 'medicine' : 'medicines'} added
              </span>
              {medicines.length > 0 && !loading && (
                <button
                  type="button"
                  className="filter-btn"
                  onClick={handleReset}
                  style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                >
                  Clear All
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-muted" style={{ padding: '24px 0', fontSize: '0.9rem' }}>
            No medicines added yet. Type a medicine name above and click Add.
          </div>
        )}

        {/* Action Button */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={medicines.length < 2 || loading}
            onClick={handleCheckInteractions}
            style={{ width: '100%', maxWidth: '300px' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Checking Interactions...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
                Check Interactions
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner mb-lg animate-fade-in" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ marginLeft: '10px' }}>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="animate-slide-up">
          {/* Risk Level Banner */}
          <div className={`status-banner ${riskConfig.cls} mb-lg`} style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="severity-badge" style={{ fontSize: '0.9rem', padding: '4px 12px' }}>
                {result.riskLevel}
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Overall Risk Assessment</h3>
            </div>
            <p style={{ fontSize: '0.95rem', opacity: 0.9, lineHeight: 1.5 }}>
              {riskConfig.desc}
            </p>
          </div>

          {/* Interactions List */}
          {result.interactions && result.interactions.length > 0 ? (
            <div>
              <h3 className="section-title" style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Detected Interactions</h3>
              {result.interactions.map((inter, idx) => (
                <div key={idx} className="interaction-card">
                  <div className="interaction-header">
                    <span className="interaction-pair">
                      {inter.drug1} <span className="arrow">↔</span> {inter.drug2}
                    </span>
                    <span className={`severity-badge severity-${inter.severity?.toUpperCase()}`}>
                      {inter.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '8px', fontWeight: '500' }}>
                    Type: {inter.type || 'Pharmacological Interaction'}
                  </div>
                  <p className="interaction-desc">
                    {inter.description}
                  </p>
                  <div className="interaction-recommendation">
                    <strong>Guideline / Recommendation:</strong> {inter.recommendation}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-static mb-lg text-center" style={{ padding: '32px 24px' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>🛡️</span>
              <h4 style={{ color: 'var(--accent-emerald)', fontWeight: '600', marginBottom: '8px' }}>No Interactions Found</h4>
              <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
                The AI did not find any known dangerous interactions between the specified medications.
              </p>
            </div>
          )}

          {/* Safe Combinations */}
          {result.safeCombinatons && result.safeCombinatons.length > 0 && (
            <div className="safe-combinations mb-lg">
              <div className="safe-combinations-title">Verified Safe Combinations / Notes</div>
              <ul style={{ paddingLeft: '20px', listStyleType: 'disc', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {result.safeCombinatons.map((combo, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{combo}</li>
                ))}
              </ul>
            </div>
          )}

          {/* General Advice */}
          {result.generalAdvice && (
            <div className="card-static mb-lg" style={{ padding: '20px 24px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '10px', fontSize: '1rem' }}>AI Safety Advice</h4>
              <p className="text-secondary" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                {result.generalAdvice}
              </p>
            </div>
          )}

          {/* Reset */}
          <div className="text-center" style={{ marginTop: '32px' }}>
            <button className="btn btn-secondary btn-lg" onClick={handleReset}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Check Another Combination
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DrugInteractionChecker;
