import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setAccessToken, type User } from '../lib/api';

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (data: { email: string; password: string; name?: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string; avatarUrl?: string }) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Silent session hydration on initial application mount
  const hydrateSession = useCallback(async () => {
    try {
      const response = await api.post('/auth/refresh-token');
      if (response.data?.success && response.data?.data?.accessToken) {
        const { accessToken, user: authenticatedUser } = response.data.data;
        setAccessToken(accessToken);
        setUser(authenticatedUser);
      }
    } catch {
      // Unauthenticated / expired session is completely normal on initial page load
      setAccessToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    const { user: authenticatedUser, accessToken } = response.data.data;
    setAccessToken(accessToken);
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; name?: string; phone?: string }) => {
      const response = await api.post('/auth/register', data);
      const { user: authenticatedUser, accessToken } = response.data.data;
      setAccessToken(accessToken);
      setUser(authenticatedUser);
      return authenticatedUser;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Proceed with local logout regardless of network error
    } finally {
      setAccessToken();
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(
    async (data: { name?: string; phone?: string; avatarUrl?: string }) => {
      const response = await api.patch('/auth/profile', data);
      const updatedUser = response.data.data.user;
      setUser(updatedUser);
      return updatedUser;
    },
    [],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, isLoading, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
