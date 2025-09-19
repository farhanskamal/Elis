import React, { useState, useMemo, useCallback } from 'react';
import LoginPage from './pages/auth/LoginPage';
import LibrarianDashboard from './pages/dashboard/LibrarianDashboard';
import MonitorDashboard from './pages/dashboard/MonitorDashboard';
import { AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationsProvider } from './context/NotificationsContext';
import NotificationsToaster from './components/NotificationsToaster';
import ErrorBoundary from './components/ErrorBoundary';
import { User, Role } from './types';
import { api } from './services/apiService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await api.authenticateUser(email, password);
      if (response.user) {
        setCurrentUser(response.user);
        return true;
      } else {
        setError("Invalid email or password.");
        return false;
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setCurrentUser(null);
  }, []);

  const updateCurrentUser = useCallback((updatedData: Partial<User>) => {
    if (currentUser) {
      setCurrentUser(prevUser => ({ ...prevUser!, ...updatedData }));
    }
  }, [currentUser]);

  const authContextValue = useMemo(() => ({
    user: currentUser,
    login,
    logout,
    updateCurrentUser,
  }), [currentUser, login, logout, updateCurrentUser]);

  const renderDashboard = () => {
    if (!currentUser) return null;
    switch (currentUser.role) {
      case Role.Librarian:
        return <LibrarianDashboard />;
      case Role.Monitor:
        return <MonitorDashboard />;
      default:
        // This case should ideally not be reached
        return <LoginPage initialError="Your user role is not recognized. Please contact an administrator." />;
    }
  };

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={authContextValue}>
        <ThemeProvider>
          <NotificationsProvider>
            <div className="min-h-screen text-gray-800" style={{ backgroundColor: 'var(--color-bg)' }}>
              {currentUser ? renderDashboard() : <LoginPage initialError={error} />}
              <NotificationsToaster/>
            </div>
          </NotificationsProvider>
        </ThemeProvider>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
};

export default App;
