// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token') || null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state to handle initial fetch

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedRefreshToken = localStorage.getItem('refresh_token');
      if (storedToken) {
        setToken(storedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
      if (storedRefreshToken) {
        setRefreshToken(storedRefreshToken);
      }
      if (storedToken && storedRefreshToken) {
        try {
          // Refresh the token to ensure it's valid
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            // Fetch user profile to restore user state
            const response = await axios.get('https://vercel-dataflow.vercel.app/accounts/profile/', {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
              withCredentials: true,
            });
            setUser(response.data); // { username, email }
          } else {
            logout();
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          logout();
        }
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            console.log('Attempting to refresh token...');
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              console.log('Token refreshed successfully, retrying original request...');
              originalRequest.headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
              return axios(originalRequest);
            } else {
              console.log('Refresh failed, redirecting to login...');
              logout();
              window.location.href = '/login';
              return Promise.reject(error);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    if (!token || !refreshToken) return;

    const refreshInterval = setInterval(async () => {
      console.log('Proactively refreshing token...');
      await refreshAccessToken();
    }, 50 * 60 * 1000); // Refresh every 50 minutes

    return () => clearInterval(refreshInterval);
  }, [token, refreshToken]);

  const signup = async (username, email, password) => {
    try {
      const response = await axios.post('https://vercel-dataflow.vercel.app/accounts/signup/', {
        username,
        email,
        password,
        confirm_password: password,
      }, { withCredentials: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Signup failed' };
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post('https://vercel-dataflow.vercel.app/accounts/login/', {
        username,
        password,
      }, { withCredentials: true });
      const { access, refresh, email } = response.data;
      localStorage.setItem('token', access);
      localStorage.setItem('refresh_token', refresh);
      setToken(access);
      setRefreshToken(refresh);
      setUser({ username, email });
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        'https://vercel-dataflow.vercel.app/accounts/logout/',
        { refresh_token: localStorage.getItem('refresh_token') },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
    }
    return { success: true };
  };

  const refreshAccessToken = async () => {
    const currentRefreshToken = localStorage.getItem('refresh_token');
    if (!currentRefreshToken) {
      console.log('No refresh token available, logging out...');
      logout();
      return false;
    }

    try {
      console.log('Refreshing token with refresh token:', currentRefreshToken);
      const response = await axios.post('https://vercel-dataflow.vercel.app/api/token/refresh/', {
        refresh: currentRefreshToken,
      }, { withCredentials: true });
      const { access, refresh } = response.data;
      console.log('New access token:', access);
      localStorage.setItem('token', access);
      setToken(access);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      if (refresh) {
        console.log('New refresh token issued:', refresh);
        localStorage.setItem('refresh_token', refresh);
        setRefreshToken(refresh);
      } else {
        console.log('No new refresh token issued; keeping existing one.');
      }
      return true;
    } catch (error) {
      console.error('Refresh token failed:', error.response?.data || error.message);
      logout();
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, signup, login, logout, refreshAccessToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
