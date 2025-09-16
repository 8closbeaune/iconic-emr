import { z } from 'zod';

// Patient status enum matching the database
export type PatientStatus = 
  | 'planned' 
  | 'arrived' 
  | 'ready' 
  | 'in_chair' 
  | 'completed' 
  | 'discharged' 
  | 'no_show' 
  | 'cancelled';

export const PATIENT_STATUSES: PatientStatus[] = [
  'planned',
  'arrived', 
  'ready',
  'in_chair',
  'completed',
  'discharged',
  'no_show',
  'cancelled'
];

export const STATUS_CONFIG: Record<PatientStatus, { label: string; color: string }> = {
  planned: { label: 'Planned', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  arrived: { label: 'Arrived', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  ready: { label: 'Ready', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  in_chair: { label: 'In Chair', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200' },
  discharged: { label: 'Discharged', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  no_show: { label: 'No Show', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-800 border-slate-200' },
};

export interface Patient {
  id: string;
  arabic_full_name: string;
  latin_name?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  profession?: string;
  address?: string;
  reason_for_visit?: string;
  allergies?: string;
  current_meds?: string;
  prior_surgeries?: string;
  smoker?: boolean;
  status: PatientStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientFilters {
  searchTerm: string;
  statuses: PatientStatus[];
  dateFrom?: Date;
  dateTo?: Date;
}

// Validation schemas
export const PatientFormSchema = z.object({
  arabic_full_name: z.string().trim().min(1, 'Arabic name is required'),
  latin_name: z.string().trim().optional(),
  phone: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    const digitsOnly = val.replace(/\D/g, '');
    return digitsOnly.length >= 8 && digitsOnly.length <= 20;
  }, 'Phone must be 8-20 digits'),
  gender: z.string().optional(),
  dob: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return date <= new Date();
  }, 'Date of birth cannot be in the future'),
  profession: z.string().trim().optional(),
  address: z.string().trim().optional(),
  reason_for_visit: z.string().trim().max(2000, 'Maximum 2000 characters').optional(),
  allergies: z.string().trim().max(2000, 'Maximum 2000 characters').optional(),
  current_meds: z.string().trim().max(2000, 'Maximum 2000 characters').optional(),
  prior_surgeries: z.string().trim().max(2000, 'Maximum 2000 characters').optional(),
  smoker: z.boolean().optional(),
});

export type PatientFormData = z.infer<typeof PatientFormSchema>;