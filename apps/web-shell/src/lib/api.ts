import axios from 'axios';

const toSentenceCase = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const toFriendlyFieldLabel = (rawField: string) => {
  const parts = String(rawField || '')
    .replace(/^.*\./, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .trim();
  return toSentenceCase(parts || 'field');
};

const mapApiErrorMessage = (error: any) => {
  if (!error?.response) {
    return 'Unable to connect. Please check your internet connection';
  }

  const status = Number(error.response?.status || 0);
  const originalMessage = String(
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    ''
  );
  const message = originalMessage.toLowerCase();

  if (message.includes('courseid') && message.includes('required')) {
    return 'Please select a subject before saving marks';
  }

  const pathMatch = originalMessage.match(/Path [`"]?([\w.]+)[`"]? (is required|is invalid)/i);
  if (pathMatch?.[1]) {
    return `Please fill in the ${toFriendlyFieldLabel(pathMatch[1])} correctly`;
  }

  const castMatch = originalMessage.match(/Cast to .* failed for value .* at path [`"]?([\w.]+)[`"]?/i);
  if (castMatch?.[1]) {
    return `Please fill in the ${toFriendlyFieldLabel(castMatch[1])} correctly`;
  }

  const duplicateMatch = originalMessage.match(/index:\s*([\w.]+)_\d+\s+dup key/i);
  if (duplicateMatch?.[1]) {
    return `${toFriendlyFieldLabel(duplicateMatch[1])} already exists. Please enter a different value`;
  }

  if (status === 400) {
    return 'Something went wrong. Please check your inputs and try again';
  }
  if (status >= 500) {
    return 'Server error. Please try again in a moment';
  }

  return originalMessage || 'Something went wrong. Please try again';
};

const resolveApiBaseUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:5005/api`;
  }

  return 'http://localhost:5005/api';
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        delete (config.headers as any)['Content-Type'];
        delete (config.headers as any)['content-type'];
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const friendlyMessage = mapApiErrorMessage(error);
    error.friendlyMessage = friendlyMessage;
    if (error.response?.data) {
      error.response.data.message = friendlyMessage;
      error.response.data.error = friendlyMessage;
    }

    if (error.response?.status === 401) {
      // Handle unauthorized (redirect to login if needed)
      if (typeof window !== 'undefined') {
        const isLoginRoute = window.location.pathname.startsWith('/login');
        if (!isLoginRoute) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
