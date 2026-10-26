import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Sin sesión va al login y deja en el estado la ruta pedida (`from`) y el motivo (`reason`).
export default function PrivateRoute({ children }) {
  const { user, loading, reason } = useAuth();
  const location = useLocation();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace state={{ from: location, reason }} />;
}
