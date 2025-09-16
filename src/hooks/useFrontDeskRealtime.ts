import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFrontDeskRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen to changes on patients table
    const patientsChannel = supabase
      .channel('patients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients'
        },
        (payload) => {
          console.log('Patient change detected:', payload);
          
          // Invalidate all front desk queries
          queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
          queryClient.invalidateQueries({ queryKey: ['arrived-queue'] });
          queryClient.invalidateQueries({ queryKey: ['ready-queue'] });
          queryClient.invalidateQueries({ queryKey: ['in-chair-queue'] });
          queryClient.invalidateQueries({ queryKey: ['completed-queue'] });
          queryClient.invalidateQueries({ queryKey: ['intake-patients'] });
        }
      )
      .subscribe();

    // Listen to changes on appointments table
    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          console.log('Appointment change detected:', payload);
          
          // Invalidate appointment-related queries
          queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
        }
      )
      .subscribe();

    // Listen to changes on visits table (for in-chair status)
    const visitsChannel = supabase
      .channel('visits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visits'
        },
        (payload) => {
          console.log('Visit change detected:', payload);
          
          // Invalidate visit-related queries
          queryClient.invalidateQueries({ queryKey: ['ready-queue'] });
          queryClient.invalidateQueries({ queryKey: ['in-chair-queue'] });
          queryClient.invalidateQueries({ queryKey: ['completed-queue'] });
        }
      )
      .subscribe();

    // Listen to changes on intake_forms table
    const intakeFormsChannel = supabase
      .channel('intake-forms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intake_forms'
        },
        (payload) => {
          console.log('Intake form change detected:', payload);
          
          // Invalidate queues that depend on intake form status
          queryClient.invalidateQueries({ queryKey: ['arrived-queue'] });
          queryClient.invalidateQueries({ queryKey: ['ready-queue'] });
          queryClient.invalidateQueries({ queryKey: ['intake-patients'] });
        }
      )
      .subscribe();

    // Auto no-show after 1 hour
    const checkNoShows = async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      try {
        const { data: latePatients } = await supabase
          .from('patients')
          .select('id, updated_at')
          .eq('status', 'planned')
          .lte('updated_at', oneHourAgo.toISOString());
        
        if (latePatients && latePatients.length > 0) {
          const patientIds = latePatients.map(p => p.id);
          
          await supabase
            .from('patients')
            .update({ status: 'no_show' })
            .in('id', patientIds);
          
          await supabase
            .from('appointments')
            .update({ status: 'no_show' })
            .in('patient_id', patientIds);
        }
      } catch (error) {
        console.error('Error checking for no-shows:', error);
      }
    };

    // Check for no-shows every 5 minutes
    const noShowInterval = setInterval(checkNoShows, 5 * 60 * 1000);

    // Cleanup function
    return () => {
      supabase.removeChannel(patientsChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(visitsChannel);
      supabase.removeChannel(intakeFormsChannel);
      clearInterval(noShowInterval);
    };
  }, [queryClient]);
}