import { Navigate, Outlet } from 'react-router-dom';
import { UserProfile, UserRole } from '../types';

interface AuthGuardProps {
  user: UserProfile | null;
  requiredRole?: UserRole;
}

export default function AuthGuard({ user, requiredRole }: AuthGuardProps) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
