import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Phone, Clock, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface TodayAppointmentsProps {
  searchTerm: string;
  onPatientSelect: (patientId: string) => void;
}

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  patients: {
    id: string;
    arabic_full_name: string;
    phone: string | null;
    status: string;
  };
}

export default function TodayAppointments({ searchTerm, onPatientSelect }: TodayAppointmentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['today-appointments', searchTerm],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      let query = supabase
        .from('appointments')
        .select(`
          id,
          starts_at,
          ends_at,
          status,
          patients!inner(
            id,
            arabic_full_name,
            phone,
            status
          )
        `)
        .gte('starts_at', startOfDay.toISOString())
        .lte('starts_at', endOfDay.toISOString())
        .eq('status', 'planned')
        .order('starts_at', { ascending: true });

      if (searchTerm) {
        query = query.or(`patients.arabic_full_name.ilike.%${searchTerm}%,patients.phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as Appointment[]) || [];
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (patientId: string) => {
      // Check if patient has signed intake form
      const { data: intakeForm } = await supabase
        .from('intake_forms')
        .select('id')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .eq('active_signed', true)
        .maybeSingle();

      const newStatus = intakeForm ? 'ready' : 'arrived';

      // Update patient status
      const { error: patientError } = await supabase
        .from('patients')
        .update({ status: newStatus })
        .eq('id', patientId);

      if (patientError) throw patientError;

      // Update appointment status
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('patient_id', patientId);

      if (appointmentError) throw appointmentError;

      return { status: newStatus };
    },
    onSuccess: (data) => {
      const statusMessage = data.status === 'ready' 
        ? "Patient moved to ready queue (intake already signed)"
        : "Patient moved to arrived queue";
      
      toast({
        title: "Patient checked in",
        description: statusMessage,
      });
      queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['arrived-queue'] });
      queryClient.invalidateQueries({ queryKey: ['ready-queue'] });
    },
    onError: (error) => {
      console.error('Error checking in patient:', error);
      toast({
        title: "Error",
        description: "Failed to check in patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'arrived': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'in_chair': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'no_show': return 'bg-rose-100 text-rose-800';
      case 'cancelled': return 'bg-slate-100 text-slate-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No appointments scheduled for today</p>
        {searchTerm && (
          <p className="text-xs mt-1">No results for "{searchTerm}"</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {appointments.map((appointment) => (
        <div
          key={appointment.id}
          className="flex-shrink-0 w-64 bg-background border rounded-lg p-3 hover:bg-muted/50 transition-colors"
        >
          {/* Time and Status */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(new Date(appointment.starts_at), 'h:mm a')}
              </span>
            </div>
            <Badge variant="secondary" className={getStatusColor(appointment.status)}>
              {appointment.status}
            </Badge>
          </div>

          {/* Patient Info */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="font-medium text-sm truncate">
                {appointment.patients.arabic_full_name}
              </h3>
            </div>
            
            {appointment.patients.phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{appointment.patients.phone}</span>
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(appointment.starts_at), 'h:mm a')} - {format(new Date(appointment.ends_at), 'h:mm a')}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {appointment.status === 'planned' && (
              <Button
                size="sm"
                onClick={() => checkInMutation.mutate(appointment.patients.id)}
                disabled={checkInMutation.isPending}
                className="flex-1 text-xs"
              >
                <UserCheck className="mr-1 h-3 w-3" />
                Check In
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPatientSelect(appointment.patients.id)}
              className="text-xs"
            >
              <User className="mr-1 h-3 w-3" />
              View
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}