'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api, TokenManager } from '@/lib/api';
import type {
  UserResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfileRequest,
} from '@/schemas/api';

// ============================================================================
// Context Types
// ============================================================================

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLecturer: boolean;
  loading: boolean;
  initializing: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ============================================================================
// Context Creation
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Derived state
  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin';
  const isLecturer = user?.role === 'lecturer';

  // ============================================================================
  // Fetch Current User
  // ============================================================================

  const fetchCurrentUser = useCallback(async (accessToken: string) => {
    try {
      const currentUser = await api.get<UserResponse>('/auth/me', undefined, true);
      setUser(currentUser);
      setToken(accessToken);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch current user:', err);
      TokenManager.remove();
      setUser(null);
      setToken(null);
      setError(err.message || 'Failed to authenticate');
    }
  }, []);

  // ============================================================================
  // Initialize Auth State
  // ============================================================================

  useEffect(() => {
    const initAuth = async () => {
      setInitializing(true);
      const existingToken = TokenManager.get();

      if (existingToken) {
        await fetchCurrentUser(existingToken);
      }

      setInitializing(false);
    };

    initAuth();
  }, [fetchCurrentUser]);

  // ============================================================================
  // Listen for Unauthorized Events
  // ============================================================================

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setError('Session expired. Please log in again.');
      router.push('/auth');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [router]);

  // ============================================================================
  // Login
  // ============================================================================

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const credentials: LoginRequest = { email, password };
      const response = await api.post<LoginResponse>('/auth/login', credentials);

      TokenManager.set(response.token);
      setUser(response.user);
      setToken(response.token);
      setError(null);

      toast.success('Successfully logged in!');
      
      // Check if there's a return URL in the query params
      const params = new URLSearchParams(window.location.search);
      const returnUrl = params.get('returnUrl');
      
      if (returnUrl) {
        router.push(decodeURIComponent(returnUrl));
      } else {
        router.push('/');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router]);

  // ============================================================================
  // Register
  // ============================================================================

  const register = useCallback(async (data: RegisterRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<LoginResponse>('/auth/register', data);

      TokenManager.set(response.token);
      setUser(response.user);
      setToken(response.token);
      setError(null);

      toast.success('Account created successfully!');
      
      // Check if there's a return URL in the query params
      const params = new URLSearchParams(window.location.search);
      const returnUrl = params.get('returnUrl');
      
      if (returnUrl) {
        router.push(decodeURIComponent(returnUrl));
      } else {
        router.push('/');
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router]);

  // ============================================================================
  // Logout
  // ============================================================================

  const logout = useCallback(() => {
    TokenManager.remove();
    setUser(null);
    setToken(null);
    setError(null);
    toast.success('Successfully logged out');
    router.push('/auth');
  }, [router]);

  // ============================================================================
  // Update Profile
  // ============================================================================

  const updateProfile = useCallback(async (data: UpdateProfileRequest) => {
    setLoading(true);
    setError(null);

    try {
      const updatedUser = await api.patch<UserResponse>('/auth/me', data, true);
      setUser(updatedUser);
      setError(null);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error('Profile update failed:', err);
      const errorMessage = err.message || 'Profile update failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // Refresh User
  // ============================================================================

  const refreshUser = useCallback(async () => {
    const currentToken = TokenManager.get();
    if (currentToken) {
      await fetchCurrentUser(currentToken);
    }
  }, [fetchCurrentUser]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isLecturer,
    loading,
    initializing,
    error,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
