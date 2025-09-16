// Role-based access control configuration
export type UserRole = 'admin' | 'doctor' | 'assistant' | 'receptionist' | 'intake';
export type AppRouteId = 'dashboard' | 'patients' | 'intake' | 'waiting' | 'calendar' | 'clinical' | 'billing' | 'expenses' | 'analytics' | 'admin';

// Central permissions mapping
export const ACCESS: Record<UserRole, AppRouteId[]> = {
  admin: ['dashboard', 'patients', 'intake', 'waiting', 'calendar', 'clinical', 'billing', 'expenses', 'analytics', 'admin'],
  doctor: ['dashboard', 'patients', 'waiting', 'clinical', 'calendar', 'billing'], // billing read-only
  assistant: ['dashboard', 'patients', 'intake', 'waiting', 'clinical', 'expenses'], // expenses add only
  receptionist: ['dashboard', 'patients', 'intake', 'waiting', 'calendar', 'billing'], // no clinical notes
  intake: ['intake'], // hard restricted to intake only
};

// Role display configuration
export const ROLE_CONFIG: Record<UserRole, { label: string; color: string; description: string }> = {
  admin: { 
    label: 'Admin', 
    color: 'bg-red-100 text-red-800 border-red-200', 
    description: 'Full system access' 
  },
  doctor: { 
    label: 'Doctor', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    description: 'Clinical and patient care' 
  },
  assistant: { 
    label: 'Assistant', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    description: 'Patient care and intake support' 
  },
  receptionist: { 
    label: 'Receptionist', 
    color: 'bg-purple-100 text-purple-800 border-purple-200', 
    description: 'Front desk and scheduling' 
  },
  intake: { 
    label: 'Intake', 
    color: 'bg-orange-100 text-orange-800 border-orange-200', 
    description: 'Patient intake only' 
  },
};

// Helper functions
export function hasAccess(userRole: UserRole, routeId: AppRouteId): boolean {
  return ACCESS[userRole]?.includes(routeId) ?? false;
}

export function getAccessibleRoutes(userRole: UserRole): AppRouteId[] {
  return ACCESS[userRole] ?? [];
}

export function isIntakeRestricted(userRole: UserRole): boolean {
  return userRole === 'intake';
}

export function canAccessAdmin(userRole: UserRole): boolean {
  return userRole === 'admin';
}

export function canManageStaff(userRole: UserRole): boolean {
  return userRole === 'admin';
}