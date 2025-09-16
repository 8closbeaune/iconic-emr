-- Add must_change_password column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;

-- Add last_password_reset_at column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'last_password_reset_at') THEN
        ALTER TABLE public.profiles 
        ADD COLUMN last_password_reset_at timestamp with time zone;
    END IF;
END $$;