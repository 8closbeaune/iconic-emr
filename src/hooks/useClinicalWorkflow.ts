import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAppStore } from '@/store/appStore';

export interface ClinicalPatient {
  id: string;
  arabic_full_name: string;
  latin_name?: string;
  phone?: string;
  dob?: string;
  status: string;
  age?: number;
  ageBracket: 'Primary' | 'Mixed' | 'Permanent';
}

export interface ClinicalVisit {
  id: string;
  patient_id: string;
  started_at: string;
  ended_at?: string;
  provider_id?: string;
  room_id?: string;
  status: string;
}

export function useClinicalWorkflow(activeVisitId: string | null) {
  // Fetch active visit details
  const { data: activeVisit } = useQuery({
    queryKey: ['clinicalVisit', activeVisitId],
    queryFn: async (): Promise<ClinicalVisit | null> => {
      if (!activeVisitId) return null;
      
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('id', activeVisitId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!activeVisitId,
  });

  // Fetch patient for active visit
  const { data: activePatient } = useQuery({
    queryKey: ['clinicalPatient', activeVisit?.patient_id],
    queryFn: async (): Promise<ClinicalPatient | null> => {
      if (!activeVisit?.patient_id) return null;
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', activeVisit.patient_id)
        .single();
        
      if (error) throw error;
      
      // Calculate age and age bracket
      let age: number | undefined;
      let ageBracket: 'Primary' | 'Mixed' | 'Permanent' = 'Permanent';
      
      if (data.dob) {
        const birthDate = new Date(data.dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (age <= 5) ageBracket = 'Primary';
        else if (age <= 13) ageBracket = 'Mixed';
        else ageBracket = 'Permanent';
      }
      
      return {
        ...data,
        age,
        ageBracket,
      };
    },
    enabled: !!activeVisit?.patient_id,
  });

  return {
    activeVisit,
    activePatient,
  };
}

// Hook for ready queue
export function useReadyQueue() {
  const { profile } = useAppStore();
  return useQuery({
    queryKey: ['readyQueue', profile?.user_id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // Resolve current provider for this user (if any)
      const { data: meProvider } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', profile?.user_id || '')
        .maybeSingle();
      const myProviderId = meProvider?.id || null;

      let query = supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          provider_id,
          starts_at,
          status,
          queue_order,
          patients!inner(
            id,
            arabic_full_name,
            latin_name,
            phone,
            dob,
            status
          ),
          providers(display_name)
        `)
        .eq('patients.status', 'ready')
        .gte('starts_at', today)
        .lt('starts_at', `${today}T23:59:59`)
        .order('queue_order', { ascending: true })
        .order('starts_at', { ascending: true });

      if (myProviderId) {
        query = query.eq('provider_id', myProviderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// Hook for starting a visit
export function useStartVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      appointmentId,
      providerId,
      roomId
    }: {
      patientId: string;
      appointmentId?: string;
      providerId?: string;
      roomId?: string;
    }) => {
      // Check if patient already has active visit
      const { data: existingVisit } = await supabase
        .from('visits')
        .select('id')
        .eq('patient_id', patientId)
        .is('ended_at', null)
        .maybeSingle();

      if (existingVisit) {
        return existingVisit;
      }

      // If providerId not supplied, try from appointment
      let providerToUse = providerId || null;
      let roomToUse = roomId || null;
      if (!providerToUse && appointmentId) {
        const { data: appt } = await supabase
          .from('appointments')
          .select('provider_id, room_id')
          .eq('id', appointmentId)
          .maybeSingle();
        if (appt?.provider_id) providerToUse = appt.provider_id as any;
        if (!roomToUse && appt?.room_id) roomToUse = appt.room_id as any;
      }

      // Create new visit
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId || null,
          provider_id: providerToUse,
          room_id: roomToUse,
          started_at: new Date().toISOString(),
          status: 'in_chair',
        })
        .select('*')
        .single();

      if (visitError) throw visitError;

      // Update patient status
      const { error: patientError } = await supabase
        .from('patients')
        .update({ status: 'in_chair' })
        .eq('id', patientId);

      if (patientError) throw patientError;

      // Update appointment status if provided
      if (appointmentId) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ status: 'in_chair' })
          .eq('id', appointmentId);

        if (appointmentError) throw appointmentError;
      }

      return visit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readyQueue'] });
      queryClient.invalidateQueries({ queryKey: ['clinicalVisit'] });
      toast({ title: 'Visit started successfully' });
    },
    onError: (error) => {
      console.error('Error starting visit:', error);
      toast({
        title: 'Error starting visit',
        description: 'Please try again or contact support.',
        variant: 'destructive'
      });
    },
  });
}
