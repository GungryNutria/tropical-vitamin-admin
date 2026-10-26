import { createContext, useContext, useState, useEffect } from 'react';
import { API_URL, setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext(null);

function readSession() {
  try {
    const token = localStorage.getItem('adminToken');
    const stored = localStorage.getItem('adminUser');
    return token && stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession);
  const loading = false;

  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      setUser(null);
    });
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || 'Credenciales inválidas' 
        };
      }

      const data = await response.json();
      
      localStorage.setItem('adminToken', data.access_token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      setUser(data.user);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Error de conexión. Intenta de nuevo.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setUser(null);
  };

  const getToken = () => {
    return localStorage.getItem('adminToken');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}