import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    try {
      const data = await api.sessions.list();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  }, []);

  // Select a session
  const selectSession = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      const data = await api.sessions.get(sessionId);
      setActiveSession(data.session);

      // Load conversations
      const conversations = data.conversations || [];
      if (conversations.length > 0) {
        setActiveConversation(conversations[0]);
        // Load messages for first conversation
        const historyData = await api.chat.history(sessionId, conversations[0].id);
        setMessages(historyData.messages || []);
      } else {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a session
  const deleteSession = useCallback(async (sessionId) => {
    try {
      await api.sessions.delete(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [activeSession]);

  // Send a message
  const sendMessage = useCallback(async (question) => {
    if (!activeSession) return;

    // Add user message optimistically
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const data = await api.chat.ask(
        activeSession.id,
        question,
        activeConversation?.id
      );

      // Add assistant response
      const assistantMsg = {
        id: data.messageId,
        role: 'assistant',
        content: data.answer,
        response_type: data.responseType,
        response_data: data.responseData,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Update conversation ID if new
      if (data.conversationId && !activeConversation) {
        setActiveConversation({ id: data.conversationId });
      }

      return data;
    } catch (err) {
      // Add error as assistant message
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ ${err.message}`,
        response_type: 'text',
        created_at: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
      throw err;
    }
  }, [activeSession, activeConversation]);

  // Handle file upload
  const uploadFile = useCallback(async (file) => {
    setLoading(true);
    try {
      const data = await api.upload.file(file);
      await fetchSessions();
      await selectSession(data.session.id);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchSessions, selectSession]);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  const value = {
    sessions,
    activeSession,
    activeConversation,
    messages,
    loading,
    error,
    fetchSessions,
    selectSession,
    deleteSession,
    sendMessage,
    uploadFile,
    clearError,
    setActiveSession,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
