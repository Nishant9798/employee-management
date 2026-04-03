import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Request interceptor — adds auth token (must be registered BEFORE response interceptor)
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — retry logic for failed requests (network errors & 5xx, max 2 retries)
api.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config;
    if (!config) return Promise.reject(err);

    config._retryCount = config._retryCount || 0;
    const isRetryable =
      config._retryCount < 2 &&
      config.method === 'get' &&
      (!err.response || err.response.status >= 500);

    if (isRetryable) {
      config._retryCount++;
      await new Promise(r => setTimeout(r, 1000 * config._retryCount));
      return api(config);
    }

    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
