-- Add app download URL fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS ios_app_url TEXT,
ADD COLUMN IF NOT EXISTS android_app_url TEXT;

-- Add app download URL fields to task_templates table
ALTER TABLE public.task_templates 
ADD COLUMN IF NOT EXISTS ios_app_url TEXT,
ADD COLUMN IF NOT EXISTS android_app_url TEXT;