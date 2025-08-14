import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, WifiOff, RefreshCw } from 'lucide-react';
import './ErrorNotification.css';

interface ErrorNotificationProps {
  error: string | null;
  onClose?: () => void;
  onRetry?: () => void;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({ 
  error, 
  onClose,
  onRetry 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      // 自动隐藏非关键错误
      if (!error.includes('登录') && !error.includes('网络')) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          onClose?.();
        }, 5000);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [error, onClose]);

  const getErrorIcon = () => {
    if (error?.includes('网络')) {
      return <WifiOff className="error-icon" />;
    }
    return <AlertCircle className="error-icon" />;
  };

  const getErrorType = () => {
    if (error?.includes('网络')) return 'network';
    if (error?.includes('登录') || error?.includes('认证')) return 'auth';
    if (error?.includes('权限')) return 'permission';
    return 'general';
  };

  return (
    <AnimatePresence>
      {isVisible && error && (
        <motion.div
          className={`error-notification error-${getErrorType()}`}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
        >
          <div className="error-content">
            {getErrorIcon()}
            <div className="error-message">
              <p className="error-title">
                {error.includes('网络') ? '网络连接问题' :
                 error.includes('登录') ? '认证失败' :
                 error.includes('权限') ? '权限不足' : '操作失败'}
              </p>
              <p className="error-description">{error}</p>
            </div>
          </div>
          
          <div className="error-actions">
            {onRetry && (
              <button 
                className="error-action-btn retry-btn"
                onClick={onRetry}
                title="重试"
              >
                <RefreshCw size={16} />
              </button>
            )}
            {onClose && (
              <button 
                className="error-action-btn close-btn"
                onClick={() => {
                  setIsVisible(false);
                  onClose();
                }}
                title="关闭"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};