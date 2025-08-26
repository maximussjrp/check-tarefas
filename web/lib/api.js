import axios from 'axios';

// Detecta automaticamente a URL base
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // No browser, usa a URL atual
    return window.location.origin;
  }
  // No servidor, usa a variável de ambiente ou localhost
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6789';
};

const API_URL = getBaseURL();

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('empresa');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
