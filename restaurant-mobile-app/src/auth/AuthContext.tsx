import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';
import type { AppUser } from '../types';

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync('auth_user');
        const token = await SecureStore.getItemAsync('auth_token');
        if (alive && saved && token) {
          const parsed = JSON.parse(saved) as AppUser;
          if (['customer', 'user'].includes(String(parsed.role || '').toLowerCase())) {
            setUser(parsed);
          } else {
            await SecureStore.deleteItemAsync('auth_user');
            await SecureStore.deleteItemAsync('auth_token');
          }
        }
      } catch {
        await SecureStore.deleteItemAsync('auth_user');
        await SecureStore.deleteItemAsync('auth_token');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email: email.trim(), password });
    const payload = response.data;
    const token = payload?.token || payload?.accessToken || payload?.data?.token;
    const rawUser = payload?.user || payload?.data?.user;
    if (!token || !rawUser) throw new Error(payload?.message || 'Login response did not include a user and token.');
    const role = String(rawUser.role || 'customer').toLowerCase();
    if (!['customer', 'user'].includes(role)) {
      throw new Error('This app is for Hotel Maurya customers. Please use the staff workspace to sign in.');
    }
    const nextUser: AppUser = {
      id: String(rawUser.id || rawUser._id || ''),
      name: String(rawUser.name || 'Guest'),
      email: String(rawUser.email || email.trim()),
      phone: rawUser.phone ? String(rawUser.phone) : undefined,
      role,
      isVerified: rawUser.isVerified,
    };
    await SecureStore.setItemAsync('auth_token', String(token));
    await SecureStore.setItemAsync('auth_user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('auth_user');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
