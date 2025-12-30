-- Add base authentication policy to profiles table
-- This ensures unauthenticated users cannot access any profile data
CREATE POLICY "Require authentication for profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);