-- Migration: Academy Improvements
-- Adds exercise catalog and supports multiple days per workout

-- 1. Create exercise catalog table
CREATE TABLE IF NOT EXISTS public.exercise_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_muscle_group TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for exercise_catalog
ALTER TABLE public.exercise_catalog ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for exercise_catalog
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'exercise_catalog' AND policyname = 'Users can manage their own catalog exercises'
    ) THEN
        CREATE POLICY "Users can manage their own catalog exercises" 
        ON public.exercise_catalog 
        FOR ALL 
        TO authenticated 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 2. Add days_of_week to workouts table
-- This allows a single workout plan to be assigned to multiple days
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS days_of_week INTEGER[] DEFAULT '{}';

-- 3. Add catalog_exercise_id to workout_exercises table
-- Links specific workout instances to the global catalog
ALTER TABLE public.workout_exercises 
ADD COLUMN IF NOT EXISTS catalog_exercise_id UUID REFERENCES public.exercise_catalog(id) ON DELETE SET NULL;

-- Create index for catalog_exercise_id
CREATE INDEX IF NOT EXISTS idx_workout_exercises_catalog_id ON public.workout_exercises(catalog_exercise_id);
