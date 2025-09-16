import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/roles';

// Type definitions matching the database
interface Profile {
  user_id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  created_at: string;
  updated_at: string;
}

interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  created_at: string;
}

interface Room {
  id: string;
  clinic_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface AppState {
  // Auth state
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  
  // Clinic state
  currentClinic: Clinic | null;
  clinics: Clinic[];
  rooms: Room[];
  
  // UI state
  isOnline: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setCurrentClinic: (clinic: Clinic | null) => void;
  setClinics: (clinics: Clinic[]) => void;
  setRooms: (rooms: Room[]) => void;
  setLoading: (loading: boolean) => void;
  setOnline: (online: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  profile: null,
  isLoading: true,
  currentClinic: null,
  clinics: [],
  rooms: [],
  isOnline: navigator.onLine,
  
  // Actions
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setCurrentClinic: (clinic) => {
    set({ currentClinic: clinic });
    if (clinic) {
      localStorage.setItem('selectedClinicId', clinic.id);
    }
  },
  setClinics: (clinics) => set({ clinics }),
  setRooms: (rooms) => set({ rooms }),
  setLoading: (loading) => set({ isLoading: loading }),
  setOnline: (online) => set({ isOnline: online }),
  reset: () => set({
    user: null,
    profile: null,
    currentClinic: null,
    clinics: [],
    rooms: [],
    isLoading: false,
  }),
}));

// Listen for online/offline events
window.addEventListener('online', () => useAppStore.getState().setOnline(true));
window.addEventListener('offline', () => useAppStore.getState().setOnline(false));