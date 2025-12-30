-- Add tag column to task_templates for custom categorization
ALTER TABLE public.task_templates
ADD COLUMN tag text;