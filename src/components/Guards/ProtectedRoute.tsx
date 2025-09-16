import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, setUser, setProfile, setCurrentClinic, setClinics, setRooms, setLoading } = useAppStore();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);

  // Check auth state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Auth check error:', error);
      }
      
      setUser(user);
      setAuthChecked(true);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        useAppStore.getState().reset();
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  // Fetch profile and ensure clinic setup
  const { data: setupData, isLoading, error } = useQuery({
    queryKey: ['userSetup', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // 1. Get or create profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            role: 'assistant'
          })
          .select()
          .single();

        if (createError) throw createError;
        profile = newProfile;
      } else if (profileError) {
        throw profileError;
      }

      // 2. Get user's clinics
      const { data: staffClinics, error: staffError } = await supabase
        .from('staff_clinics')
        .select(`
          clinic_id,
          clinics (*)
        `)
        .eq('user_id', user.id);

      if (staffError) throw staffError;

      let clinics: any[] = staffClinics?.map((sc: any) => sc.clinics).filter(Boolean) || [];

      // 3. If no clinics, check if any exist in the system
      if (clinics.length === 0) {
        const { data: allClinics, error: allClinicsError } = await supabase
          .from('clinics')
          .select('count');

        if (allClinicsError) throw allClinicsError;

        if ((allClinics[0] as any).count === 0) {
          // Create default clinic
          const { data: newClinic, error: clinicError } = await supabase
            .from('clinics')
            .insert({ name: 'Iconic Main Clinic' })
            .select()
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

          clinics = [newClinic];
        } else {
          // Link to first clinic
          const { data: firstClinic, error: firstClinicError } = await supabase
            .from('clinics')
            .select('*')
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

          clinics = [firstClinic];
        }
      }

      // 4. Set current clinic (from localStorage or first one)
      const savedClinicId = localStorage.getItem('selectedClinicId');
      let currentClinic = clinics.find(c => c.id === savedClinicId) || clinics[0];

      if (!currentClinic) {
        throw new Error('No clinic available for user');
      }

      // 5. Get or create rooms for current clinic
      let { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('clinic_id', currentClinic.id);

      if (roomsError) throw roomsError;

      if (!rooms || rooms.length === 0) {
        const { data: newRoom, error: roomError } = await supabase
          .from('rooms')
          .insert({
            clinic_id: currentClinic.id,
            name: 'Room 1'
          })
          .select();

        if (roomError) throw roomError;
        rooms = newRoom;
      }

      return {
        profile,
        clinics,
        currentClinic,
        rooms
      };
    },
    enabled: !!user && authChecked,
    retry: false,
  });

  // Update app state when data is loaded
  useEffect(() => {
    if (setupData) {
      setProfile(setupData.profile as any);
      setClinics(setupData.clinics as any);
      setCurrentClinic(setupData.currentClinic as any);
      setRooms(setupData.rooms as any);
    }
    setLoading(isLoading);
  }, [setupData, isLoading, setProfile, setClinics, setCurrentClinic, setRooms, setLoading]);

  // Handle setup errors
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Setup Error",
        description: "Failed to initialize your account. Please try logging out and back in.",
      });
    }
  }, [error, toast]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive mb-2">Setup Error</h2>
          <p className="text-muted-foreground mb-4">Failed to initialize your account.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-primary hover:underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}