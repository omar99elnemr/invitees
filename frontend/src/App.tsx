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

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Invitees from './pages/Invitees';
import Approvals from './pages/Approvals';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Attendance from './pages/Attendance';
import Portal from './pages/Portal';
import CheckInConsole from './pages/CheckInConsole';
import LiveDashboard from './pages/LiveDashboard';

function App() {
  return (
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
                <ProtectedRoute roles={['admin']}>
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
              path="attendance"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Attendance />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
