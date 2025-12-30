-- Add sort_order column to task_templates for drag-and-drop sorting
ALTER TABLE public.task_templates 
ADD COLUMN sort_order integer DEFAULT 0;

-- Set initial sort order based on creation date
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.task_templates
)
UPDATE public.task_templates t
SET sort_order = numbered.rn
FROM numbered
WHERE t.id = numbered.id;