-- Create a security definer function to check if a user can view another user's profile
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Can always view own profile
    _viewer_id = _target_user_id
    OR
    -- Admins can view all profiles
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _viewer_id AND role = 'admin')
    OR
    -- Everyone can view admin profiles (for support/chat)
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _target_user_id AND role = 'admin')
    OR
    -- Can view profiles of users who share task assignments (same task)
    EXISTS (
      SELECT 1 
      FROM public.task_assignments ta1
      JOIN public.task_assignments ta2 ON ta1.task_id = ta2.task_id
      WHERE ta1.user_id = _viewer_id AND ta2.user_id = _target_user_id
    )
    OR
    -- Can view profiles of users who created tasks assigned to them
    EXISTS (
      SELECT 1
      FROM public.task_assignments ta
      JOIN public.tasks t ON ta.task_id = t.id
      WHERE ta.user_id = _viewer_id AND t.created_by = _target_user_id
    )
    OR
    -- Can view profiles of users assigned to tasks they created
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.task_assignments ta ON t.id = ta.task_id
      WHERE t.created_by = _viewer_id AND ta.user_id = _target_user_id
    )
$$;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles for chat" ON public.profiles;

-- Create a more restrictive policy using the new function
CREATE POLICY "Users can view relevant profiles"
ON public.profiles
FOR SELECT
USING (public.can_view_profile(auth.uid(), user_id));