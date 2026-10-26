import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../api/authApi';
import { apiClient } from '../api/client';
import { CONFIG } from '../constants/config';
import { AuthContextType, DriverProfile, LoginCredentials } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (_) {
      // Ignore network errors on logout
    } finally {
      await SecureStore.deleteItemAsync(CONFIG.TOKEN_STORAGE_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(CONFIG.DRIVER_STORAGE_KEY).catch(() => {});
      setToken(null);
      setDriver(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await authApi.getProfile();
      if (response && response.driver) {
        setDriver(response.driver);
        await SecureStore.setItemAsync(
          CONFIG.DRIVER_STORAGE_KEY,
          JSON.stringify(response.driver)
        );
      }
    } catch (err) {
      console.warn('Failed to refresh driver profile:', err);
    }
  }, []);

  // Initialize session from SecureStore on startup
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(CONFIG.TOKEN_STORAGE_KEY);
        const storedDriverJson = await SecureStore.getItemAsync(CONFIG.DRIVER_STORAGE_KEY);

        if (storedToken) {
          setToken(storedToken);
          if (storedDriverJson) {
            try {
              setDriver(JSON.parse(storedDriverJson));
            } catch (_) {}
          }
          // Verify token validity by refreshing profile
          try {
            const res = await authApi.getProfile();
            if (res && res.driver) {
              setDriver(res.driver);
              await SecureStore.setItemAsync(
                CONFIG.DRIVER_STORAGE_KEY,
                JSON.stringify(res.driver)
              );
            }
          } catch (err: any) {
            // If token expired, clear state
            if (err.message && err.message.includes('401')) {
              await logout();
            }
          }
        }
      } catch (err) {
        console.error('Session restoration error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Attach unauthorized interceptor to auto-logout on session expiration
    apiClient.setOnUnauthorized(() => {
      logout();
    });

    initializeAuth();
  }, [logout]);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.login(credentials);
      if (response && response.token && response.driver) {
        await SecureStore.setItemAsync(CONFIG.TOKEN_STORAGE_KEY, response.token);
        await SecureStore.setItemAsync(
          CONFIG.DRIVER_STORAGE_KEY,
          JSON.stringify(response.driver)
        );
        setToken(response.token);
        setDriver(response.driver);
        return { success: true };
      }
      return { success: false, error: 'Incomplete response received from server.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed. Please check your credentials.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        driver,
        token,
        isLoading,
        isAuthenticated: !!token && !!driver,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
