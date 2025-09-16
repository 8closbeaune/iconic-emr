-- Create clinic_settings table for storing clinic configuration
CREATE TABLE public.clinic_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL UNIQUE REFERENCES public.clinics(id) ON DELETE CASCADE,
  availability jsonb DEFAULT '{}',
  timezone text DEFAULT 'Africa/Cairo',
  slot_minutes integer DEFAULT 15,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for clinic settings (staff can read/write their clinic's settings)
CREATE POLICY "Users can view their clinic settings" 
ON public.clinic_settings 
FOR SELECT 
USING (
  clinic_id IN (
    SELECT sc.clinic_id 
    FROM staff_clinics sc 
    WHERE sc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their clinic settings" 
ON public.clinic_settings 
FOR UPDATE 
USING (
  clinic_id IN (
    SELECT sc.clinic_id 
    FROM staff_clinics sc 
    WHERE sc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their clinic settings" 
ON public.clinic_settings 
FOR INSERT 
WITH CHECK (
  clinic_id IN (
    SELECT sc.clinic_id 
    FROM staff_clinics sc 
    WHERE sc.user_id = auth.uid()
  )
);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_clinic_settings_updated_at
BEFORE UPDATE ON public.clinic_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();