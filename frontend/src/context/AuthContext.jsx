import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { changeLanguage } from '../i18n';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('wqg_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('wqg_token') || null);
  // Stale-while-revalidate: if we already have a cached token and user in localStorage,
  // do not block the UI with a full-screen loading spinner. Revalidate in the background.
  const [loading, setLoading] = useState(() => {
    const storedToken = localStorage.getItem('wqg_token');
    const storedUser = localStorage.getItem('wqg_user');
    if (!storedToken) return false;
    return !storedUser;
  });

  // Validate session on initialization
  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('wqg_token');
      if (!storedToken) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      try {
        const res = await api.get('/auth/me', { timeout: 8000 });
        if (!cancelled && res.data?.success && res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('wqg_user', JSON.stringify(res.data.user));
          if (res.data.user.languagePref) {
            changeLanguage(res.data.user.languagePref);
          }
        }
      } catch (err) {
        // Only call logout on explicit 401 response; on network error or timeout keep cached user
        if (err.response?.status === 401) {
          console.warn('[AuthContext] Session expired (401), logging out:', err.message);
          if (!cancelled) {
            logout();
          }
        } else {
          console.warn('[AuthContext] Server unreachable or timeout; preserving cached user session:', err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (phone, password) => {
    try {
      const res = await api.post('/auth/login', { phone, password });
      if (res.data?.success) {
        const { token: receivedToken, user: receivedUser } = res.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('wqg_token', receivedToken);
        localStorage.setItem('wqg_user', JSON.stringify(receivedUser));

        if (receivedUser.languagePref) {
          changeLanguage(receivedUser.languagePref);
        }

        return { success: true, user: receivedUser };
      }
      return { success: false, message: res.data?.message || 'Login failed' };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      const res = await api.post('/auth/register', userData);
      if (res.data?.success) {
        const { token: receivedToken, user: receivedUser } = res.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('wqg_token', receivedToken);
        localStorage.setItem('wqg_user', JSON.stringify(receivedUser));

        if (receivedUser.languagePref) {
          changeLanguage(receivedUser.languagePref);
        }

        return { success: true, user: receivedUser };
      }
      return { success: false, message: res.data?.message || 'Registration failed' };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed';
      return { success: false, message };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('wqg_token');
    localStorage.removeItem('wqg_user');
  };

  const updateUser = (userData) => {
    setUser((prev) => {
      const updated = typeof userData === 'function' ? userData(prev) : { ...(prev || {}), ...(userData || {}) };
      localStorage.setItem('wqg_user', JSON.stringify(updated));
      if (updated?.languagePref) {
        changeLanguage(updated.languagePref);
      }
      return updated;
    });
  };

  const updateToken = (newToken) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('wqg_token', newToken);
    } else {
      localStorage.removeItem('wqg_token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        setUser,
        updateUser,
        updateToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
