import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMe } from '@/hooks/useMe';

export interface StaffProfile {
  user_id: string;
  full_name?: string;
  phone?: string;
  role: 'admin' | 'doctor' | 'assistant' | 'receptionist' | 'intake';
  staff_code?: string;
  created_at: string;
  staff_clinics?: { clinic_id: string; clinics: { name: string } }[];
}

export interface ProviderProfile {
  id: string;
  display_name: string;
  specialty?: string;
  active: boolean;
  user_id?: string;
  created_at: string;
  profiles?: { full_name?: string };
}

export interface Room {
  id: string;
  name: string;
  is_active: boolean;
  clinic_id: string;
  created_at: string;
}

export interface Diagnosis {
  id: string;
  name_en: string;
  name_ar?: string;
  code?: string;
  active: boolean;
  created_at: string;
}

export interface Treatment {
  id: string;
  name_en: string;
  name_ar?: string;
  code?: string;
  active: boolean;
  created_at: string;
}

export interface DiagnosisRule {
  diagnosis_id: string;
  requires_tooth: boolean;
  xray_required: boolean;
  default_treatment_id?: string;
}

export interface AuditLogEntry {
  id: number;
  table_name: string;
  row_pk?: string;
  operation: string;
  changed_by?: string;
  changed_at: string;
  old_data?: any;
  new_data?: any;
}

export function useAdmin() {
  const { toast } = useToast();
  const { profile, currentClinic } = useMe();
  const queryClient = useQueryClient();

  // Staff management
  const useStaff = () => {
    return useQuery({
      queryKey: ['admin-staff'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at');

        if (error) throw error;
        return data as StaffProfile[];
      },
    });
  };

  // Providers management
  const useProviders = () => {
    return useQuery({
      queryKey: ['admin-providers'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('providers')
          .select(`
            *,
            profiles(full_name)
          `)
          .order('display_name');

        if (error) throw error;
        return data as ProviderProfile[];
      },
    });
  };

  // Rooms management
  const useRooms = () => {
    return useQuery({
      queryKey: ['admin-rooms', currentClinic?.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('clinic_id', currentClinic?.id)
          .order('name');

        if (error) throw error;
        return data as Room[];
      },
      enabled: !!currentClinic?.id,
    });
  };

  // Diagnoses management
  const useDiagnoses = () => {
    return useQuery({
      queryKey: ['admin-diagnoses'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('diagnoses')
          .select('*')
          .order('name_en');

        if (error) throw error;
        return data as Diagnosis[];
      },
    });
  };

  // Treatments management
  const useTreatments = () => {
    return useQuery({
      queryKey: ['admin-treatments'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('treatments')
          .select('*')
          .order('name_en');

        if (error) throw error;
        return data as Treatment[];
      },
    });
  };

  // Diagnosis rules
  const useDiagnosisRules = () => {
    return useQuery({
      queryKey: ['admin-diagnosis-rules'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('diagnosis_rules')
          .select('*');

        if (error) throw error;
        return data as DiagnosisRule[];
      },
    });
  };

  // Audit log
  const useAuditLog = (dateFrom?: string, dateTo?: string, table?: string, userId?: string) => {
    return useQuery({
      queryKey: ['admin-audit-log', dateFrom, dateTo, table, userId],
      queryFn: async () => {
        let query = supabase
          .from('audit_log')
          .select(`
            *,
            profiles!audit_log_changed_by_fkey(full_name)
          `)
          .order('changed_at', { ascending: false })
          .limit(1000);

        if (dateFrom) query = query.gte('changed_at', dateFrom);
        if (dateTo) query = query.lte('changed_at', dateTo + 'T23:59:59');
        if (table) query = query.eq('table_name', table);
        if (userId) query = query.eq('changed_by', userId);

        const { data, error } = await query;
        if (error) throw error;
        return data as (AuditLogEntry & { profiles?: { full_name?: string } })[];
      },
    });
  };

  // Create staff user (via edge function)
  const createStaffUser = useMutation({
    mutationFn: async (userData: {
      staff_code: string;
      full_name: string;
      role: string;
      temp_password: string;
      phone?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: userData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Staff user created successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating staff user',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reset staff password (via edge function)
  const resetStaffPassword = useMutation({
    mutationFn: async (data: { user_id: string; temp_password: string }) => {
      const { data: result, error } = await supabase.functions.invoke('admin-reset-password', {
        body: data,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({ title: 'Password reset successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Error resetting password',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update staff role
  const updateStaffRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'doctor' | 'assistant' | 'receptionist' | 'intake' }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Staff role updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (error) => {
      toast({
        title: 'Error updating staff role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete staff user
  const deleteStaffUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Staff member deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting staff member',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create provider
  const createProvider = useMutation({
    mutationFn: async (provider: Omit<ProviderProfile, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('providers')
        .insert(provider)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Provider created successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating provider',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update provider
  const updateProvider = useMutation({
    mutationFn: async ({ id, ...provider }: Partial<ProviderProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from('providers')
        .update(provider)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Provider updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
    },
    onError: (error) => {
      toast({
        title: 'Error updating provider',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create room
  const createRoom = useMutation({
    mutationFn: async (room: Omit<Room, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          ...room,
          clinic_id: currentClinic?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Room created successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating room',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update room
  const updateRoom = useMutation({
    mutationFn: async ({ id, ...room }: Partial<Room> & { id: string }) => {
      const { data, error } = await supabase
        .from('rooms')
        .update(room)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Room updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
    },
    onError: (error) => {
      toast({
        title: 'Error updating room',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create diagnosis
  const createDiagnosis = useMutation({
    mutationFn: async (diagnosis: Omit<Diagnosis, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('diagnoses')
        .insert(diagnosis)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Diagnosis created successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-diagnoses'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating diagnosis',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update diagnosis
  const updateDiagnosis = useMutation({
    mutationFn: async ({ id, ...diagnosis }: Partial<Diagnosis> & { id: string }) => {
      const { data, error } = await supabase
        .from('diagnoses')
        .update(diagnosis)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Diagnosis updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-diagnoses'] });
    },
    onError: (error) => {
      toast({
        title: 'Error updating diagnosis',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create treatment
  const createTreatment = useMutation({
    mutationFn: async (treatment: Omit<Treatment, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('treatments')
        .insert(treatment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Treatment created successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-treatments'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating treatment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update treatment
  const updateTreatment = useMutation({
    mutationFn: async ({ id, ...treatment }: Partial<Treatment> & { id: string }) => {
      const { data, error } = await supabase
        .from('treatments')
        .update(treatment)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Treatment updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-treatments'] });
    },
    onError: (error) => {
      toast({
        title: 'Error updating treatment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    useStaff,
    useProviders,
    useRooms,
    useDiagnoses,
    useTreatments,
    useDiagnosisRules,
    useAuditLog,
    createStaffUser,
    resetStaffPassword,
    updateStaffRole,
    deleteStaffUser,
    createProvider,
    updateProvider,
    createRoom,
    updateRoom,
    createDiagnosis,
    updateDiagnosis,
    createTreatment,
    updateTreatment,
  };
}