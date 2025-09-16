import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useMe } from '@/hooks/useMe';
import { getAccessibleRoutes, type AppRouteId } from '@/lib/roles';
import {
  Users,
  ClipboardList,
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

export default function BottomNav() {
  const { profile } = useMe();
  const location = useLocation();

  if (!profile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t medical-shadow h-16 flex items-center justify-around">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center space-y-1">
            <div className="w-6 h-6 bg-muted rounded animate-pulse" />
            <div className="w-8 h-2 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const accessible = new Set(getAccessibleRoutes(profile.role));
  const visibleNavItems = NAV_ITEMS.filter((item) => accessible.has(item.id));

  // Show only the most important items on mobile (max 5)
  const mobileNavItems = visibleNavItems.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t medical-shadow h-16 flex items-center justify-around px-2 z-50">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.to;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              'flex flex-col items-center justify-center space-y-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors min-w-0 flex-1',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate leading-none">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}