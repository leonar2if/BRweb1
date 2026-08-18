import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingIndicator } from './components/Misc';
import AndroidDownloadBanner from './components/AndroidDownloadBanner';
import { isSupabaseConfigured } from './data/supabaseClient';
import Icon from './components/Icon';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import ClientHomeScreen from './screens/client/ClientHomeScreen';
import AdminHomeScreen from './screens/admin/AdminHomeScreen';

/**
 * Puerto directo de AppNavigation.kt: espera a que la sesión esté lista
 * (sessionReady) y enruta a Login/Register, ClientHome o AdminHome según
 * el rol del perfil autenticado.
 */
function SupabaseNotConfigured() {
  return (
    <div className="device-scroll flex-col items-center justify-center" style={{ padding: 32 }}>
      <Icon name="cloud_off" size={56} style={{ color: 'var(--error)' }} />
      <h2 className="text-title-lg fw-bold mt-4 text-center">Falta configurar Supabase</h2>
      <p className="text-body-md text-onSurfaceVariant mt-2 text-center">
        Copia <code>.env.example</code> a <code>.env</code> y rellena{' '}
        <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> con los datos de tu
        proyecto (los mismos que usa la app Android). Luego reinicia <code>npm run dev</code>.
      </p>
    </div>
  );
}

function Router() {
  const { sessionReady, userId, userRole } = useAuth();

  if (!sessionReady) {
    return (
      <div className="device-scroll">
        <LoadingIndicator message="Iniciando Rodríguez Barbería..." />
      </div>
    );
  }

  const isAuthenticated = userId !== '';

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginScreen />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterScreen />}
      />
      <Route
        path="/"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : userRole === 'admin' ? (
            <AdminHomeScreen />
          ) : (
            <ClientHomeScreen />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <div className="device-frame">
          <div className="status-bar-spacer" />
          <AndroidDownloadBanner />
          {isSupabaseConfigured ? (
            <HashRouter>
              <Router />
            </HashRouter>
          ) : (
            <SupabaseNotConfigured />
          )}
        </div>
      </div>
    </AuthProvider>
  );
}
