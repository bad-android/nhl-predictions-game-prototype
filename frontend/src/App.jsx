import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Navigation from './components/Navigation';
import Predictions from './components/Predictions';
import Leaderboard from './components/Leaderboard';
import Overview from './components/Overview';
import Results from './components/Results';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  if (user?.username !== 'sebastian') return <Navigate to="/predictions" replace />;
  return children;
}

export default function App() {
  const { token } = useAuth();

  return (
    <div className="app">
      {token && <Navigation />}
      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={token ? <Navigate to="/predictions" replace /> : <Login />}
          />
          <Route
            path="/predictions"
            element={
              <ProtectedRoute>
                <Predictions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/overview"
            element={
              <ProtectedRoute>
                <Overview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <AdminRoute>
                <Results />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
