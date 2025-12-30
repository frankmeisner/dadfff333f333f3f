-- Add is_favorite column to task_templates for global favorites
ALTER TABLE public.task_templates 
ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;