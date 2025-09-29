import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { useRateLimit } from '@/hooks/useRateLimit';
import Button from './Button';

const RateLimitBanner: React.FC = () => {
  const { isRateLimited, rateLimitInfo, formattedTimeRemaining, clearRateLimit } = useRateLimit();

  if (!isRateLimited || !rateLimitInfo) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-yellow-800">
                  {rateLimitInfo.message}
                </p>
                {formattedTimeRemaining && (
                  <div className="flex items-center space-x-1 text-yellow-700">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Retry in {formattedTimeRemaining}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearRateLimit}
                className="text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RateLimitBanner;
