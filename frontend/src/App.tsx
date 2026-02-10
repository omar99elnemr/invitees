/**
 * Main App Component
 * Sets up routing and global providers
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { lazy, Suspense, useState, useCallback } from 'react';
import PWAInstallPrompt from './components/common/PWAInstallPrompt';
import SplashScreen from './components/common/SplashScreen';

const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
              (window.navigator as any).standalone === true;

// Lazy-loaded pages (code splitting)
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Events = lazy(() => import('./pages/Events'));
const Invitees = lazy(() => import('./pages/Invitees'));
const Approvals = lazy(() => import('./pages/Approvals'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const Profile = lazy(() => import('./pages/Profile'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Portal = lazy(() => import('./pages/Portal'));
const CheckInConsole = lazy(() => import('./pages/CheckInConsole'));
const LiveDashboard = lazy(() => import('./pages/LiveDashboard'));
const ExportSettings = lazy(() => import('./pages/ExportSettings'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  const [showSplash, setShowSplash] = useState(isPWA);
  const hideSplash = useCallback(() => setShowSplash(false), []);

  return (
    <>
    {showSplash && <SplashScreen onFinish={hideSplash} />}
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <PWAInstallPrompt />
        <Suspense fallback={<div className="min-h-screen" />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Public Routes - No Auth Required */}
          <Route path="/portal" element={<Portal />} />
          {/* Event-specific public routes */}
          <Route path="/live/:eventCode" element={<LiveDashboard />} />
          <Route path="/checkin/:eventCode" element={<CheckInConsole />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route
              path="events"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Events />
                </ProtectedRoute>
              }
            />
            <Route path="invitees" element={<Invitees />} />
            <Route
              path="approvals"
              element={
                <ProtectedRoute roles={['admin', 'director']}>
                  <Approvals />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute roles={['admin', 'director']}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route path="profile" element={<Profile />} />
            <Route
              path="settings"
              element={
                <ProtectedRoute roles={['admin']}>
                  <ExportSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Attendance />
                </ProtectedRoute>
              }
            />
          </Route>
          {/* Catch-all for unknown routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>

    </>
  );
}

export default App;
