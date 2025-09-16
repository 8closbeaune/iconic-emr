import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMe } from '@/hooks/useMe';
import type { Patient, PatientFilters, PatientFormData, PatientStatus } from './types';

interface PatientsQueryResult {
  patients: Patient[];
  totalCount: number;
}

interface UsePatientsQueryParams {
  filters: PatientFilters;
  page: number;
  pageSize?: number;
}

export function usePatientsQuery({ filters, page, pageSize = 20 }: UsePatientsQueryParams) {
  return useQuery({
    queryKey: ['patients', { filters, page, pageSize }],
    queryFn: async (): Promise<PatientsQueryResult> => {
      const offset = (page - 1) * pageSize;
      
      let query = supabase
        .from('patients')
        .select('id, arabic_full_name, latin_name, phone, status, created_at, created_by', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Text search (Arabic name or phone)
      if (filters.searchTerm.trim()) {
        const term = filters.searchTerm.trim();
        query = query.or(`arabic_full_name.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      // Status filter
      if (filters.statuses.length > 0 && filters.statuses.length < 8) {
        query = query.in('status', filters.statuses);
      }

      // Date range filter
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      // Pagination
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        patients: data as Patient[],
        totalCount: count || 0
      };
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

export function usePatientQuery(patientId: string | null) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async (): Promise<Patient> => {
      if (!patientId) throw new Error('Patient ID is required');
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (error) throw error;
      return data as Patient;
    },
    enabled: !!patientId,
  });
}

export function useCreatePatientMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useMe();

  return useMutation({
    mutationFn: async (data: PatientFormData): Promise<Patient> => {
      const patientData = {
        arabic_full_name: data.arabic_full_name,
        latin_name: data.latin_name || null,
        phone: data.phone || null,
        gender: data.gender || null,
        dob: data.dob || null,
        profession: data.profession || null,
        address: data.address || null,
        reason_for_visit: data.reason_for_visit || null,
        allergies: data.allergies || null,
        current_meds: data.current_meds || null,
        prior_surgeries: data.prior_surgeries || null,
        smoker: data.smoker || false,
        status: 'planned' as PatientStatus,
        created_by: profile?.user_id,
      };

      const { data: patient, error } = await supabase
        .from('patients')
        .insert(patientData)
        .select('*')
        .single();

      if (error) throw error;
      return patient as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({
        title: 'Patient created',
        description: 'New patient has been added successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create patient',
        description: error.message,
      });
    },
  });
}

export function useUpdatePatientMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ patientId, data }: { patientId: string; data: PatientFormData }): Promise<Patient> => {
      const { data: patient, error } = await supabase
        .from('patients')
        .update(data)
        .eq('id', patientId)
        .select('*')
        .single();

      if (error) throw error;
      return patient as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient'] });
      toast({
        title: 'Patient updated',
        description: 'Patient information has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update patient',
        description: error.message,
      });
    },
  });
}

export function useUpdatePatientStatusMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ patientId, status }: { patientId: string; status: PatientStatus }) => {
      // If setting to 'arrived', auto-skip intake if already signed (move to 'ready')
      let nextStatus: PatientStatus = status;
      if (status === 'arrived') {
        const { data: intakeForm, error: intakeError } = await supabase
          .from('intake_forms')
          .select('id')
          .eq('patient_id', patientId)
          .eq('is_active', true)
          .eq('active_signed', true)
          .maybeSingle();
        if (intakeError) throw intakeError;
        if (intakeForm) {
          nextStatus = 'ready';
        }
      }

      const { error: patientError } = await supabase
        .from('patients')
        .update({ status: nextStatus })
        .eq('id', patientId);
      if (patientError) throw patientError;

      // Keep appointments in sync - map patient status to appointment status
      let appointmentStatus: "planned" | "confirmed" | "arrived" | "ready" | "in_chair" | "completed" | "no_show" | "cancelled" = 
        nextStatus === 'discharged' ? 'completed' : nextStatus as "planned" | "confirmed" | "arrived" | "ready" | "in_chair" | "completed" | "no_show" | "cancelled";
      
      const { error: apptError } = await supabase
        .from('appointments')
        .update({ status: appointmentStatus })
        .eq('patient_id', patientId);
      if (apptError) throw apptError;

      return { nextStatus };
    },
    onSuccess: (data) => {
      // Invalidate patients lists/detail
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient'] });

      // Invalidate front desk/intake related queries
      queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['arrived-queue'] });
      queryClient.invalidateQueries({ queryKey: ['ready-queue'] });
      queryClient.invalidateQueries({ queryKey: ['in-chair-queue'] });
      queryClient.invalidateQueries({ queryKey: ['completed-queue'] });
      queryClient.invalidateQueries({ queryKey: ['intake-patients'] });

      const desc = data?.nextStatus === 'ready'
        ? 'Patient moved to ready (intake already signed).'
        : 'Patient status has been updated successfully.';

      toast({
        title: 'Status updated',
        description: desc,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update status',
        description: error.message,
      });
    },
  });
}

export function usePatientIntakeStatusQuery(patientId: string | null) {
  return useQuery({
    queryKey: ['patient-intake-status', patientId],
    queryFn: async (): Promise<boolean> => {
      if (!patientId) return false;
      
      const { data, error } = await supabase
        .from('intake_forms')
        .select('id')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .eq('active_signed', true)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!patientId,
  });
}

export function useDuplicatePhoneQuery(phone: string | null) {
  return useQuery({
    queryKey: ['duplicate-phone', phone],
    queryFn: async (): Promise<Patient[]> => {
      if (!phone || phone.trim() === '') return [];
      
      const { data, error } = await supabase
        .from('patients')
        .select('id, arabic_full_name, phone, status, created_at')
        .eq('phone', phone.trim())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Patient[];
    },
    enabled: !!phone && phone.trim() !== '',
  });
}
