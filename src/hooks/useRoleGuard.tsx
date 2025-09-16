import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMe } from './useMe';
import { hasAccess, isIntakeRestricted, type AppRouteId, type UserRole } from '@/lib/roles';

// Map routes to their IDs
const ROUTE_MAP: Record<string, AppRouteId> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/patients': 'patients',
  '/intake': 'intake',
  '/waiting-room': 'waiting',
  '/calendar': 'calendar',
  '/clinical': 'clinical',
  '/billing': 'billing',
  '/expenses': 'expenses',
  '/analytics': 'analytics',
  '/admin': 'admin',
};

export function useRoleGuard(requiredRoles?: UserRole[]) {
  const { profile, isLoading } = useMe();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || !profile) return;

    const currentPath = location.pathname;
    const routeId = ROUTE_MAP[currentPath];

    // Handle intake role hard restriction
    if (isIntakeRestricted(profile.role)) {
      if (currentPath !== '/intake') {
        navigate('/intake', { replace: true });
        return;
      }
    }

    // Check required roles if specified
    if (requiredRoles && !requiredRoles.includes(profile.role)) {
      navigate('/unauthorized', { replace: true });
      return;
    }

    // Check route access based on role
    if (routeId && !hasAccess(profile.role, routeId)) {
      navigate('/unauthorized', { replace: true });
      return;
    }
  }, [profile, isLoading, location.pathname, requiredRoles, navigate]);

  return {
    isAuthorized: profile ? hasAccess(profile.role, ROUTE_MAP[location.pathname] || 'dashboard') : false,
    userRole: profile?.role,
    isLoading
  };
}

// Component wrapper for role-based route protection
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthorized, isLoading } = useRoleGuard(requiredRoles);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}