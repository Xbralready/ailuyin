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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// API版本管理 - 更新此版本号会强制用户重新登录
const API_VERSION = '2.0';

// 检查并清理过期的认证数据
const checkAndCleanAuth = () => {
  const storedVersion = localStorage.getItem('apiVersion');
  const lastLogin = localStorage.getItem('lastLogin');
  
  // 如果API版本不匹配，清除所有认证数据
  if (storedVersion !== API_VERSION) {
    console.log('API版本已更新，清除旧的认证数据');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('lastLogin');
    localStorage.setItem('apiVersion', API_VERSION);
    return false;
  }
  
  // 检查登录是否超过7天
  if (lastLogin) {
    const loginTime = new Date(lastLogin).getTime();
    const now = new Date().getTime();
    const daysSinceLogin = (now - loginTime) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLogin > 7) {
      console.log('登录已超过7天，需要重新登录');
      localStorage.removeItem('accessToken');
      return false;
    }
  }
  
  return true;
};

// 设置axios拦截器
const setupAxiosInterceptors = (refreshToken: () => Promise<string>) => {
  // 请求拦截器
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
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
  interface QueueItem {
    resolve: (token: string | null) => void;
    reject: (error: unknown) => void;
  }
  let failedQueue: QueueItem[] = [];

  const processQueue = (error: unknown, token: string | null = null) => {
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
        console.error('网络连接失败');
        return Promise.reject(error);
      }

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
          // 刷新失败，跳转到登录页
          localStorage.removeItem('accessToken');
          localStorage.removeItem('lastLogin');
          
          // 延迟跳转，让用户看到提示
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshToken = useCallback(async () => {
    const response = await api.post('/auth/refresh');
    const { accessToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  }, []);

  // 获取当前用户信息
  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('获取用户信息失败:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('lastLogin');
    }
  }, []);

  useEffect(() => {
    // 设置axios拦截器
    setupAxiosInterceptors(refreshToken);

    // 检查并清理过期的认证数据
    const isAuthValid = checkAndCleanAuth();

    // 检查是否有token并获取用户信息
    const token = localStorage.getItem('accessToken');
    if (token && isAuthValid) {
      fetchCurrentUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchCurrentUser, refreshToken]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('lastLogin', new Date().toISOString());
      localStorage.setItem('apiVersion', API_VERSION);
      setUser(user);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || '登录失败');
      }
      throw error;
    }
  };

  const register = async (email: string, password: string, nickname?: string) => {
    try {
      const response = await api.post('/auth/register', { email, password, nickname });
      const { user, accessToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('lastLogin', new Date().toISOString());
      localStorage.setItem('apiVersion', API_VERSION);
      setUser(user);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || '注册失败');
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('lastLogin');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};