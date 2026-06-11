import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import './Sidebar.css';

export default function Sidebar({ onUploadClick }) {
  const { user, logout } = useAuth();
  const { sessions, activeSession, fetchSessions, selectSession, deleteSession } = useApp();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm('Delete this session and all its data?')) {
      await deleteSession(sessionId);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">💬</span>
          <span className="sidebar-brand-text">Chat Analyzer</span>
        </div>
        <div className="sidebar-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={onUploadClick}
            id="new-chat-btn"
          >
            ＋ New Chat
          </button>
        </div>
      </div>

      <div className="sidebar-section-title">Sessions</div>

      <div className="sidebar-sessions">
        {sessions.length === 0 ? (
          <div className="sidebar-empty">
            No sessions yet.<br />Upload a chat to get started.
          </div>
        ) : (
          sessions.map((session, index) => (
            <div
              key={session.id}
              className={`session-item ${activeSession?.id === session.id ? 'active' : ''}`}
              onClick={() => selectSession(session.id)}
              id={`session-${index}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className="session-icon">
                {session.chat_type === 'group' ? '👥' : '💬'}
              </span>
              <div className="session-info">
                <div className="session-name">{session.file_name}</div>
                <div className="session-meta">
                  <span>{session.total_messages} msgs</span>
                  <span>•</span>
                  <span>{formatDate(session.created_at)}</span>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon session-delete"
                onClick={(e) => handleDelete(e, session.id)}
                title="Delete session"
                id={`delete-session-${index}`}
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">
          {user?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="sidebar-user">
          <div className="sidebar-username">{user?.username}</div>
          <div className="sidebar-email">{user?.email}</div>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={logout}
          title="Sign out"
          id="logout-btn"
        >
          🚪
        </button>
      </div>
    </aside>
  );
}
