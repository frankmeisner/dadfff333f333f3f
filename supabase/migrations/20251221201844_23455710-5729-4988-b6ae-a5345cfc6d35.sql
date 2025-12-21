-- Add step_notes column to task_assignments for storing notes per step as JSON
ALTER TABLE public.task_assignments
ADD COLUMN IF NOT EXISTS step_notes jsonb DEFAULT '{}'::jsonb;

-- Add admin_notes column for admin status request notes
ALTER TABLE public.task_assignments
ADD COLUMN IF NOT EXISTS admin_notes text;