import { useState, useEffect } from 'react';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const correctPassword = import.meta.env.VITE_PASSWORD;

  useEffect(() => {
    const storedAuth = localStorage.getItem('cashflow_auth');
    const storedPassword = localStorage.getItem('web_password');
    if (storedAuth === 'true' && storedPassword) {
      setIsAuthenticated(true);
      setPassword(storedPassword);
    }
  }, []);

  const login = (inputPassword) => {
    if (inputPassword === correctPassword) {
      localStorage.setItem('cashflow_auth', 'true');
      localStorage.setItem('web_password', inputPassword);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('cashflow_auth');
    localStorage.removeItem('web_password');
    setIsAuthenticated(false);
    setPassword('');
  };

  return { isAuthenticated, login, logout };
}
