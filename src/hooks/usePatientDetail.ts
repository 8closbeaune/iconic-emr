import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Patient, PatientStatus } from '@/routes/Patients/types';

// Extended patient interface with related data
export interface PatientDetailData extends Patient {
  age?: number;
  ageBracket: 'Primary' | 'Mixed' | 'Permanent';
  intake?: {
    id: string;
    active_signed: boolean;
    signed_at?: string;
    created_by?: string;
    created_at: string;
  };
  currentVisit?: {
    id: string;
    started_at: string;
    ended_at?: string;
    provider_id?: string;
    room_id?: string;
    status: string;
  };
  nextAppointment?: {
    id: string;
    starts_at: string;
    provider_id?: string;
    room_id?: string;
    status: string;
  };
  stats: {
    xrayCount: number;
    totalBilled: number;
    totalPaid: number;
    currentBalance: number;
  };
}

export function usePatientDetail(patientId: string) {
  return useQuery({
    queryKey: ['patient-detail', patientId],
    queryFn: async (): Promise<PatientDetailData> => {
      // Fetch patient basic data
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError) throw patientError;
      if (!patient) throw new Error('Patient not found');

      // Calculate age and age bracket
      let age: number | undefined;
      let ageBracket: 'Primary' | 'Mixed' | 'Permanent' = 'Permanent';
      
      if (patient.dob) {
        const birthDate = new Date(patient.dob);
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

      // Fetch latest intake form
      const { data: intake } = await supabase
        .from('intake_forms')
        .select('id, active_signed, signed_at, created_by, created_at')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch current/last visit
      const { data: visits } = await supabase
        .from('visits')
        .select('*')
        .eq('patient_id', patientId)
        .order('started_at', { ascending: false })
        .limit(2);

      const currentVisit = visits?.find(v => !v.ended_at);

      // Fetch next appointment
      const { data: nextAppointment } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      // Fetch financial stats
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('patient_id', patientId);

      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .in('invoice_id', 
          (await supabase
            .from('invoices')
            .select('id')
            .eq('patient_id', patientId)
          ).data?.map(inv => inv.id) || []
        );

      // Count X-rays
      const { count: xrayCount } = await supabase
        .from('visit_diagnosis_files')
        .select('id', { count: 'exact' })
        .in('visit_diagnosis_id',
          (await supabase
            .from('visit_diagnoses')
            .select('id')
            .in('visit_id',
              (await supabase
                .from('visits')
                .select('id')
                .eq('patient_id', patientId)
              ).data?.map(v => v.id) || []
            )
          ).data?.map(vd => vd.id) || []
        );

      const totalBilled = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
      const totalPaid = payments?.reduce((sum, pay) => sum + Number(pay.amount), 0) || 0;

      return {
        ...patient,
        age,
        ageBracket,
        intake: intake || undefined,
        currentVisit: currentVisit || undefined,
        nextAppointment: nextAppointment || undefined,
        stats: {
          xrayCount: xrayCount || 0,
          totalBilled,
          totalPaid,
          currentBalance: totalBilled - totalPaid,
        },
      };
    },
    enabled: !!patientId,
    staleTime: 30000, // 30 seconds
  });
}

// Patient status update mutation
export function useUpdatePatientStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, status }: { patientId: string; status: PatientStatus }) => {
      const { error } = await supabase
        .from('patients')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', patientId);

      if (error) throw error;
    },
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['patient-detail', patientId] });
      toast({ title: 'Patient status updated successfully' });
    },
    onError: (error) => {
      console.error('Error updating patient status:', error);
      toast({ 
        title: 'Error updating patient status',
        description: 'Please try again or contact support.',
        variant: 'destructive'
      });
    },
  });
}

// Start visit mutation
export function useStartVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, providerId, roomId }: { 
      patientId: string; 
      providerId?: string; 
      roomId?: string; 
    }) => {
      // Insert new visit
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert({
          patient_id: patientId,
          provider_id: providerId,
          room_id: roomId,
          started_at: new Date().toISOString(),
          status: 'in_chair',
        })
        .select('id')
        .single();

      if (visitError) throw visitError;

      // Update patient status
      const { error: patientError } = await supabase
        .from('patients')
        .update({ status: 'in_chair' })
        .eq('id', patientId);

      if (patientError) throw patientError;

      return visit;
    },
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['patient-detail', patientId] });
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

// End visit mutation
export function useEndVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, visitId }: { patientId: string; visitId: string }) => {
      // End visit
      const { error: visitError } = await supabase
        .from('visits')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', visitId);

      if (visitError) throw visitError;

      // Update patient status to completed
      const { error: patientError } = await supabase
        .from('patients')
        .update({ status: 'completed' })
        .eq('id', patientId);

      if (patientError) throw patientError;
    },
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['patient-detail', patientId] });
      toast({ title: 'Visit ended successfully' });
    },
    onError: (error) => {
      console.error('Error ending visit:', error);
      toast({
        title: 'Error ending visit',
        description: 'Please try again or contact support.',
        variant: 'destructive'
      });
    },
  });
}