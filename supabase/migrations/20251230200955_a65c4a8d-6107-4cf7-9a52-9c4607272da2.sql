-- Update delete_task function to only allow the main admin (fritze admin) to delete tasks
CREATE OR REPLACE FUNCTION public.delete_task(_task_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the email of the current user
  SELECT email INTO v_user_email
  FROM public.profiles
  WHERE user_id = auth.uid();

  -- Only allow the main Fritze admin to delete tasks
  IF v_user_email IS NULL OR v_user_email != 'admin@fritze-it.solutions' THEN
    RAISE EXCEPTION 'Nur der Hauptadministrator kann Aufträge löschen';
  END IF;

  -- Delete dependent records first
  DELETE FROM public.sms_code_requests WHERE task_id = _task_id;
  DELETE FROM public.documents WHERE task_id = _task_id;
  DELETE FROM public.task_assignments WHERE task_id = _task_id;

  -- Then delete task
  DELETE FROM public.tasks WHERE id = _task_id;
END;
$function$;