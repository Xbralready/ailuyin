import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import axios from 'axios';

interface User {
  _id: string;
  email: string;
  nickname: string;
  avatar?: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  clearError: () => void;
  retryConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 存储键名
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  API_VERSION: 'apiVersion',
  LAST_LOGIN: 'lastLogin',
};

// API版本管理
const API_VERSION = '2.0'; // 更新此版本号会强制用户重新登录

// 检查并清理过期的认证数据
const checkAndCleanAuth = () => {
  const storedVersion = localStorage.getItem(STORAGE_KEYS.API_VERSION);
  const lastLogin = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN);
  
  // 如果API版本不匹配，清除所有认证数据
  if (storedVersion !== API_VERSION) {
    console.log('API版本已更新，清除旧的认证数据');
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.LAST_LOGIN);
    localStorage.setItem(STORAGE_KEYS.API_VERSION, API_VERSION);
    return false;
  }
  
  // 检查登录是否超过7天
  if (lastLogin) {
    const loginTime = new Date(lastLogin).getTime();
    const now = new Date().getTime();
    const daysSinceLogin = (now - loginTime) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLogin > 7) {
      console.log('登录已超过7天，需要重新登录');
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      return false;
    }
  }
  
  return true;
};

// 设置axios拦截器
const setupAxiosInterceptors = (
  refreshToken: () => Promise<string>,
  onAuthError: (error: string) => void
) => {
  // 请求拦截器
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  let isRefreshing = false;
  let failedQueue: any[] = [];

  const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    failedQueue = [];
  };

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // 处理网络错误
      if (!error.response) {
        onAuthError('网络连接失败，请检查您的网络连接');
        return Promise.reject(error);
      }

      // 处理401错误
      if (error.response?.status === 401 && !originalRequest._retry) {
        // 如果是登录或注册请求，直接返回错误
        if (originalRequest.url?.includes('/auth/login') || 
            originalRequest.url?.includes('/auth/register')) {
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }).catch((err) => {
            return Promise.reject(err);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newToken = await refreshToken();
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          
          // 刷新失败，清除所有认证数据
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.LAST_LOGIN);
          
          // 显示友好的错误提示
          onAuthError('登录已过期，请重新登录');
          
          // 延迟跳转，让用户看到提示
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // 处理其他错误
      if (error.response?.status === 403) {
        onAuthError('您没有权限访问此资源');
      } else if (error.response?.status === 500) {
        onAuthError('服务器错误，请稍后重试');
      } else if (error.response?.status === 503) {
        onAuthError('服务暂时不可用，请稍后重试');
      }

      return Promise.reject(error);
    }
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const onAuthError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    // 5秒后自动清除错误
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (newRefreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
      }
      
      return accessToken;
    } catch (error) {
      console.error('Token刷新失败:', error);
      throw error;
    }
  }, []);

  // 获取当前用户信息
  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setError(null);
    } catch (error) {
      console.error('获取用户信息失败:', error);
      
      // 如果是401错误，不显示错误（会由拦截器处理）
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        onAuthError('获取用户信息失败，请重新登录');
      }
      
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
  }, [onAuthError]);

  // 重试连接
  const retryConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await fetchCurrentUser();
    } catch (error) {
      console.error('重试连接失败:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentUser]);

  useEffect(() => {
    // 设置axios拦截器
    setupAxiosInterceptors(refreshToken, onAuthError);

    // 检查并清理过期的认证数据
    const isAuthValid = checkAndCleanAuth();

    // 检查是否有token并获取用户信息
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token && isAuthValid) {
      fetchCurrentUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchCurrentUser, refreshToken, onAuthError]);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data;
      
      // 保存认证信息
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
      localStorage.setItem(STORAGE_KEYS.API_VERSION, API_VERSION);
      
      setUser(user);
      setError(null);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || '登录失败，请检查用户名和密码';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
      throw error;
    }
  };

  const register = async (email: string, password: string, nickname?: string) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', { email, password, nickname });
      const { user, accessToken, refreshToken } = response.data;
      
      // 保存认证信息
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
      localStorage.setItem(STORAGE_KEYS.API_VERSION, API_VERSION);
      
      setUser(user);
      setError(null);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || '注册失败，请稍后重试';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      // 清除所有认证数据
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.LAST_LOGIN);
      setUser(null);
      setError(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error,
      login, 
      register, 
      logout, 
      refreshToken,
      clearError,
      retryConnection
    }}>
      {children}
    </AuthContext.Provider>
  );
};