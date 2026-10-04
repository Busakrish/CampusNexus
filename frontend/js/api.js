/**
 * CampusNexus Centralized REST API Utility
 */
const API_BASE_URL = window.location.origin + '/api';

const api = {
  getToken() {
    return localStorage.getItem('campusnexus_token') || '';
  },

  setToken(token) {
    if (token) localStorage.setItem('campusnexus_token', token);
    else localStorage.removeItem('campusnexus_token');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('campusnexus_user') || 'null');
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) localStorage.setItem('campusnexus_user', JSON.stringify(user));
    else localStorage.removeItem('campusnexus_user');
  },

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle 401 unauthenticated
        if (response.status === 401) {
          console.warn('[API 401] Unauthorized access - redirecting to login');
          this.setToken(null);
          this.setUser(null);
          if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
            window.location.href = '/login.html?expired=1';
          }
        }

        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.code = data.code || 'API_ERROR';
        error.details = data.details || {};
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        const netErr = new Error('Network error. Please check if the server is running.');
        netErr.code = 'NETWORK_ERROR';
        throw netErr;
      }
      throw err;
    }
  },

  get(endpoint, queryParams = {}) {
    const queryString = new URLSearchParams(queryParams).toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(fullEndpoint, { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return this.request(endpoint, { method: 'POST', body });
  },

  put(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PUT', body });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

window.api = api;
