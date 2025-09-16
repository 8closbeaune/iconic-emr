import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';

export interface CalendarAppointment {
  id: string;
  patient_id: string;
  clinic_id: string;
  room_id: string | null;
  provider_id: string | null;
  starts_at: string;
  ends_at: string;
  status: 'planned' | 'confirmed' | 'arrived' | 'ready' | 'in_chair' | 'completed' | 'no_show' | 'cancelled';
  notes: string | null;
  patients: {
    id: string;
    arabic_full_name: string;
    phone: string | null;
  };
  providers: {
    id: string;
    display_name: string;
    specialty: string | null;
  } | null;
  rooms: {
    id: string;
    name: string;
  } | null;
}

export interface CalendarFilters {
  providerId?: string;
  roomId?: string;
  clinicId?: string;
  status?: 'planned' | 'confirmed' | 'arrived' | 'ready' | 'in_chair' | 'completed' | 'no_show' | 'cancelled';
}

export function useCalendarAppointments(
  startDate: Date, 
  endDate: Date, 
  filters: CalendarFilters = {}
) {
  const { currentClinic } = useAppStore();
  
  return useQuery({
    queryKey: ['calendar-appointments', startDate.toISOString(), endDate.toISOString(), filters, currentClinic?.id],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          clinic_id,
          room_id,
          provider_id,
          starts_at,
          ends_at,
          status,
          notes,
          patients!inner(
            id,
            arabic_full_name,
            phone
          ),
          providers(
            id,
            display_name,
            specialty
          ),
          rooms(
            id,
            name
          )
        `)
        .gte('starts_at', startDate.toISOString())
        .lte('starts_at', endDate.toISOString())
        .order('starts_at', { ascending: true });

      // Apply clinic filter
      if (currentClinic?.id) {
        query = query.eq('clinic_id', currentClinic.id);
      }

      // Apply additional filters
      if (filters.providerId) {
        query = query.eq('provider_id', filters.providerId);
      }
      if (filters.roomId) {
        query = query.eq('room_id', filters.roomId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data as CalendarAppointment[]) || [];
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useProviders() {
  const { currentClinic } = useAppStore();
  
  return useQuery({
    queryKey: ['providers', currentClinic?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('id, display_name, specialty, active')
        .eq('active', true)
        .order('display_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRooms() {
  const { currentClinic } = useAppStore();
  
  return useQuery({
    queryKey: ['rooms', currentClinic?.id],
    queryFn: async () => {
      if (!currentClinic?.id) return [];
      
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, is_active')
        .eq('clinic_id', currentClinic.id)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentClinic?.id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (appointmentData: {
      patient_id: string;
      clinic_id: string;
      provider_id?: string;
      room_id?: string;
      starts_at: string;
      ends_at: string;
      status: 'planned' | 'confirmed' | 'arrived' | 'ready' | 'in_chair' | 'completed' | 'no_show' | 'cancelled';
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<CalendarAppointment> 
    }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
    },
  });
}

export function useCheckProviderConflict() {
  return useMutation({
    mutationFn: async ({
      providerId,
      startTime,
      endTime,
      excludeAppointmentId
    }: {
      providerId: string;
      startTime: string;
      endTime: string;
      excludeAppointmentId?: string;
    }) => {
      let query = supabase
        .from('appointments')
        .select('id, starts_at, ends_at')
        .eq('provider_id', providerId)
        .neq('status', 'cancelled')
        .neq('status', 'no_show')
        .or(`and(starts_at.lt.${endTime},ends_at.gt.${startTime})`);

      if (excludeAppointmentId) {
        query = query.neq('id', excludeAppointmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data && data.length > 0;
    },
  });
}