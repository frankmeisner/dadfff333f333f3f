-- Add status field to profiles for Online/Abwesend/Beschäftigt/Offline
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline'));

-- Add function to update status
CREATE OR REPLACE FUNCTION public.update_user_status(new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET status = new_status WHERE user_id = auth.uid();
END;
$$;