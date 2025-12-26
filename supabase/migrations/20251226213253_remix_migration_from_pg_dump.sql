CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'employee'
);


--
-- Name: request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: task_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_status AS ENUM (
    'pending',
    'assigned',
    'in_progress',
    'sms_requested',
    'pending_review',
    'completed',
    'cancelled'
);


--
-- Name: time_entry_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.time_entry_type AS ENUM (
    'check_in',
    'check_out',
    'pause_start',
    'pause_end'
);


--
-- Name: accept_task(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_task(_task_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Must be assigned to the current user
  IF NOT EXISTS (
    SELECT 1
    FROM public.task_assignments ta
    WHERE ta.task_id = _task_id
      AND ta.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not assigned';
  END IF;

  -- Mark assignment accepted/in progress
  UPDATE public.task_assignments
  SET accepted_at = COALESCE(accepted_at, now()),
      status = 'in_progress'
  WHERE task_id = _task_id
    AND user_id = auth.uid();

  -- Mark task in progress (admins can see status)
  UPDATE public.tasks
  SET status = 'in_progress',
      updated_at = now()
  WHERE id = _task_id
    AND status = 'assigned';

  -- If task already in progress, keep it as-is
  IF NOT FOUND THEN
    UPDATE public.tasks
    SET status = 'in_progress',
        updated_at = now()
    WHERE id = _task_id
      AND status = 'in_progress';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Task not found or not assignable';
    END IF;
  END IF;
END;
$$;


--
-- Name: approve_task(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_task(_task_id uuid, _review_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_task_title text;
  v_employee_id uuid;
  v_employee_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Must be admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get task info
  SELECT t.title INTO v_task_title
  FROM public.tasks t
  WHERE t.id = _task_id AND t.status = 'pending_review';

  IF v_task_title IS NULL THEN
    RAISE EXCEPTION 'Task not found or not pending review';
  END IF;

  -- Get assigned employee
  SELECT ta.user_id INTO v_employee_id
  FROM public.task_assignments ta
  WHERE ta.task_id = _task_id
  LIMIT 1;

  -- Get employee name for notification
  SELECT COALESCE(NULLIF(trim(p.first_name || ' ' || p.last_name), ''), 'Mitarbeiter')
  INTO v_employee_name
  FROM public.profiles p
  WHERE p.user_id = v_employee_id;

  -- Mark task as completed (approved)
  UPDATE public.tasks
  SET status = 'completed',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = _review_notes,
      updated_at = now()
  WHERE id = _task_id;

  -- Notify employee about approval
  INSERT INTO public.notifications (user_id, title, message, type, related_task_id)
  VALUES (
    v_employee_id,
    'Auftrag genehmigt',
    'Dein Auftrag "' || v_task_title || '" wurde genehmigt. Die Sondervergütung wird verrechnet.',
    'task_approved',
    _task_id
  );
END;
$$;


--
-- Name: complete_task(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_task(_task_id uuid, _progress_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_task_title text;
  v_employee_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Must be assigned to the current user
  IF NOT EXISTS (
    SELECT 1
    FROM public.task_assignments ta
    WHERE ta.task_id = _task_id
      AND ta.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not assigned';
  END IF;

  SELECT t.title
  INTO v_task_title
  FROM public.tasks t
  WHERE t.id = _task_id;

  IF v_task_title IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  SELECT COALESCE(NULLIF(trim(p.first_name || ' ' || p.last_name), ''), 'Ein Mitarbeiter')
  INTO v_employee_name
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  IF v_employee_name IS NULL THEN
    v_employee_name := 'Ein Mitarbeiter';
  END IF;

  -- Mark assignment completed and save notes
  UPDATE public.task_assignments
  SET status = 'completed',
      progress_notes = COALESCE(_progress_notes, progress_notes)
  WHERE task_id = _task_id
    AND user_id = auth.uid();

  -- Mark task as pending_review (instead of completed)
  UPDATE public.tasks
  SET status = 'pending_review',
      updated_at = now()
  WHERE id = _task_id;

  -- Notify admins about task pending review
  PERFORM public.notify_admins_task_completed(_task_id, v_task_title, v_employee_name);
END;
$$;


--
-- Name: delete_task(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_task(_task_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Delete dependent records first
  DELETE FROM public.sms_code_requests WHERE task_id = _task_id;
  DELETE FROM public.documents WHERE task_id = _task_id;
  DELETE FROM public.task_assignments WHERE task_id = _task_id;

  -- Then delete task
  DELETE FROM public.tasks WHERE id = _task_id;
END;
$$;


--
-- Name: get_user_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_profile(_user_id uuid) RETURNS TABLE(id uuid, email text, first_name text, last_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p.id, p.email, p.first_name, p.last_name
  FROM public.profiles p
  WHERE p.user_id = _user_id
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: notify_admins_activity(text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_admins_activity(_activity_type text, _employee_name text, _employee_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  admin_id UUID;
  title_text TEXT;
  message_text TEXT;
BEGIN
  -- Set title and message based on activity type
  CASE _activity_type
    WHEN 'login' THEN
      title_text := 'Mitarbeiter angemeldet';
      message_text := _employee_name || ' hat sich angemeldet.';
    WHEN 'check_in' THEN
      title_text := 'Mitarbeiter eingestempelt';
      message_text := _employee_name || ' hat sich eingestempelt.';
    WHEN 'check_out' THEN
      title_text := 'Mitarbeiter ausgestempelt';
      message_text := _employee_name || ' hat sich ausgestempelt.';
    ELSE
      title_text := 'Mitarbeiter-Aktivität';
      message_text := _employee_name || ' - ' || _activity_type;
  END CASE;

  -- Loop through all admins and create notifications
  FOR admin_id IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_user_id)
    VALUES (
      admin_id,
      title_text,
      message_text,
      'activity',
      _employee_id
    );
  END LOOP;
END;
$$;


--
-- Name: notify_admins_task_completed(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_admins_task_completed(_task_id uuid, _task_title text, _employee_name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Loop through all admins and create notifications
  FOR admin_id IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_task_id, related_user_id)
    VALUES (
      admin_id,
      'Auftrag abgeschlossen',
      _employee_name || ' hat den Auftrag "' || _task_title || '" abgegeben.',
      'task_completed',
      _task_id,
      auth.uid()
    );
  END LOOP;
END;
$$;


--
-- Name: reject_task(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_task(_task_id uuid, _review_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_task_title text;
  v_employee_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Must be admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get task info
  SELECT t.title INTO v_task_title
  FROM public.tasks t
  WHERE t.id = _task_id AND t.status = 'pending_review';

  IF v_task_title IS NULL THEN
    RAISE EXCEPTION 'Task not found or not pending review';
  END IF;

  -- Get assigned employee
  SELECT ta.user_id INTO v_employee_id
  FROM public.task_assignments ta
  WHERE ta.task_id = _task_id
  LIMIT 1;

  -- Mark task as back to in_progress (rejected)
  UPDATE public.tasks
  SET status = 'in_progress',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = _review_notes,
      updated_at = now()
  WHERE id = _task_id;

  -- Reset assignment status
  UPDATE public.task_assignments
  SET status = 'in_progress'
  WHERE task_id = _task_id;

  -- Notify employee about rejection
  INSERT INTO public.notifications (user_id, title, message, type, related_task_id)
  VALUES (
    v_employee_id,
    'Auftrag abgelehnt',
    'Dein Auftrag "' || v_task_title || '" wurde abgelehnt. Grund: ' || COALESCE(_review_notes, 'Keine Angabe'),
    'task_rejected',
    _task_id
  );
END;
$$;


--
-- Name: touch_task_assignment_workflow_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_task_assignment_workflow_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.workflow_updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_status(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_status(new_status text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE profiles SET status = new_status WHERE user_id = auth.uid();
END;
$$;


--
-- Name: validate_task_assignment_workflow_step(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_task_assignment_workflow_step() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.workflow_step < 1 OR NEW.workflow_step > 8 THEN
    RAISE EXCEPTION 'workflow_step must be between 1 and 8';
  END IF;
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_type text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.activity_logs REPLICA IDENTITY FULL;


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid,
    message text NOT NULL,
    is_group_message boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    image_url text,
    updated_at timestamp with time zone,
    is_pinned boolean DEFAULT false NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    task_id uuid,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text NOT NULL,
    file_size integer,
    document_type text DEFAULT 'other'::text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    review_notes text,
    CONSTRAINT documents_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    related_task_id uuid,
    related_user_id uuid,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.notifications REPLICA IDENTITY FULL;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_url text,
    status text DEFAULT 'offline'::text,
    CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['online'::text, 'away'::text, 'busy'::text, 'offline'::text])))
);

ALTER TABLE ONLY public.profiles REPLICA IDENTITY FULL;


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sms_code_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sms_code_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    sms_code text,
    forwarded_at timestamp with time zone,
    forwarded_by uuid,
    status text DEFAULT 'pending'::text NOT NULL
);

ALTER TABLE ONLY public.sms_code_requests REPLICA IDENTITY FULL;


--
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    status text DEFAULT 'assigned'::text,
    progress_notes text,
    workflow_step smallint DEFAULT 1 NOT NULL,
    workflow_digital boolean,
    workflow_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    step_notes jsonb DEFAULT '{}'::jsonb,
    admin_notes text,
    demo_viewed_at timestamp with time zone
);

ALTER TABLE ONLY public.task_assignments REPLICA IDENTITY FULL;


--
-- Name: task_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    design_rating smallint NOT NULL,
    usability_rating smallint NOT NULL,
    overall_rating smallint NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT task_evaluations_design_rating_check CHECK (((design_rating >= 1) AND (design_rating <= 5))),
    CONSTRAINT task_evaluations_overall_rating_check CHECK (((overall_rating >= 1) AND (overall_rating <= 5))),
    CONSTRAINT task_evaluations_usability_rating_check CHECK (((usability_rating >= 1) AND (usability_rating <= 5)))
);


--
-- Name: task_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    priority public.task_priority DEFAULT 'medium'::public.task_priority NOT NULL,
    special_compensation numeric,
    test_email text,
    test_password text,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    customer_name text NOT NULL,
    customer_phone text,
    deadline timestamp with time zone,
    priority public.task_priority DEFAULT 'medium'::public.task_priority NOT NULL,
    status public.task_status DEFAULT 'pending'::public.task_status NOT NULL,
    special_compensation numeric(10,2),
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    test_email text,
    test_password text,
    web_ident_url text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    skip_kyc_sms boolean DEFAULT false
);

ALTER TABLE ONLY public.tasks REPLICA IDENTITY FULL;


--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    entry_type public.time_entry_type NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'employee'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vacation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vacation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    status public.request_status DEFAULT 'pending'::public.request_status NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: sms_code_requests sms_code_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_code_requests
    ADD CONSTRAINT sms_code_requests_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_task_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_id_user_id_key UNIQUE (task_id, user_id);


--
-- Name: task_evaluations task_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_evaluations
    ADD CONSTRAINT task_evaluations_pkey PRIMARY KEY (id);


--
-- Name: task_evaluations task_evaluations_task_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_evaluations
    ADD CONSTRAINT task_evaluations_task_id_user_id_key UNIQUE (task_id, user_id);


--
-- Name: task_templates task_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: vacation_requests vacation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacation_requests
    ADD CONSTRAINT vacation_requests_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_type ON public.activity_logs USING btree (activity_type);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: idx_chat_messages_pinned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_pinned ON public.chat_messages USING btree (is_pinned) WHERE (is_pinned = true);


--
-- Name: idx_documents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_status ON public.documents USING btree (status);


--
-- Name: task_assignments trg_task_assignments_workflow_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_task_assignments_workflow_touch BEFORE UPDATE OF workflow_step, workflow_digital ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.touch_task_assignment_workflow_updated_at();


--
-- Name: task_assignments trg_task_assignments_workflow_validate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_task_assignments_workflow_validate BEFORE INSERT OR UPDATE OF workflow_step ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.validate_task_assignment_workflow_step();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_evaluations update_task_evaluations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_evaluations_updated_at BEFORE UPDATE ON public.task_evaluations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_templates update_task_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON public.task_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documents documents_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: documents documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_related_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_task_id_fkey FOREIGN KEY (related_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sms_code_requests sms_code_requests_forwarded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_code_requests
    ADD CONSTRAINT sms_code_requests_forwarded_by_fkey FOREIGN KEY (forwarded_by) REFERENCES auth.users(id);


--
-- Name: sms_code_requests sms_code_requests_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_code_requests
    ADD CONSTRAINT sms_code_requests_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: sms_code_requests sms_code_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_code_requests
    ADD CONSTRAINT sms_code_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: task_evaluations task_evaluations_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_evaluations
    ADD CONSTRAINT task_evaluations_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: tasks tasks_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: time_entries time_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vacation_requests vacation_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacation_requests
    ADD CONSTRAINT vacation_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: vacation_requests vacation_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacation_requests
    ADD CONSTRAINT vacation_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles Admins can delete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sms_code_requests Admins can manage all sms requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all sms requests" ON public.sms_code_requests USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tasks Admins can manage all tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all tasks" ON public.tasks TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vacation_requests Admins can manage all vacation requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all vacation requests" ON public.vacation_requests USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: task_assignments Admins can manage task assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage task assignments" ON public.task_assignments USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: task_templates Admins can manage task templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage task templates" ON public.task_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: documents Admins can update all documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all documents" ON public.documents FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: activity_logs Admins can view all activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: documents Admins can view all documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all documents" ON public.documents FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: task_evaluations Admins can view all evaluations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all evaluations" ON public.task_evaluations FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins can view all notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: time_entries Admins can view all time entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all time entries" ON public.time_entries FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Authenticated users can view all profiles for chat; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all profiles for chat" ON public.profiles FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: tasks Employees can only view their assigned tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can only view their assigned tasks" ON public.tasks FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.task_assignments
  WHERE ((task_assignments.task_id = tasks.id) AND (task_assignments.user_id = auth.uid())))));


--
-- Name: task_evaluations Users can create own evaluations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own evaluations" ON public.task_evaluations FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: sms_code_requests Users can create sms requests for own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create sms requests for own tasks" ON public.sms_code_requests FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: chat_messages Users can delete own sent messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own sent messages" ON public.chat_messages FOR DELETE TO authenticated USING ((sender_id = auth.uid()));


--
-- Name: activity_logs Users can insert own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own activity logs" ON public.activity_logs FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: documents Users can manage own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own documents" ON public.documents USING ((user_id = auth.uid()));


--
-- Name: push_subscriptions Users can manage own push subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: time_entries Users can manage own time entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own time entries" ON public.time_entries USING ((user_id = auth.uid()));


--
-- Name: vacation_requests Users can manage own vacation requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own vacation requests" ON public.vacation_requests USING ((user_id = auth.uid()));


--
-- Name: chat_messages Users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT WITH CHECK ((sender_id = auth.uid()));


--
-- Name: chat_messages Users can update messages they sent or received; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update messages they sent or received" ON public.chat_messages FOR UPDATE USING (((sender_id = auth.uid()) OR (recipient_id = auth.uid()) OR ((is_group_message = true) AND (auth.uid() IS NOT NULL)))) WITH CHECK (((sender_id = auth.uid()) OR (recipient_id = auth.uid()) OR ((is_group_message = true) AND (auth.uid() IS NOT NULL))));


--
-- Name: task_assignments Users can update own assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own assignments" ON public.task_assignments FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: task_evaluations Users can update own evaluations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own evaluations" ON public.task_evaluations FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: task_assignments Users can view own assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own assignments" ON public.task_assignments FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: task_evaluations Users can view own evaluations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own evaluations" ON public.task_evaluations FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: chat_messages Users can view own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT TO authenticated USING (((sender_id = auth.uid()) OR (recipient_id = auth.uid()) OR ((is_group_message = true) AND (auth.uid() IS NOT NULL))));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: sms_code_requests Users can view own sms requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sms requests" ON public.sms_code_requests FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: sms_code_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sms_code_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: task_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_evaluations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_evaluations ENABLE ROW LEVEL SECURITY;

--
-- Name: task_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: time_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: vacation_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;