import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import api, { setUnauthorizedHandler } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      localStorage.removeItem('prosurance_token');
      navigate('/login', { replace: true });
    });

    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('prosurance_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
    } catch (err) {
      console.error('Auth verification failed:', err);
      localStorage.removeItem('prosurance_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('prosurance_token', data.token);
      setUser(data.user);
      navigate('/', { replace: true });
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('prosurance_token');
    setUser(null);
    navigate('/login', { replace: true });
  };

  const value = {
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#8A9AB4] font-medium tracking-wide uppercase">
            Initializing Ops Console...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
