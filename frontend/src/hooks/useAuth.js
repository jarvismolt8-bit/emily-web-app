import { useState, useEffect } from 'react';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const correctPassword = import.meta.env.VITE_PASSWORD;

  useEffect(() => {
    const storedAuth = localStorage.getItem('cashflow_auth');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const login = (inputPassword) => {
    if (inputPassword === correctPassword) {
      localStorage.setItem('cashflow_auth', 'true');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('cashflow_auth');
    setIsAuthenticated(false);
    setPassword('');
  };

  return { isAuthenticated, login, logout };
}
