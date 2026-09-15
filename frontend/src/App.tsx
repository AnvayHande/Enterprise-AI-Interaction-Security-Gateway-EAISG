import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Overview } from './pages/Overview';
import { Playground } from './pages/Playground';
import { Requests } from './pages/Requests';
import { Findings } from './pages/Findings';
import { Policies } from './pages/Policies';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { LoginPage } from './pages/LoginPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('access_token');
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('access_token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout onLogout={handleLogout} />}>
          <Route index element={<Overview />} />
          <Route path="playground" element={<Playground />} />
          <Route path="requests" element={<Requests />} />
          <Route path="findings" element={<Findings />} />
          <Route path="policies" element={<Policies />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
