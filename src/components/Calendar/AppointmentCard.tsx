import { Badge } from '@/components/ui/badge';
import { CalendarAppointment } from '@/hooks/useCalendarData';
import { format } from 'date-fns';
import { Clock, User, Phone, Stethoscope, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppointmentCardProps {
  appointment: CalendarAppointment;
  onClick: () => void;
  className?: string;
  compact?: boolean;
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'planned': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'arrived': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'ready': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'in_chair': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'no_show': return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'cancelled': return 'bg-slate-100 text-slate-800 border-slate-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getStatusBackgroundColor(status: string) {
  switch (status) {
    case 'planned': return 'bg-gray-50 border-l-gray-400';
    case 'confirmed': return 'bg-blue-50 border-l-blue-400';
    case 'arrived': return 'bg-yellow-50 border-l-yellow-400';
    case 'ready': return 'bg-cyan-50 border-l-cyan-400';
    case 'in_chair': return 'bg-purple-50 border-l-purple-400';
    case 'completed': return 'bg-green-50 border-l-green-400';
    case 'no_show': return 'bg-rose-50 border-l-rose-400';
    case 'cancelled': return 'bg-slate-50 border-l-slate-400';
    default: return 'bg-gray-50 border-l-gray-400';
  }
}

export default function AppointmentCard({ 
  appointment, 
  onClick, 
  className, 
  compact = false 
}: AppointmentCardProps) {
  const startTime = new Date(appointment.starts_at);
  const endTime = new Date(appointment.ends_at);

  return (
    <div
      className={cn(
        "p-3 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md",
        getStatusBackgroundColor(appointment.status),
        compact ? "p-2" : "p-3",
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className={cn(
            "font-medium text-foreground",
            compact ? "text-xs" : "text-sm"
          )}>
            {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
          </span>
        </div>
        <Badge 
          variant="secondary" 
          className={cn(
            getStatusColor(appointment.status),
            compact ? "text-xs px-1.5 py-0.5" : "text-xs"
          )}
        >
          {appointment.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Patient Info */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className={cn(
            "font-medium text-foreground truncate",
            compact ? "text-xs" : "text-sm"
          )} dir="rtl">
            {appointment.patients.arabic_full_name}
          </span>
        </div>
        
        {appointment.patients.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className={cn(
              "text-muted-foreground",
              compact ? "text-xs" : "text-xs"
            )}>
              {appointment.patients.phone}
            </span>
          </div>
        )}
      </div>

      {/* Provider and Room Info */}
      {!compact && (
        <div className="mt-2 space-y-1">
          {appointment.providers && (
            <div className="flex items-center gap-2">
              <Stethoscope className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {appointment.providers.display_name}
                {appointment.providers.specialty && (
                  <span className="ml-1">({appointment.providers.specialty})</span>
                )}
              </span>
            </div>
          )}
          
          {appointment.rooms && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {appointment.rooms.name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Notes preview */}
      {appointment.notes && !compact && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {appointment.notes}
          </p>
        </div>
      )}
    </div>
  );
}