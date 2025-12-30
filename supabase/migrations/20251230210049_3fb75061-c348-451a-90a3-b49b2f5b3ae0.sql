-- =====================================================
-- FIX: Restrict group chat messages to authenticated users with proper checks
-- In this application, group messages are for all employees (company-wide announcements)
-- Only employees (authenticated users with roles) should see group messages
-- =====================================================

-- Drop the existing policies that allow any authenticated user to see group messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update messages they sent or received" ON public.chat_messages;

-- Create more restrictive policy: Users see direct messages + group messages only if they have a role
CREATE POLICY "Users can view own or group messages"
ON public.chat_messages 
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Direct messages where user is sender or recipient
    sender_id = auth.uid() OR 
    recipient_id = auth.uid() OR 
    -- Group messages only for users with valid roles (employees/admins)
    (is_group_message = true AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
    ))
  )
);

-- Create restrictive update policy
CREATE POLICY "Users can update own or received messages"
ON public.chat_messages 
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid() OR 
    -- Group messages can be updated by users with roles (for read receipts, etc.)
    (is_group_message = true AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
    ))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid() OR 
    (is_group_message = true AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
    ))
  )
);