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
  const [reason, setReason] = useState(null);
  const loading = false;

  useEffect(() => {
    setUnauthorizedHandler((why) => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      setReason(why || null);
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
        // 401/400: credenciales; cualquier otro estado: el servidor falló.
        return { success: false, kind: response.status === 401 || response.status === 400 ? 'credentials' : 'server' };
      }

      const data = await response.json();
      
      localStorage.setItem('adminToken', data.access_token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      setReason(null);
      setUser(data.user);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, kind: 'network' };
    }
  };

  // 'logout': salida deliberada; el login no muestra aviso ni vuelve a la ruta anterior.
  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setReason('logout');
    setUser(null);
  };

  const getToken = () => {
    return localStorage.getItem('adminToken');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, getToken, reason }}>
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