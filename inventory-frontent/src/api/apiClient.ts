import axios, { AxiosError, AxiosResponse } from 'axios';
import { ApiError } from '@/types/api';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('inventory_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiError>) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('inventory_token');
      localStorage.removeItem('inventory_user');
      
      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth/login';
      }
    }
    
    // Handle 429 Rate Limit
    if (error.response?.status === 429) {
      const retryAfter = (error.response?.data as any)?.retryAfter;
      const retryAfterSeconds = retryAfter ? Math.ceil((retryAfter - Date.now()) / 1000) : 60;
      
      // Show rate limit error to user
      const message = error.response?.data?.message || `Too many requests. Please try again in ${retryAfterSeconds} seconds.`;
      
      // Import toast dynamically to avoid circular dependencies
      import('react-hot-toast').then(({ toast }) => {
        toast.error(message, {
          duration: 5000,
          id: 'rate-limit-error', // Prevent duplicate toasts
        });
      });
      
      // Store rate limit info for components to use
      localStorage.setItem('inventory_rate_limit', JSON.stringify({
        timestamp: Date.now(),
        retryAfter: retryAfterSeconds,
        message
      }));
      
      return Promise.reject({
        ...error,
        response: {
          ...error.response,
          data: {
            ...error.response?.data,
            error: 'RateLimitError',
            message,
            retryAfter: retryAfterSeconds,
          },
        },
      });
    }
    
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        ...error,
        response: {
          data: {
            error: 'NetworkError',
            message: 'Unable to connect to server. Please check your internet connection.',
            timestamp: new Date().toISOString(),
            path: error.config?.url || '',
            method: error.config?.method?.toUpperCase() || 'UNKNOWN',
          },
        },
      });
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;