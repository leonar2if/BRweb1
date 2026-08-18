import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Profile } from '../types/models';
import * as store from '../data/store';
import { cleanPhoneNumber } from '../utils/validators';
import { toHumanMessage } from '../utils/errorTranslator';

export type AuthState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; profile: Profile }
  | { kind: 'error'; message: string };

interface AuthContextValue {
  sessionReady: boolean;
  authState: AuthState;
  userId: string;
  userRole: 'client' | 'admin' | '';
  userPhone: string;
  userFullName: string;
  userBirthday: string | null;
  isDarkMode: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, fullName: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  resetState: () => void;
  setDarkMode: (value: boolean) => void;
  changePassword: (newPassword: string) => Promise<string | null>;
  updatePhone: (newLocalPhone: string) => Promise<void>;
  saveBirthday: (birthday: string | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionReady, setSessionReady] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({ kind: 'idle' });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isDarkMode, setIsDarkModeState] = useState(store.getStoredDarkMode());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Restauración de sesión al arrancar (equivalente a
  // AuthRepository.restoreSession() en Kotlin, pero aquí lo maneja
  // supabase-js automáticamente vía refresh token persistido).
  useEffect(() => {
    let mounted = true;

    store.getSession().then(async (session) => {
      if (!mounted) return;
      if (session?.user) {
        const p = await store.getProfile(session.user.id);
        setProfile(p);
      }
      setSessionReady(true);
    });

    const unsubscribe = store.onAuthStateChange(async (session) => {
      if (!mounted) return;
      if (session?.user) {
        const p = await store.getProfile(session.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    setAuthState({ kind: 'loading' });
    try {
      const p = await store.login(phone, password);
      setProfile(p);
      setAuthState({ kind: 'success', profile: p });
    } catch (e) {
      setAuthState({ kind: 'error', message: toHumanMessage(e) });
    }
  }, []);

  const register = useCallback(
    async (phone: string, fullName: string, password: string, confirmPassword: string) => {
      setAuthState({ kind: 'loading' });
      try {
        const p = await store.register(phone, fullName, password, confirmPassword);
        setProfile(p);
        setAuthState({ kind: 'success', profile: p });
      } catch (e) {
        setAuthState({ kind: 'error', message: toHumanMessage(e) });
      }
    },
    []
  );

  const logout = useCallback(() => {
    store.logout();
    setProfile(null);
    setAuthState({ kind: 'idle' });
  }, []);

  const resetState = useCallback(() => setAuthState({ kind: 'idle' }), []);

  const setDarkMode = useCallback((value: boolean) => {
    store.setStoredDarkMode(value);
    setIsDarkModeState(value);
  }, []);

  const changePassword = useCallback(
    async (newPassword: string): Promise<string | null> => {
      if (!profile) return 'No hay sesión activa.';
      try {
        await store.changePassword(profile.id, newPassword);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'No se pudo actualizar la contraseña.';
      }
    },
    [profile]
  );

  const updatePhone = useCallback(
    async (newLocalPhone: string) => {
      if (!profile) return;
      const clean = cleanPhoneNumber(newLocalPhone);
      await store.updatePhone(profile.id, clean);
      setProfile((prev) => (prev ? { ...prev, phone: clean } : prev));
    },
    [profile]
  );

  const refreshProfile = useCallback(async () => {
    if (!profile) return;
    const p = await store.getProfile(profile.id);
    if (p) setProfile(p);
  }, [profile]);

  const saveBirthday = useCallback(
    async (birthday: string | null) => {
      if (!profile) return;
      await store.updateBirthday(profile.id, birthday);
      setProfile((prev) => (prev ? { ...prev, birthday } : prev));
    },
    [profile]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      sessionReady,
      authState,
      userId: profile?.id ?? '',
      userRole: profile?.role ?? '',
      userPhone: profile?.phone ?? '',
      userFullName: profile?.fullName ?? '',
      userBirthday: profile?.birthday ?? null,
      isDarkMode,
      login,
      register,
      logout,
      resetState,
      setDarkMode,
      changePassword,
      updatePhone,
      saveBirthday,
      refreshProfile,
    }),
    [sessionReady, authState, profile, isDarkMode, login, register, logout, resetState, setDarkMode, changePassword, updatePhone, saveBirthday, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
