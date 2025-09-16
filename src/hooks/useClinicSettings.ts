import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMe } from '@/hooks/useMe';
import { AvailabilityConfig, createDefaultAvailability } from '@/lib/availability';
import { useCallback } from 'react';

export interface ClinicSettings {
  id: string;
  clinic_id: string;
  availability: AvailabilityConfig;
  timezone: string;
  slot_minutes: number;
  created_at: string;
  updated_at: string;
}

interface DbClinicSettings {
  id: string;
  clinic_id: string;
  availability: any; // JSON type from database
  timezone: string;
  slot_minutes: number;
  created_at: string;
  updated_at: string;
}

export function useClinicSettings() {
  const { toast } = useToast();
  const { currentClinic } = useMe();
  const queryClient = useQueryClient();

  // Fetch clinic settings
  const {
    data: settings,
    isLoading,
    error
  } = useQuery({
    queryKey: ['clinic/settings', currentClinic?.id],
    queryFn: async () => {
      if (!currentClinic?.id) throw new Error('No clinic selected');

      const { data, error } = await supabase
        .from('clinic_settings')
        .select('*')
        .eq('clinic_id', currentClinic.id)
        .maybeSingle();

      if (error) throw error;

      // If no settings exist, return default configuration
      if (!data) {
        const defaultAvailability = createDefaultAvailability();
        return {
          id: '',
          clinic_id: currentClinic.id,
          availability: defaultAvailability,
          timezone: defaultAvailability.timezone,
          slot_minutes: defaultAvailability.slot_minutes,
          created_at: '',
          updated_at: ''
        } as ClinicSettings;
      }

      // Convert database record to our typed interface
      const dbData = data as DbClinicSettings;
      return {
        ...dbData,
        availability: dbData.availability as AvailabilityConfig
      } as ClinicSettings;
    },
    enabled: !!currentClinic?.id,
  });

  // Update/create clinic settings
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<ClinicSettings>) => {
      if (!currentClinic?.id) throw new Error('No clinic selected');

      const updateData = {
        clinic_id: currentClinic.id,
        availability: newSettings.availability as any, // Cast to JSON type
        timezone: newSettings.timezone,
        slot_minutes: newSettings.slot_minutes,
      };

      const { data, error } = await supabase
        .from('clinic_settings')
        .upsert(updateData, { onConflict: 'clinic_id' })
        .select()
        .single();

      if (error) throw error;
      
      // Convert database response back to our typed interface
      const dbData = data as DbClinicSettings;
      return {
        ...dbData,
        availability: dbData.availability as AvailabilityConfig
      } as ClinicSettings;
    },
    onSuccess: () => {
      toast({ title: 'Clinic settings saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['clinic/settings', currentClinic?.id] });
    },
    onError: (error) => {
      toast({
        title: 'Error saving clinic settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Debounced save function
  const debouncedSave = useCallback(
    debounce((newSettings: Partial<ClinicSettings>) => {
      updateSettings.mutate(newSettings);
    }, 1000),
    [updateSettings]
  );

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    debouncedSave,
    isUpdating: updateSettings.isPending
  };
}

// Simple debounce implementation
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}