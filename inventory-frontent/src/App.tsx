import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TOAST_CONFIG } from './utils/constants';
import AppRoutes from './routes/AppRoutes';

// Create a query client with rate limit handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on rate limit errors
        if (error?.response?.status === 429) {
          return false;
        }
        // Don't retry on auth errors
        if (error?.response?.status === 401) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on rate limit or auth errors
        if (error?.response?.status === 429 || error?.response?.status === 401) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Max 10s for mutations
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      
      {/* Toast notifications */}
      <Toaster
        position={TOAST_CONFIG.POSITION}
        toastOptions={{
          duration: TOAST_CONFIG.DURATION.SUCCESS,
          className: 'text-sm font-medium',
          success: {
            duration: TOAST_CONFIG.DURATION.SUCCESS,
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            duration: TOAST_CONFIG.DURATION.ERROR,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;