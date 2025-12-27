-- Enable realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Enable realtime for sms_code_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_code_requests;

-- Enable realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;