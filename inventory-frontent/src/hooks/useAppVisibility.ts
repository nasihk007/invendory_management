import { useState, useEffect } from 'react';

export const useAppVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for online/offline status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isVisible,
    isOnline,
    isAppActive: isVisible && isOnline,
  };
};
