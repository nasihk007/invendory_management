import { useState, useEffect, useCallback } from 'react';

interface RateLimitInfo {
  timestamp: number;
  retryAfter: number;
  message: string;
}

export const useRateLimit = () => {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Check for rate limit info in localStorage
  useEffect(() => {
    const checkRateLimit = () => {
      try {
        const stored = localStorage.getItem('inventory_rate_limit');
        if (stored) {
          const info: RateLimitInfo = JSON.parse(stored);
          const now = Date.now();
          const timePassed = (now - info.timestamp) / 1000;
          
          if (timePassed < info.retryAfter) {
            setRateLimitInfo(info);
            setIsRateLimited(true);
          } else {
            // Rate limit has expired
            localStorage.removeItem('inventory_rate_limit');
            setRateLimitInfo(null);
            setIsRateLimited(false);
          }
        }
      } catch (error) {
        console.error('Error parsing rate limit info:', error);
        localStorage.removeItem('inventory_rate_limit');
      }
    };

    checkRateLimit();
    
    // Check every 10 seconds
    const interval = setInterval(checkRateLimit, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for storage changes (from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'inventory_rate_limit') {
        if (e.newValue) {
          try {
            const info: RateLimitInfo = JSON.parse(e.newValue);
            setRateLimitInfo(info);
            setIsRateLimited(true);
          } catch (error) {
            console.error('Error parsing rate limit info:', error);
          }
        } else {
          setRateLimitInfo(null);
          setIsRateLimited(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const clearRateLimit = useCallback(() => {
    localStorage.removeItem('inventory_rate_limit');
    setRateLimitInfo(null);
    setIsRateLimited(false);
  }, []);

  const getTimeRemaining = useCallback(() => {
    if (!rateLimitInfo) return 0;
    
    const now = Date.now();
    const timePassed = (now - rateLimitInfo.timestamp) / 1000;
    const remaining = Math.max(0, rateLimitInfo.retryAfter - timePassed);
    
    return Math.ceil(remaining);
  }, [rateLimitInfo]);

  const formatTimeRemaining = useCallback(() => {
    const seconds = getTimeRemaining();
    if (seconds <= 0) return '';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }, [getTimeRemaining]);

  return {
    isRateLimited,
    rateLimitInfo,
    timeRemaining: getTimeRemaining(),
    formattedTimeRemaining: formatTimeRemaining(),
    clearRateLimit,
  };
};
