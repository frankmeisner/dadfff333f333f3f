-- =====================================================
-- FIX: Replace public storage policies with authenticated ones
-- =====================================================

-- Drop insecure public policies
DROP POLICY IF EXISTS "Avatar images are public" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;

-- Add secure authenticated policies for avatars
CREATE POLICY "Authenticated users can view avatars"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' AND
  auth.uid() IS NOT NULL
);

-- Add secure authenticated policy for chat images
CREATE POLICY "Authenticated users can view chat images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-images' AND
  auth.uid() IS NOT NULL
);

-- Update documents view policy to include admin access
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents or admins all"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  ((storage.foldername(name))[1] = auth.uid()::text OR
   public.has_role(auth.uid(), 'admin'))
);

-- Drop redundant admin-only documents policy (now combined above)
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;