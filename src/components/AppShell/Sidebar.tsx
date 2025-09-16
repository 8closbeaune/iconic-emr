import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useMe } from '@/hooks/useMe';
import { getAccessibleRoutes, type AppRouteId } from '@/lib/roles';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Clock,
  Calendar,
  Stethoscope,
  CreditCard,
  Receipt,
  BarChart3,
  Shield,
} from 'lucide-react';

interface NavItem {
  id: AppRouteId;
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'patients', to: '/front-desk', label: 'Front Desk', icon: Users },
  { id: 'patients', to: '/patients', label: 'Patients', icon: Users },
  { id: 'intake', to: '/intake', label: 'Intake', icon: ClipboardList },
  { id: 'calendar', to: '/calendar', label: 'Calendar', icon: Calendar },
  { id: 'clinical', to: '/clinical', label: 'Clinical', icon: Stethoscope },
  { id: 'billing', to: '/billing', label: 'Billing', icon: CreditCard },
  { id: 'expenses', to: '/expenses', label: 'Expenses', icon: Receipt },
  { id: 'analytics', to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'admin', to: '/admin', label: 'Admin', icon: Shield },
];

export default function Sidebar() {
  const { profile } = useMe();
  const location = useLocation();

  if (!profile) {
    return (
      <aside className="w-64 bg-card border-r medical-shadow h-full">
        <nav className="p-6 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 bg-muted rounded animate-pulse" />
          ))}
        </nav>
      </aside>
    );
  }

  const accessible = new Set(getAccessibleRoutes(profile.role));
  const visibleNavItems = NAV_ITEMS.filter((item) => accessible.has(item.id));

  return (
    <aside className="w-64 bg-card border-r medical-shadow h-full">
      <nav className="p-6 space-y-2">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive || isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}