import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import api from '../../api/client';
import './ChatWindow.css';

const SUGGESTIONS = [
  'Who sent the most messages?',
  'What are the most used words?',
  'Show me the activity timeline',
  'How many photos were shared?',
  'What is the overall mood?',
  'Summarize this chat',
];

export default function ChatWindow() {
  const { activeSession, messages, sendMessage, loading } = useApp();
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(text.trim());
    } catch (err) {
      // Error already handled in context
    } finally {
      setSending(false);
    }
  };

  const handleExport = async (format) => {
    try {
      await api.export.download(activeSession.id, format);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // No active session — show welcome
  if (!activeSession) {
    return (
      <div className="chat-window">
        <div className="chat-welcome">
          <div className="chat-welcome-icon">🔍</div>
          <h2 className="chat-welcome-title">WhatsApp Chat Analyzer</h2>
          <p className="chat-welcome-text">
            Upload a WhatsApp chat export to start analyzing. Ask questions, get statistics,
            and discover insights about your conversations.
          </p>
        </div>
      </div>
    );
  }

  const formatDateRange = () => {
    if (!activeSession.date_range_start) return '';
    const start = new Date(activeSession.date_range_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const end = new Date(activeSession.date_range_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} — ${end}`;
  };

  return (
    <div className="chat-window" id="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-header-title">
            {activeSession.file_name}
          </div>
          <div className="chat-header-meta">
            <span>{activeSession.total_messages} messages</span>
            <span>•</span>
            <span>{activeSession.total_participants} participants</span>
            {activeSession.date_range_start && (
              <>
                <span>•</span>
                <span>{formatDateRange()}</span>
              </>
            )}
          </div>
        </div>
        <div className="chat-header-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleExport('csv')}
            id="export-csv-btn"
          >
            📊 CSV
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleExport('pdf')}
            id="export-pdf-btn"
          >
            📄 Report
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" id="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">💡</div>
            <h2 className="chat-welcome-title">Ready to Analyze</h2>
            <p className="chat-welcome-text">
              Ask anything about your chat! Try one of these:
            </p>
            <div className="chat-welcome-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="suggestion-chip"
                  onClick={() => handleSend(s)}
                  id={`suggestion-${i}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <MessageBubble key={msg.id || index} message={msg} />
            ))}
            {sending && (
              <div className="message message-assistant">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={sending || loading} />
    </div>
  );
}
