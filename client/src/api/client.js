/**
 * API Client
 * 
 * Fetch wrapper with automatic JWT token attachment,
 * error handling, and base URL configuration.
 */

const API_BASE = '/api';

/**
 * Get the stored JWT token
 */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * Set the JWT token
 */
export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

/**
 * Make an API request
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    ...options.headers,
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 — token expired or invalid
  if (response.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.code;
    throw error;
  }

  return data;
}

/**
 * API Methods
 */
const api = {
  // ── Auth ──
  auth: {
    register: (username, email, password) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      }),
    login: (email, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request('/auth/me'),
  },

  // ── Upload ──
  upload: {
    file: (file) => {
      const formData = new FormData();
      formData.append('chatFile', file);
      return request('/upload', {
        method: 'POST',
        body: formData,
      });
    },
  },

  // ── Sessions ──
  sessions: {
    list: () => request('/sessions'),
    get: (id) => request(`/sessions/${id}`),
    delete: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
  },

  // ── Chat ──
  chat: {
    ask: (sessionId, question, conversationId) =>
      request(`/chat/${sessionId}/ask`, {
        method: 'POST',
        body: JSON.stringify({ question, conversationId }),
      }),
    history: (sessionId, conversationId) => {
      const params = conversationId ? `?conversationId=${conversationId}` : '';
      return request(`/chat/${sessionId}/history${params}`);
    },
  },

  // ── Analytics ──
  analytics: {
    get: (sessionId, type, params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/analytics/${sessionId}/analytics/${type}${query ? `?${query}` : ''}`);
    },
  },

  // ── Export ──
  export: {
    download: async (sessionId, format) => {
      const token = getToken();
      const response = await fetch(`${API_BASE}/export/${sessionId}/export/${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis.${format === 'pdf' ? 'txt' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
  },

  // ── Health ──
  health: () => request('/health'),
};

export default api;
