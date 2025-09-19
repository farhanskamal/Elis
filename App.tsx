import React, { useState, useMemo, useCallback, useContext } from 'react';
import LoginPage from './pages/auth/LoginPage';
import LibrarianDashboard from './pages/dashboard/LibrarianDashboard';
import MonitorDashboard from './pages/dashboard/MonitorDashboard';
import { AuthContext } from './context/AuthContext';
import { ThemeProvider, ThemeContext } from './context/ThemeContext';
import { NotificationsProvider } from './context/NotificationsContext';
import NotificationsToaster from './components/NotificationsToaster';
import ErrorBoundary from './components/ErrorBoundary';
import { User, Role } from './types';
import { api } from './services/apiService';

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { loadUserTheme } = useContext(ThemeContext);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await api.authenticateUser(email, password);
      if (response.user) {
        setCurrentUser(response.user);
        // Load user-specific theme preferences
        loadUserTheme(response.user.themePreferences);
        return true;
      } else {
        setError("Invalid email or password.");
        return false;
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      return false;
    }
  }, [loadUserTheme]);

  const logout = useCallback(() => {
    api.logout();
    setCurrentUser(null);
    // Reset theme to default when logging out
    loadUserTheme();
  }, [loadUserTheme]);

  const updateCurrentUser = useCallback((updatedData: Partial<User>) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updatedData };
      setCurrentUser(updatedUser);
      // If theme preferences were updated, apply them
      if (updatedData.themePreferences !== undefined) {
        loadUserTheme(updatedData.themePreferences);
      }
    }
  }, [currentUser, loadUserTheme]);

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
        <NotificationsProvider>
          <div className="min-h-screen text-gray-800" style={{ backgroundColor: 'var(--color-bg)' }}>
            {currentUser ? renderDashboard() : <LoginPage initialError={error} />}
            <NotificationsToaster/>
          </div>
        </NotificationsProvider>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
