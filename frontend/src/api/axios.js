import axios from 'axios';

// Resolves and normalizes the API base URL to ensure '/api' suffix is always present
const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api')) {
      clean += '/api';
    }
    return clean;
  }
  return import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://wqg-church-platform.onrender.com/api';
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to normalize url and attach JWT token
api.interceptors.request.use(
  (config) => {
    // Safeguard: Strip leading '/api/' or 'api/' so baseURL + url never produces /api/api/...
    if (config.url) {
      if (config.url.startsWith('/api/')) {
        config.url = config.url.replace(/^\/api\//, '/');
      } else if (config.url === '/api') {
        config.url = '/';
      } else if (config.url.startsWith('api/')) {
        config.url = config.url.replace(/^api\//, '/');
      }
    }

    const token = localStorage.getItem('wqg_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, token is either expired or invalid
      // We do not clear immediately if the request was a failed login attempt
      if (!error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/register')) {
        localStorage.removeItem('wqg_token');
        localStorage.removeItem('wqg_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
