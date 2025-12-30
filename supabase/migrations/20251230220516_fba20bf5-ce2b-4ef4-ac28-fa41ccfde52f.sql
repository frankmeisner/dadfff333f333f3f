-- Add estimated_duration to task_templates (in minutes)
ALTER TABLE public.task_templates ADD COLUMN IF NOT EXISTS estimated_duration integer DEFAULT NULL;

COMMENT ON COLUMN public.task_templates.estimated_duration IS 'Estimated duration in minutes for completing tasks based on this template';