import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, User, Phone, Clock, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface CompletedQueueProps {
  searchTerm: string;
  onPatientSelect: (patientId: string) => void;
}

interface CompletedPatient {
  id: string;
  arabic_full_name: string;
  phone: string | null;
  updated_at: string;
}

export default function CompletedQueue({ searchTerm, onPatientSelect }: CompletedQueueProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['completed-queue', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('patients')
        .select('id, arabic_full_name, phone, updated_at')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`arabic_full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as CompletedPatient[]) || [];
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (patientId: string) => {
      // Update patient status to discharged
      const { error: patientError } = await supabase
        .from('patients')
        .update({ status: 'discharged' })
        .eq('id', patientId);

      if (patientError) throw patientError;

      // Update appointment status if exists
      await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('patient_id', patientId)
        .eq('status', 'completed');
    },
    onSuccess: () => {
      toast({
        title: "Patient discharged",
        description: "Patient checkout completed",
      });
      queryClient.invalidateQueries({ queryKey: ['completed-queue'] });
    },
    onError: (error) => {
      console.error('Error during checkout:', error);
      toast({
        title: "Error",
        description: "Failed to complete checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = (patientId: string) => {
    checkoutMutation.mutate(patientId);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No completed visits</p>
        {searchTerm && (
          <p className="text-xs mt-1">No results for "{searchTerm}"</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {patients.map((patient) => (
        <div
          key={patient.id}
          className="bg-background border rounded-lg p-3 hover:bg-muted/50 transition-colors"
        >
          {/* Status */}
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
              Completed
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(patient.updated_at))} ago</span>
            </div>
          </div>

          {/* Patient Info */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <h3 className="font-medium text-sm truncate">
                  {patient.arabic_full_name}
                </h3>
              </div>
              
              {patient.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{patient.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleCheckout(patient.id)}
              disabled={checkoutMutation.isPending}
              className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              <CreditCard className="mr-1 h-3 w-3" />
              Checkout
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPatientSelect(patient.id)}
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