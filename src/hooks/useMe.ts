import React from 'react';
import { useAppStore } from '@/store/appStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/roles';

// Type definitions matching the database
interface Profile {
  user_id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  created_at: string;
  updated_at: string;
  must_change_password?: boolean;
  last_password_reset_at?: string;
}

interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  created_at: string;
}

export function useMe() {
  const { 
    user, 
    profile, 
    clinics, 
    currentClinic, 
    setProfile, 
    setClinics, 
    setCurrentClinic,
    setLoading 
  } = useAppStore();
  const { toast } = useToast();

  // Fetch user profile and clinic data
  const { data: meData, isLoading, error } = useQuery({
    queryKey: ['me', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // 1. Get or create profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, phone, created_at, updated_at, must_change_password, last_password_reset_at')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            role: 'assistant' as UserRole
          })
          .select('user_id, full_name, role, phone, created_at, updated_at, must_change_password, last_password_reset_at')
          .single();

        if (createError) throw createError;
        profileData = newProfile;
      } else if (profileError) {
        throw profileError;
      }

      // 2. Get user's clinics through staff_clinics
      const { data: staffClinics, error: staffError } = await supabase
        .from('staff_clinics')
        .select(`
          clinic_id,
          clinics (
            id,
            name,
            address,
            phone,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (staffError) throw staffError;

      const userClinics: Clinic[] = staffClinics
        ?.map((sc: any) => sc.clinics)
        .filter(Boolean) || [];

      // 3. If no clinics, create default clinic and link user
      if (userClinics.length === 0) {
        const { data: allClinics } = await supabase
          .from('clinics')
          .select('count')
          .single();

        if ((allClinics as any)?.count === 0) {
          // Create default clinic
          const { data: newClinic, error: clinicError } = await supabase
            .from('clinics')
            .insert({ name: 'Iconic Main Clinic' })
            .select('id, name, address, phone, created_at')
            .single();

          if (clinicError) throw clinicError;

          // Link user to clinic
          const { error: staffError } = await supabase
            .from('staff_clinics')
            .insert({
              user_id: user.id,
              clinic_id: newClinic.id
            });

          if (staffError) throw staffError;

          userClinics.push(newClinic);
        } else {
          // Link to first existing clinic
          const { data: firstClinic, error: firstClinicError } = await supabase
            .from('clinics')
            .select('id, name, address, phone, created_at')
            .limit(1)
            .single();

          if (firstClinicError) throw firstClinicError;

          const { error: staffError } = await supabase
            .from('staff_clinics')
            .insert({
              user_id: user.id,
              clinic_id: firstClinic.id
            });

          if (staffError) throw staffError;

          userClinics.push(firstClinic);
        }
      }

      // 4. Determine current clinic
      const savedClinicId = localStorage.getItem('selectedClinicId');
      const selectedClinic = userClinics.find(c => c.id === savedClinicId) || userClinics[0];

      return {
        profile: profileData as Profile,
        clinics: userClinics,
        currentClinic: selectedClinic
      };
    },
    enabled: !!user?.id,
    retry: 1,
  });

  // Update app state when data changes
  React.useEffect(() => {
    if (meData) {
      setProfile(meData.profile);
      setClinics(meData.clinics);
      setCurrentClinic(meData.currentClinic);
    }
    setLoading(isLoading);
  }, [meData, isLoading, setProfile, setClinics, setCurrentClinic, setLoading]);

  // Handle errors
  React.useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to load profile",
        description: "Please try refreshing the page or contact support.",
      });
    }
  }, [error, toast]);

  const switchClinic = (clinic: Clinic) => {
    setCurrentClinic(clinic);
    localStorage.setItem('selectedClinicId', clinic.id);
  };

  return {
    user,
    profile,
    clinics: clinics || [],
    currentClinic,
    switchClinic,
    isLoading,
    error
  };
}