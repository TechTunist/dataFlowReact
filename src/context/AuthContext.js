// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token') || null);

  // Initialize axios headers on mount
  useEffect(() => {
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
      refreshAccessToken();
    }
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
              console.log('Token refreshed successfully:', token);
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              return axios(originalRequest);
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
  }, [token, refreshToken]);

  const signup = async (username, email, password) => {
    try {
      await axios.post('https://vercel-dataflow.vercel.app/accounts/signup/', {
        username,
        email,
        password,
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
      const { access, refresh, email } = response.data; // Assuming the API returns the email
      localStorage.setItem('token', access);
      localStorage.setItem('refresh_token', refresh);
      setToken(access);
      setRefreshToken(refresh);
      setUser({ username, email }); // Include email in the user object
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
        { refresh_token: refreshToken },
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
    try {
      const response = await axios.post('https://vercel-dataflow.vercel.app/api/token/refresh/', {
        refresh: refreshToken,
      }, { withCredentials: true });
      const { access, refresh } = response.data;
      localStorage.setItem('token', access);
      if (refresh) {
        localStorage.setItem('refresh_token', refresh);
        setRefreshToken(refresh);
      }
      setToken(access);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      return true;
    } catch (error) {
      console.error('Refresh token failed:', error.response?.data);
      logout();
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, signup, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);