-- Add customer_name column to task_templates
ALTER TABLE public.task_templates
ADD COLUMN customer_name text;