import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('medtrack_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('medtrack_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .getMe()
      .then((res) => {
        setUser(res.data);
        localStorage.setItem('medtrack_user', JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem('medtrack_token');
        localStorage.removeItem('medtrack_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await authApi.login(email, password);
    localStorage.setItem('medtrack_token', res.data.token);
    localStorage.setItem('medtrack_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('medtrack_token');
    localStorage.removeItem('medtrack_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
