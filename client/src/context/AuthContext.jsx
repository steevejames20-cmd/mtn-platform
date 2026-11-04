import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setAdminUnauthorizedHandler, tokens } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(Boolean(tokens.admin()));

  const logout = useCallback(() => {
    tokens.setAdmin(null);
    setAdmin(null);
  }, []);

  useEffect(() => {
    setAdminUnauthorizedHandler(logout);
    if (!tokens.admin()) return;
    api('/admin/me', { auth: 'admin' })
      .then((d) => setAdmin(d.admin))
      .catch(() => logout())
      .finally(() => setChecking(false));
  }, [logout]);

  const login = async (email, password) => {
    const d = await api('/admin/login', { method: 'POST', body: { email, password } });
    tokens.setAdmin(d.token);
    setAdmin(d.admin);
    return d.admin;
  };

  return <AuthContext.Provider value={{ admin, checking, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
