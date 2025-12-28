-- Enable realtime for additional tables used throughout the panel
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vacation_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_evaluations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Ensure UPDATE/DELETE events include full old row data where the app relies on payload.old
ALTER TABLE public.task_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.documents REPLICA IDENTITY FULL;
ALTER TABLE public.sms_code_requests REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.time_entries REPLICA IDENTITY FULL;
ALTER TABLE public.vacation_requests REPLICA IDENTITY FULL;
ALTER TABLE public.task_evaluations REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;