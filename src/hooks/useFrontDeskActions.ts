import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';
import { addMinutes, startOfDay, endOfDay } from 'date-fns';

// Search patients hook
export function useSearchPatients(term: string) {
  return useQuery({
    queryKey: ['fd.search', term],
    queryFn: async () => {
      const trimmed = term.trim();
      const normalizedDigits = normalizeArabicDigits(trimmed).replace(/\D/g, '');

      let query = supabase
        .from('patients')
        .select('id, arabic_full_name, phone, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (trimmed.length > 0) {
        // Search by Arabic name OR phone (support Arabic-Indic digits)
        const phoneTerm = normalizedDigits.length > 0 ? normalizedDigits : trimmed;
        query = query.or(`arabic_full_name.ilike.%${trimmed}%,phone.ilike.%${phoneTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    // Always enabled: show latest patients by default, live update as user types
    enabled: true,
  });
}

// Create patient mutation
export function useCreatePatient() {
  const queryClient = useQueryClient();
  const { profile, currentClinic } = useAppStore();
  
  return useMutation({
    mutationFn: async (patientData: {
      arabic_full_name: string;
      phone?: string;
      gender?: string;
      dob?: string;
      profession?: string;
      address?: string;
    }) => {
      const normalizedPhone = patientData.phone ? normalizeArabicDigits(patientData.phone) : undefined;

      const { data, error } = await supabase
        .from('patients')
        .insert({
          ...patientData,
          phone: normalizedPhone,
          status: 'planned',
          clinic_id: currentClinic?.id || null,
          created_by: profile?.user_id || null,
        })
        .select('id, arabic_full_name, phone')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fd.search'] });
    },
  });
}

// Walk-in mutation (legacy)
export function useWalkIn() {
  const queryClient = useQueryClient();
  const { profile, currentClinic } = useAppStore();

  return useMutation({
    mutationFn: async (patientId: string) => {
      // 1) Update patient status to arrived
      const { error: updateError } = await supabase
        .from('patients')
        .update({ status: 'arrived' })
        .eq('id', patientId);

      if (updateError) throw updateError;

      // 2) Check if patient has appointment today
      const today = new Date();
      const startOfDayIso = startOfDay(today).toISOString();
      const endOfDayIso = endOfDay(today).toISOString();

      const { data: todayAppt } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_id', patientId)
        .gte('starts_at', startOfDayIso)
        .lte('starts_at', endOfDayIso)
        .maybeSingle();

      // 3) If no appointment exists, create one
      if (!todayAppt) {
        const now = new Date();
        const endTime = addMinutes(now, 30); // Default 30 minutes slot

        const { error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            patient_id: patientId,
            clinic_id: currentClinic?.id || null,
            starts_at: now.toISOString(),
            ends_at: endTime.toISOString(),
            status: 'arrived',
            overbook: true,
            created_by: profile?.user_id || null,
          });

        if (appointmentError) throw appointmentError;
      }

      return { patientId };
    },
    onSuccess: () => {
      // Invalidate front desk queries
      queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['arrived-queue'] });
      queryClient.invalidateQueries({ queryKey: ['ready-queue'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
    },
  });
}

// Walk-in with provider selection and same-day upsert
export function useWalkInWithProvider() {
  const queryClient = useQueryClient();
  const { profile, currentClinic } = useAppStore();

  return useMutation({
    mutationFn: async ({
      patientId,
      providerId,
      roomId,
      notes,
      slotMinutes = 30,
    }: {
      patientId: string;
      providerId: string;
      roomId?: string;
      notes?: string;
      slotMinutes?: number;
    }) => {
      const now = new Date();
      const ends = addMinutes(now, slotMinutes);

      // Upsert same-day appointment
      const { data: today } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_id', patientId)
        .gte('starts_at', startOfDay(now).toISOString())
        .lte('starts_at', endOfDay(now).toISOString())
        .maybeSingle();

      if (today) {
        const { error: apptErr } = await supabase
          .from('appointments')
          .update({
            provider_id: providerId,
            room_id: roomId || null,
            status: 'arrived',
            starts_at: now.toISOString(),
            ends_at: ends.toISOString(),
            notes: notes || null,
          })
          .eq('id', today.id);
        if (apptErr) throw apptErr;
      } else {
        const { error: apptInsErr } = await supabase
          .from('appointments')
          .insert({
            clinic_id: currentClinic?.id || null,
            patient_id: patientId,
            provider_id: providerId,
            room_id: roomId || null,
            starts_at: now.toISOString(),
            ends_at: ends.toISOString(),
            status: 'arrived',
            notes: notes || null,
            created_by: profile?.user_id || null,
          });
        if (apptInsErr) throw apptInsErr;
      }

      // Update patient status
      const { error: patientErr } = await supabase
        .from('patients')
        .update({ status: 'arrived' })
        .eq('id', patientId);
      if (patientErr) throw patientErr;

      return { providerId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['arrived-queue'] });
      queryClient.invalidateQueries({ queryKey: ['ready-queue'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
    },
  });
}

// Create appointment mutation
export function useCreateAppointmentPlanned() {
  const queryClient = useQueryClient();
  const { profile, currentClinic } = useAppStore();
  
  return useMutation({
    mutationFn: async (appointmentData: {
      patient_id: string;
      provider_id?: string;
      room_id?: string;
      starts_at: string;
      ends_at: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointmentData,
          clinic_id: currentClinic?.id || null,
          status: 'planned',
          created_by: profile?.user_id || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate front desk queries
      queryClient.invalidateQueries({ queryKey: ['fd.todayAppointments'] });
    },
  });
}

// Get patient summary
export function usePatientSummary(patientId: string | null) {
  return useQuery({
    queryKey: ['patient-summary', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id,
          arabic_full_name,
          phone,
          status,
          created_at,
          intake_forms(
            id,
            signed_at,
            is_active
          )
        `)
        .eq('id', patientId)
        .single();
      
      if (error) throw error;
      
      // Get latest intake form
      const latestIntake = data.intake_forms
        ?.filter((form: any) => form.is_active)
        ?.sort((a: any, b: any) => new Date(b.signed_at || 0).getTime() - new Date(a.signed_at || 0).getTime())[0];
      
      return {
        ...data,
        lastIntakeDate: latestIntake?.signed_at || null,
      };
    },
    enabled: !!patientId,
  });
}

// Digits normalization (Arabic-Indic to Latin)
export function normalizeArabicDigits(input: string): string {
  if (!input) return '';
  const arabicZero = '٠'.charCodeAt(0);
  const arabicIndicZero = '۰'.charCodeAt(0);
  return input.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => {
    const code = d.charCodeAt(0);
    const offset = code >= arabicIndicZero ? code - arabicIndicZero : code - arabicZero;
    return String.fromCharCode('0'.charCodeAt(0) + offset);
  });
}

// Utility function to detect if a string looks like a phone number
export function looksLikePhone(term: string): boolean {
  const normalized = normalizeArabicDigits(term);
  const digitsOnly = normalized.replace(/\D/g, '');
  return digitsOnly.length >= 8;
}
