const API_BASE = '/api/v1';

let onUnauthorizedCallback = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorizedCallback = handler;
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('prosurance_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      localStorage.removeItem('prosurance_token');
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      } else {
        window.location.href = '/login';
      }
      throw new Error('Session expired or unauthorized. Please log in again.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Unable to connect to server. Please check your connection.');
    }
    throw err;
  }
}

export async function downloadCsv(endpoint, filename, params = {}) {
  const token = localStorage.getItem('prosurance_token');
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  const url = `${API_BASE}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Export failed (HTTP ${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export const api = {
  get: (endpoint, params = {}) => {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
    return request(fullEndpoint, { method: 'GET' });
  },
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export default api;
