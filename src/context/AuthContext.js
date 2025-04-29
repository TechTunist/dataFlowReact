import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token') || null);

    const signup = async (username, email, password) => {
        try {
            await axios.post('https://vercel-dataflow.vercel.app/api/accounts/signup/', {
                username,
                email,
                password,
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Signup failed' };
        }
    };

    const login = async (username, password) => {
        try {
            const response = await axios.post('https://vercel-dataflow.vercel.app/api/accounts/login/', {
                username,
                password,
            });
            const { access, refresh } = response.data;
            localStorage.setItem('token', access);
            localStorage.setItem('refresh_token', refresh);
            setToken(access);
            setRefreshToken(refresh);
            setUser({ username });
            axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.detail || 'Login failed' };
        }
    };

    const logout = async () => {
        try {
            await axios.post(
                'https://vercel-dataflow.vercel.app/api/accounts/logout/',
                { refresh_token: refreshToken },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            setToken(null);
            setRefreshToken(null);
            setUser(null);
            delete axios.defaults.headers.common['Authorization'];
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Logout failed' };
        }
    };

    const refreshAccessToken = async () => {
        try {
            const response = await axios.post('https://vercel-dataflow.vercel.app/api/token/refresh/', {
                refresh: refreshToken,
            });
            const { access } = response.data;
            localStorage.setItem('token', access);
            setToken(access);
            axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
            return true;
        } catch (error) {
            logout();
            return false;
        }
    };

    useEffect(() => {
        if (token && refreshToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            // Optionally refresh token periodically
        }
    }, [token, refreshToken]);

    return (
        <AuthContext.Provider value={{ user, token, signup, login, logout, refreshAccessToken }}>
            {children}
        </AuthContext.Provider>
    );
};