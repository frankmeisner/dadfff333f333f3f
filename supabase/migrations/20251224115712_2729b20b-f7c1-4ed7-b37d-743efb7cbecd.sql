-- Add demo_viewed_at column to track when employee viewed demo credentials
ALTER TABLE public.task_assignments ADD COLUMN IF NOT EXISTS demo_viewed_at TIMESTAMP WITH TIME ZONE;

-- Add address_proof to document types (this is handled in app code, but we add a comment for clarity)
-- document_type values: 'id_card', 'passport', 'address_proof', etc.