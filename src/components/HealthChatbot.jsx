import React, { useState, useRef, useEffect } from 'react';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: `Welcome to MedVerify Health Assistant. I'm here to help you with questions about medicines, symptoms, and general health information. How can I assist you today?

You can ask me about:
• Medicine information and side effects
• Symptom guidance
• Drug interactions
• Dosage and storage guidelines

⚕ Please note: I provide general health information only. Always consult a healthcare professional for medical advice.`,
  timestamp: new Date(),
};

const QUICK_QUESTIONS = [
  'What are common cold symptoms?',
  'Side effects of Paracetamol',
  'When should I see a doctor?',
  'How to store medicines properly?',
  'What is drug interaction?',
  'Difference between generic and branded medicines',
];

/* ── Markdown-like formatter ────────────── */
function formatMessage(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Empty line → spacer
    if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: 8 }} />);
      continue;
    }

    // Bullet point (- or * or •)
    if (/^[\s]*[-*•]\s+/.test(line)) {
      const content = line.replace(/^[\s]*[-*•]\s+/, '');
      elements.push(
        <div key={key++} style={{ paddingLeft: 16, position: 'relative', marginBottom: 2 }}>
          <span style={{ position: 'absolute', left: 0, color: 'var(--accent-cyan)' }}>›</span>
          {formatInline(content)}
        </div>
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const match = line.match(/^\s*(\d+)[.)]\s+(.*)/);
      if (match) {
        elements.push(
          <div key={key++} style={{ paddingLeft: 20, position: 'relative', marginBottom: 2 }}>
            <span style={{ position: 'absolute', left: 0, color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '0.82rem' }}>{match[1]}.</span>
            {formatInline(match[2])}
          </div>
        );
        continue;
      }
    }

    // Normal line
    elements.push(<div key={key++}>{formatInline(line)}</div>);
  }

  return elements;
}

function formatInline(text) {
  // Bold **text**
  const parts = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={match.index}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function HealthChatbot() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* ── Auto-scroll ──────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* ── Send message ─────────────────────── */
  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setSidebarOpen(false);

    try {
      // Build payload: send conversation history (exclude welcome system message)
      const history = [...messages.filter((m) => m.id !== 'welcome'), userMsg].map(({ role, content }) => ({
        role,
        content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }

      const data = await res.json();

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || data.content || data.message || 'I apologize, but I could not generate a response.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `⚠ Sorry, I encountered an error: ${err.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      {/* Sidebar toggle (mobile) */}
      <button
        className="chat-sidebar-toggle"
        onClick={() => setSidebarOpen((p) => !p)}
        aria-label="Toggle sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="chat-sidebar-title">Quick Questions</div>
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} className="chat-chip" onClick={() => sendMessage(q)}>
            {q}
          </button>
        ))}

        <div className="chat-disclaimer">
          <strong>Medical Disclaimer</strong>
          <br />
          This assistant provides general health information only and should not be considered as professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare provider.
        </div>
      </aside>

      {/* Main chat */}
      <div className="chat-main">
        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble-wrapper ${msg.role}`}>
              <div className={`chat-bubble ${msg.role}`}>
                {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
              </div>
              <span className="chat-bubble-time">{formatTime(msg.timestamp)}</span>
            </div>
          ))}

          {loading && (
            <div className="chat-bubble-wrapper assistant">
              <div className="typing-indicator">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <input
            ref={inputRef}
            className="input"
            type="text"
            placeholder="Ask a health question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="chat-send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            aria-label="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default HealthChatbot;
