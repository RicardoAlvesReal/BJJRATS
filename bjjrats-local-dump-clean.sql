--
-- PostgreSQL database dump
--

\restrict J0pKv23dECKy4B7jiDcoDzq5YZkWBttvkRpRZnQkX0IPSU1cFVmOOlxcbqEkpX2

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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

ALTER TABLE IF EXISTS ONLY public.whatsapp_instances DROP CONSTRAINT IF EXISTS whatsapp_instances_professor_uid_fkey;
ALTER TABLE IF EXISTS ONLY public.user_achievements DROP CONSTRAINT IF EXISTS user_achievements_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.trainings DROP CONSTRAINT IF EXISTS trainings_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_plans_id_fk;
ALTER TABLE IF EXISTS ONLY public.promotions DROP CONSTRAINT IF EXISTS promotions_student_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.promotions DROP CONSTRAINT IF EXISTS promotions_professor_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.posts DROP CONSTRAINT IF EXISTS posts_author_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_student_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_professor_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_to_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.goals DROP CONSTRAINT IF EXISTS goals_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.extra_trainings DROP CONSTRAINT IF EXISTS extra_trainings_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_creator_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.enrollments DROP CONSTRAINT IF EXISTS enrollments_student_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.enrollments DROP CONSTRAINT IF EXISTS enrollments_professor_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.competitions DROP CONSTRAINT IF EXISTS competitions_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.comments DROP CONSTRAINT IF EXISTS comments_post_id_posts_id_fk;
ALTER TABLE IF EXISTS ONLY public.comments DROP CONSTRAINT IF EXISTS comments_author_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.class_schedules DROP CONSTRAINT IF EXISTS class_schedules_professor_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.class_check_ins DROP CONSTRAINT IF EXISTS class_check_ins_student_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.class_check_ins DROP CONSTRAINT IF EXISTS class_check_ins_schedule_id_class_schedules_id_fk;
ALTER TABLE IF EXISTS ONLY public.challenges DROP CONSTRAINT IF EXISTS challenges_creator_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.announcement_dismissals DROP CONSTRAINT IF EXISTS announcement_dismissals_user_uid_fkey;
ALTER TABLE IF EXISTS ONLY public.announcement_dismissals DROP CONSTRAINT IF EXISTS announcement_dismissals_announcement_id_fkey;
ALTER TABLE IF EXISTS ONLY public.academy_student_professor_assignments DROP CONSTRAINT IF EXISTS academy_student_professor_assignments_student_uid_fkey;
ALTER TABLE IF EXISTS ONLY public.academy_student_professor_assignments DROP CONSTRAINT IF EXISTS academy_student_professor_assignments_professor_uid_fkey;
ALTER TABLE IF EXISTS ONLY public.academy_student_professor_assignments DROP CONSTRAINT IF EXISTS academy_student_professor_assignments_created_by_uid_fkey;
ALTER TABLE IF EXISTS ONLY public.academy_student_professor_assignments DROP CONSTRAINT IF EXISTS academy_student_professor_assignments_academy_uid_fkey;
ALTER TABLE IF EXISTS ONLY public.academy_requests DROP CONSTRAINT IF EXISTS academy_requests_student_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.academy_requests DROP CONSTRAINT IF EXISTS academy_requests_professor_uid_users_uid_fk;
ALTER TABLE IF EXISTS ONLY public.academy_professor_links DROP CONSTRAINT IF EXISTS academy_professor_links_professor_uid_fkey;
ALTER TABLE IF EXISTS ONLY public.academy_professor_links DROP CONSTRAINT IF EXISTS academy_professor_links_created_by_uid_fkey;
ALTER TABLE IF EXISTS ONLY public.academy_professor_links DROP CONSTRAINT IF EXISTS academy_professor_links_academy_uid_fkey;
DROP INDEX IF EXISTS public.idx_announcement_dismissal;
DROP INDEX IF EXISTS public.idx_academy_student_professor_assignment;
DROP INDEX IF EXISTS public.idx_academy_professor_link;
ALTER TABLE IF EXISTS ONLY public.whatsapp_instances DROP CONSTRAINT IF EXISTS whatsapp_instances_professor_uid_key;
ALTER TABLE IF EXISTS ONLY public.whatsapp_instances DROP CONSTRAINT IF EXISTS whatsapp_instances_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_unique;
ALTER TABLE IF EXISTS ONLY public.user_achievements DROP CONSTRAINT IF EXISTS user_achievements_pkey;
ALTER TABLE IF EXISTS ONLY public.trainings DROP CONSTRAINT IF EXISTS trainings_pkey;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE IF EXISTS ONLY public.promotions DROP CONSTRAINT IF EXISTS promotions_pkey;
ALTER TABLE IF EXISTS ONLY public.posts DROP CONSTRAINT IF EXISTS posts_pkey;
ALTER TABLE IF EXISTS ONLY public.plans DROP CONSTRAINT IF EXISTS plans_slug_unique;
ALTER TABLE IF EXISTS ONLY public.plans DROP CONSTRAINT IF EXISTS plans_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.goals DROP CONSTRAINT IF EXISTS goals_pkey;
ALTER TABLE IF EXISTS ONLY public.extra_trainings DROP CONSTRAINT IF EXISTS extra_trainings_pkey;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_pkey;
ALTER TABLE IF EXISTS ONLY public.enrollments DROP CONSTRAINT IF EXISTS enrollments_pkey;
ALTER TABLE IF EXISTS ONLY public.competitions DROP CONSTRAINT IF EXISTS competitions_pkey;
ALTER TABLE IF EXISTS ONLY public.comments DROP CONSTRAINT IF EXISTS comments_pkey;
ALTER TABLE IF EXISTS ONLY public.class_schedules DROP CONSTRAINT IF EXISTS class_schedules_pkey;
ALTER TABLE IF EXISTS ONLY public.class_check_ins DROP CONSTRAINT IF EXISTS class_check_ins_pkey;
ALTER TABLE IF EXISTS ONLY public.challenges DROP CONSTRAINT IF EXISTS challenges_pkey;
ALTER TABLE IF EXISTS ONLY public.announcements DROP CONSTRAINT IF EXISTS announcements_pkey;
ALTER TABLE IF EXISTS ONLY public.announcement_dismissals DROP CONSTRAINT IF EXISTS announcement_dismissals_pkey;
ALTER TABLE IF EXISTS ONLY public.academy_student_professor_assignments DROP CONSTRAINT IF EXISTS academy_student_professor_assignments_pkey;
ALTER TABLE IF EXISTS ONLY public.academy_requests DROP CONSTRAINT IF EXISTS academy_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.academy_professor_links DROP CONSTRAINT IF EXISTS academy_professor_links_pkey;
ALTER TABLE IF EXISTS ONLY drizzle.__drizzle_migrations DROP CONSTRAINT IF EXISTS __drizzle_migrations_pkey;
ALTER TABLE IF EXISTS drizzle.__drizzle_migrations ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.whatsapp_instances;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_achievements;
DROP TABLE IF EXISTS public.trainings;
DROP TABLE IF EXISTS public.subscriptions;
DROP TABLE IF EXISTS public.settings;
DROP TABLE IF EXISTS public.promotions;
DROP TABLE IF EXISTS public.posts;
DROP TABLE IF EXISTS public.plans;
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.goals;
DROP TABLE IF EXISTS public.extra_trainings;
DROP TABLE IF EXISTS public.events;
DROP TABLE IF EXISTS public.enrollments;
DROP TABLE IF EXISTS public.competitions;
DROP TABLE IF EXISTS public.comments;
DROP TABLE IF EXISTS public.class_schedules;
DROP TABLE IF EXISTS public.class_check_ins;
DROP TABLE IF EXISTS public.challenges;
DROP TABLE IF EXISTS public.announcements;
DROP TABLE IF EXISTS public.announcement_dismissals;
DROP TABLE IF EXISTS public.academy_student_professor_assignments;
DROP TABLE IF EXISTS public.academy_requests;
DROP TABLE IF EXISTS public.academy_professor_links;
DROP SEQUENCE IF EXISTS drizzle.__drizzle_migrations_id_seq;
DROP TABLE IF EXISTS drizzle.__drizzle_migrations;
DROP SCHEMA IF EXISTS drizzle;
--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: academy_professor_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academy_professor_links (
    id text NOT NULL,
    academy_uid text NOT NULL,
    professor_uid text NOT NULL,
    relation_type text DEFAULT 'internal'::text NOT NULL,
    status text DEFAULT 'active'::text,
    notes text,
    created_by_uid text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    partner_revenue_share_percent real,
    partner_revenue_notes text
);


--
-- Name: academy_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academy_requests (
    id text NOT NULL,
    student_uid text NOT NULL,
    student_name text,
    student_email text,
    student_photo text,
    student_belt text,
    professor_uid text NOT NULL,
    academy_name text,
    status text DEFAULT 'pending'::text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: academy_student_professor_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academy_student_professor_assignments (
    id text NOT NULL,
    academy_uid text NOT NULL,
    professor_uid text NOT NULL,
    student_uid text NOT NULL,
    relation_type text DEFAULT 'internal'::text NOT NULL,
    status text DEFAULT 'active'::text,
    student_name text,
    professor_name text,
    notes text,
    created_by_uid text,
    decided_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: announcement_dismissals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcement_dismissals (
    id text NOT NULL,
    announcement_id text NOT NULL,
    user_uid text NOT NULL,
    dismissed_at timestamp without time zone DEFAULT now()
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    image_url text,
    link_url text,
    link_text text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    source_uid text,
    source_name text,
    source_role text,
    scope text DEFAULT 'global'::text,
    audience text DEFAULT 'all'::text,
    target_academy_id text,
    target_professor_uid text,
    urgent boolean DEFAULT false
);


--
-- Name: challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenges (
    id text NOT NULL,
    creator_uid text NOT NULL,
    academy_id text,
    title text NOT NULL,
    description text,
    target integer DEFAULT 1,
    unit text DEFAULT 'treinos'::text,
    start_date text,
    end_date text,
    media_url text,
    is_public boolean DEFAULT true,
    participants jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: class_check_ins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_check_ins (
    id text NOT NULL,
    schedule_id text,
    academy_id text NOT NULL,
    student_uid text NOT NULL,
    check_in_date text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: class_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_schedules (
    id text NOT NULL,
    academy_id text NOT NULL,
    professor_uid text NOT NULL,
    day_of_week integer,
    start_time text,
    end_time text,
    class_name text,
    modality text,
    created_at timestamp without time zone DEFAULT now(),
    days jsonb DEFAULT '[]'::jsonb,
    "time" text,
    type text,
    mode text,
    publico text,
    duration_min integer,
    notes text
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id text NOT NULL,
    post_id text NOT NULL,
    author_uid text NOT NULL,
    author_name text,
    author_photo text,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: competitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitions (
    id text NOT NULL,
    uid text NOT NULL,
    name text NOT NULL,
    date text,
    location text,
    category text,
    weight_class text,
    result text DEFAULT 'gold'::text,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id text NOT NULL,
    professor_uid text NOT NULL,
    professor_name text,
    academy_name text,
    student_uid text NOT NULL,
    student_name text,
    monthly_fee real DEFAULT 0,
    due_day integer DEFAULT 1,
    status text DEFAULT 'active'::text,
    pix_key text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id text NOT NULL,
    creator_uid text NOT NULL,
    academy_id text,
    title text NOT NULL,
    description text,
    event_date text,
    event_time text,
    location text,
    media_url text,
    is_public boolean DEFAULT true,
    rsvps jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    type text DEFAULT 'outro'::text,
    slots integer,
    price text,
    duration text,
    academy_name text,
    academy_logo text,
    registration_names jsonb DEFAULT '{}'::jsonb,
    registration_belts jsonb DEFAULT '{}'::jsonb,
    registrations_closed boolean DEFAULT false,
    location_cep text,
    location_address text,
    location_number text,
    location_neighborhood text,
    location_city text,
    location_state text,
    location_latitude real,
    location_longitude real
);


--
-- Name: extra_trainings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.extra_trainings (
    id text NOT NULL,
    uid text NOT NULL,
    training_date text NOT NULL,
    activity text,
    duration integer NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goals (
    id text NOT NULL,
    uid text NOT NULL,
    title text NOT NULL,
    target integer DEFAULT 0,
    unit text DEFAULT 'treinos'::text,
    period text DEFAULT 'weekly'::text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    to_uid text NOT NULL,
    from_uid text,
    from_name text,
    type text,
    message text NOT NULL,
    data jsonb,
    read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id text NOT NULL,
    professor_uid text NOT NULL,
    student_uid text NOT NULL,
    student_name text,
    student_email text,
    amount real NOT NULL,
    due_date timestamp without time zone,
    paid_at timestamp without time zone,
    status text DEFAULT 'pending'::text,
    pix_link text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    price real NOT NULL,
    role_assigned text NOT NULL,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    trial_days integer DEFAULT 0
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id text NOT NULL,
    author_uid text NOT NULL,
    author_name text,
    author_photo text,
    author_belt text,
    content text,
    media_url text,
    media_type text,
    post_type text DEFAULT 'community'::text,
    academy_id text,
    training_data jsonb,
    likes jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    academy_name text,
    academy_logo text
);


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions (
    id text NOT NULL,
    professor_uid text NOT NULL,
    student_uid text NOT NULL,
    student_name text,
    from_belt text,
    to_belt text,
    from_stripes integer,
    to_stripes integer,
    notes text,
    promoted_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value text NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id text NOT NULL,
    user_uid text NOT NULL,
    plan_id text NOT NULL,
    status text DEFAULT 'active'::text,
    asaas_id text,
    asaas_customer_id text,
    current_period_start timestamp without time zone,
    current_period_end timestamp without time zone,
    trial_ends_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: trainings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainings (
    id text NOT NULL,
    uid text NOT NULL,
    training_date text NOT NULL,
    session_type text,
    modality text,
    duration integer NOT NULL,
    intensity integer,
    satisfaction integer,
    techniques jsonb DEFAULT '{}'::jsonb,
    notes text,
    academy text,
    professor text,
    training_photo_url text,
    xp integer DEFAULT 0,
    extra_data jsonb,
    comp_data jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id text NOT NULL,
    uid text NOT NULL,
    achievement_id text NOT NULL,
    unlocked_at timestamp without time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    uid text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    photo text,
    belt text DEFAULT 'Branca'::text NOT NULL,
    stripes integer DEFAULT 0,
    academy text DEFAULT ''::text,
    academy_id text,
    professor text DEFAULT ''::text,
    dob text,
    sex text,
    weight_kg text,
    height_cm text,
    phone text,
    address text,
    bjj_since text,
    xp integer DEFAULT 0,
    total_trainings integer DEFAULT 0,
    total_minutes integer DEFAULT 0,
    streak integer DEFAULT 0,
    last_training_date text,
    athlete_type text,
    is_academy_admin boolean DEFAULT false,
    role text DEFAULT 'student'::text,
    academy_name text,
    academy_address text,
    academy_city text,
    academy_state text,
    academy_logo_url text,
    professor_photo_url text,
    saved_academies jsonb DEFAULT '[]'::jsonb,
    saved_professors jsonb DEFAULT '[]'::jsonb,
    invite_code text,
    created_at timestamp without time zone DEFAULT now(),
    academy_cnpj text,
    academy_cep text,
    academy_number text,
    academy_neighborhood text,
    academy_complement text,
    subscription_exempt boolean DEFAULT false,
    community_moderator boolean DEFAULT false,
    trial_ends_at timestamp without time zone,
    academy_latitude real,
    academy_longitude real,
    trial_requests_enabled boolean DEFAULT true,
    academy_phone text,
    academy_instagram text,
    academy_style text,
    academy_franchise text,
    academy_monthly_fee real,
    academy_daily_fee real,
    academy_pix_key text,
    academy_photo_urls jsonb DEFAULT '[]'::jsonb,
    academy_waiver_text text,
    promotion_criteria jsonb DEFAULT '[]'::jsonb,
    must_change_password boolean DEFAULT false
);


--
-- Name: whatsapp_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_instances (
    id text NOT NULL,
    professor_uid text NOT NULL,
    instance_name text NOT NULL,
    status text DEFAULT 'disconnected'::text,
    phone text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: -
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
\.


--
-- Data for Name: academy_professor_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.academy_professor_links (id, academy_uid, professor_uid, relation_type, status, notes, created_by_uid, created_at, updated_at, partner_revenue_share_percent, partner_revenue_notes) FROM stdin;
iajlffZhwVfpnqpOIOJXP	kogLjyu1wVBilVhdCD6pq	anDbL8Nf61fn2p_k5jhdd	internal	active	\N	kogLjyu1wVBilVhdCD6pq	2026-06-16 04:18:27.180147	2026-06-16 07:18:27.176	\N	\N
fu8O7lnOLINvXZOGfm0Hd	kogLjyu1wVBilVhdCD6pq	Ool58qGfkawpIAGDRVJoh	partner	pending	\N	kogLjyu1wVBilVhdCD6pq	2026-06-16 23:19:15.903939	2026-06-17 02:19:15.902	50	\N
\.


--
-- Data for Name: academy_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.academy_requests (id, student_uid, student_name, student_email, student_photo, student_belt, professor_uid, academy_name, status, created_at) FROM stdin;
dDXqHF3IlyRLt6IY6gD6_	V_HrBI2BTm0ACwSJvTb4O	aluno	aluno@aluno.com	\N	Branca	kogLjyu1wVBilVhdCD6pq	Tester	accepted	2026-06-07 23:10:20.165977
\.


--
-- Data for Name: academy_student_professor_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.academy_student_professor_assignments (id, academy_uid, professor_uid, student_uid, relation_type, status, student_name, professor_name, notes, created_by_uid, decided_at, created_at, updated_at) FROM stdin;
B19xzaSq2_i8KvO5pS7F8	kogLjyu1wVBilVhdCD6pq	anDbL8Nf61fn2p_k5jhdd	V_HrBI2BTm0ACwSJvTb4O	internal	active	aluno	foda	\N	kogLjyu1wVBilVhdCD6pq	2026-06-16 07:18:40.409	2026-06-16 04:18:40.413265	2026-06-16 07:18:40.409
\.


--
-- Data for Name: announcement_dismissals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.announcement_dismissals (id, announcement_id, user_uid, dismissed_at) FROM stdin;
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.announcements (id, title, content, image_url, link_url, link_text, is_active, created_at, updated_at, source_uid, source_name, source_role, scope, audience, target_academy_id, target_professor_uid, urgent) FROM stdin;
\.


--
-- Data for Name: challenges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.challenges (id, creator_uid, academy_id, title, description, target, unit, start_date, end_date, media_url, is_public, participants, created_at) FROM stdin;
7k72G5puk6Ss1dk8n7fdv	Ool58qGfkawpIAGDRVJoh	Ool58qGfkawpIAGDRVJoh	dghghgdh	rgdtgtedgtg	1	treinos	2026-06-16	2026-06-17	\N	t	[]	2026-06-15 20:50:02.687276
ebww8KI_aDFt1nZDnQqEH	kogLjyu1wVBilVhdCD6pq	kogLjyu1wVBilVhdCD6pq	hmgjmfhdg	hmjkyhfgdasfaef	1	treinos	2026-06-15	2026-06-30	\N	t	[]	2026-06-15 22:07:47.118898
\.


--
-- Data for Name: class_check_ins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.class_check_ins (id, schedule_id, academy_id, student_uid, check_in_date, created_at) FROM stdin;
\.


--
-- Data for Name: class_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.class_schedules (id, academy_id, professor_uid, day_of_week, start_time, end_time, class_name, modality, created_at, days, "time", type, mode, publico, duration_min, notes) FROM stdin;
1FuS_bXOllYu92xiKxbK4	Ool58qGfkawpIAGDRVJoh	Ool58qGfkawpIAGDRVJoh	\N	\N	\N	\N	\N	2026-06-15 02:24:32.426874	[]	\N	\N	\N	\N	\N	\N
a4WTcpSV8D1CtrvNSRb76	Ool58qGfkawpIAGDRVJoh	Ool58qGfkawpIAGDRVJoh	\N	\N	\N	\N	\N	2026-06-15 02:27:31.199632	[]	\N	\N	\N	\N	\N	\N
PRQN28a1QTl9nWIp6nd5i	Ool58qGfkawpIAGDRVJoh	Ool58qGfkawpIAGDRVJoh	\N	\N	\N	\N	\N	2026-06-15 02:34:20.227092	["seg"]	03:34	Geral	No-Gi	Misto	60	dfgdb
ltpXIhwTQt0997VLnz3Wy	Ool58qGfkawpIAGDRVJoh	Ool58qGfkawpIAGDRVJoh	\N	\N	\N	\N	\N	2026-06-15 02:39:34.834279	["seg"]	04:39	Geral	No-Gi	Feminino	60	ghfghghghgh
CVq9F20wcRffFAnjqS7_N	Ool58qGfkawpIAGDRVJoh	Ool58qGfkawpIAGDRVJoh	\N	\N	\N	\N	\N	2026-06-15 02:43:20.195087	["seg"]	05:43	Geral	No-Gi	Masculino	60	fhgchjf
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comments (id, post_id, author_uid, author_name, author_photo, content, created_at) FROM stdin;
\.


--
-- Data for Name: competitions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.competitions (id, uid, name, date, location, category, weight_class, result, notes, created_at) FROM stdin;
rtVwN5PFZ4F93qt3e6Ngw	-qapzl2rZp0MxmS8_Y6ir	copita	2026-05-24	sff	ffb	\N	gold	dcbgzgcb	2026-05-24 23:49:38.588471
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollments (id, professor_uid, professor_name, academy_name, student_uid, student_name, monthly_fee, due_day, status, pix_key, created_at) FROM stdin;
is-VEEtlIp62bB2klmB6O	Ool58qGfkawpIAGDRVJoh	\N	\N	V_HrBI2BTm0ACwSJvTb4O	aluno	150	5	active	14707815731	2026-06-10 21:01:10.966708
4_uliX597evoLo0C2tLi3	Ool58qGfkawpIAGDRVJoh	\N	\N	V_HrBI2BTm0ACwSJvTb4O	aluno	150	5	active	14707815731	2026-06-10 22:18:07.797437
y1cmUvO9GyA7DobPmSINF	kogLjyu1wVBilVhdCD6pq	\N	Tester	V_HrBI2BTm0ACwSJvTb4O	aluno	150	1	active	\N	2026-06-15 21:03:13.751771
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.events (id, creator_uid, academy_id, title, description, event_date, event_time, location, media_url, is_public, rsvps, created_at, type, slots, price, duration, academy_name, academy_logo, registration_names, registration_belts, registrations_closed, location_cep, location_address, location_number, location_neighborhood, location_city, location_state, location_latitude, location_longitude) FROM stdin;
4CyBPzn0PEov7Au_eNBPj	Ool58qGfkawpIAGDRVJoh	Ool58qGfkawpIAGDRVJoh	dgbdgg	gnddghdg	2026-06-15	20:05	Tester	\N	t	[]	2026-06-15 19:05:39.249281	outro	5	R$ 5.00	\N	prof	/uploads/professores/prof/perfil/K9wwFpdlZWnCDh18znrWl.png	{}	{}	f	27251330	Rua Martins Fontes	75	Jardim Am├ília	Volta Redonda	RJ	\N	\N
sYzhRRIl9EJyPgD22MSG2	kogLjyu1wVBilVhdCD6pq	kogLjyu1wVBilVhdCD6pq	ghxfgh	fgjhdfyhjtg	2026-06-17	22:05	Tester	\N	t	[]	2026-06-15 22:05:11.817116	competicao	8	Gratuito	\N	Tester		{}	{}	f	27251330	Rua Martins Fontes	75	Jardim Am├ília	Volta Redonda	RJ	\N	\N
\.


--
-- Data for Name: extra_trainings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.extra_trainings (id, uid, training_date, activity, duration, notes, created_at) FROM stdin;
\.


--
-- Data for Name: goals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.goals (id, uid, title, target, unit, period, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, to_uid, from_uid, from_name, type, message, data, read, created_at) FROM stdin;
wStWhQDaGhFbTVcIK4Kuy	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 00:51:35.616379
yzQXDxJoKUu6japIZT3dT	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 00:51:41.5288
RfAWrIpesIj_VuztZng42	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 01:50:22.055948
UfXMVFePl0NktjoPdWayb	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 01:50:46.378972
qHg2_zWLkxKJHLUrZQbNm	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 01:55:57.079228
cKu-_pftW9sKb-ISpuVOB	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 02:21:44.893712
E1vAe-5qaEul1oCf0VNIH	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 02:45:09.851815
0QnP-TlkOUypRZrBAWrdq	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 02:46:01.744632
RsM8ZbTW3xAb6hqRZmB8b	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 03:17:15.503127
ZtJjDjPdbXfXtuOqEBfOo	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 03:21:25.788642
pM5tlsDRX5_ZDKZN2hYC1	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 04:00:52.550946
T97r3jGFQA4_JyBxSEgyV	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 04:04:06.864384
DxCtLO8xmWIevhRInb8MC	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 04:05:17.795684
FYuUVSGudMyHov-C0Tn4a	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 04:24:23.245392
6kfUb0-Dc9B9z1EbrrLJn	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-11 04:31:33.76511
j09mKuxiZTDFnn5FCbkA5	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 00:08:05.301523
iRod1gif_Q1-h2i6kd4y2	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 00:36:25.689783
OevDxXq3WccQ15MAhrEmu	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 00:40:01.62715
_r9PbbmDp0qQq0mkjWBK8	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 00:44:38.327278
6sj4WW3RXx5EqFnd4bVZ-	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 00:59:57.423963
XXxeNhIUdU79AG9RqCGZ2	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 01:07:53.978166
nWS6jSZoC9-XYKNZzLez_	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 01:09:14.701544
5XACFdkyON-ipjG_NO2zs	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 01:11:12.221682
yw2sAhpNzyJrghSFlBT3J	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 01:17:24.249141
ViY-VI1ltfSTPeGteL_-3	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 01:18:54.512345
z9Z1xQbb_h7qsBoYmNiTD	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 02:03:04.665735
OmRkpWQfli4WRQASXK565	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_overdue	Mensalidade em atraso ha 7 dia(s). Valor em aberto: R$ 150.00. Vencimento: 05/06/2026. Regularize para continuar treinando.	{"amount": 150, "pixKey": "", "dueDate": "2026-06-05", "daysOverdue": 7}	f	2026-06-12 02:03:32.365342
N8i5eA8E7I8F78B1J4mb3	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 05:39:17.615415
HX4iiuGl7OQV18iSDvlLh	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	payment_suspended	Seu acesso foi suspenso automaticamente apos 7 dia(s) de inadimplencia. Regularize sua mensalidade para voltar a treinar.	{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "is-VEEtlIp62bB2klmB6O", "autoSuspendAfterDays": 1}	f	2026-06-12 05:40:14.246698
WPtaKtIO5ZM2-qWdU0aW6	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	payment_suspended	Seu acesso foi suspenso automaticamente apos 7 dia(s) de inadimplencia. Regularize sua mensalidade para voltar a treinar.	{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 1}	f	2026-06-12 05:40:14.577272
Nv5mbFjyl2D4hmlDRtCRn	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	payment_suspended	Seu acesso foi suspenso automaticamente apos 7 dia(s) de inadimplencia. Regularize sua mensalidade para voltar a treinar.	{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 2}	f	2026-06-12 06:16:13.493319
R81gBGPRiLqfV2GFAswsL	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	payment_suspended	Seu acesso foi suspenso automaticamente apos 7 dia(s) de inadimplencia. Regularize sua mensalidade para voltar a treinar.	{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 2}	f	2026-06-12 06:17:07.683922
dFf1dH5fVnMsPVU7g4kHs	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	payment_suspended	Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 1 dia(s) de atraso. Atraso atual: 7 dia(s). Regularize sua mensalidade para voltar a treinar.	{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 1}	f	2026-06-12 06:21:18.194573
0VbRCgscSiuLsJLQhAnwC	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	payment_suspended	Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 7 dia(s) de atraso. Atraso atual: 7 dia(s). Regularize sua mensalidade para voltar a treinar.	{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 7}	f	2026-06-12 06:41:29.18345
kvRDdHEzZ1srWHXNY3xFD	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	payment_suspended	Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 7 dia(s) de atraso. Atraso atual: 7 dia(s). Regularize sua mensalidade para voltar a treinar.	{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 7}	f	2026-06-12 18:26:09.040185
L8pmbjdHAabi6HqY589B6	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_overdue	Mensalidade em atraso ha 7 dia(s). Valor em aberto: R$ 150.00. Vencimento: 05/06/2026. Regularize para continuar treinando.	{"amount": 150, "pixKey": "", "dueDate": "2026-06-05", "daysOverdue": 7}	f	2026-06-12 18:26:17.265955
W4a7n45yRTpRvor41f73t	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	low_frequency	Sentimos sua falta no tatame. Voce treinou 0 vezes em Junho. Que tal marcar presenca esta semana?	{"monthName": "Junho", "trainingsCount": 0}	f	2026-06-12 18:26:54.923267
bJZ-f-NlOK_yqfafwppKj	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	low_frequency	Sentimos sua falta no tatame. Voce treinou 0 vezes em Junho. Que tal marcar presenca esta semana?	{"monthName": "Junho", "trainingsCount": 0}	f	2026-06-12 18:27:13.133066
T8IDcrOqhSD016UxE65CF	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}	f	2026-06-12 18:31:21.644721
jFjJ2TEZAoVzmLQQcMdvk	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	payment_suspended	Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 7 dia(s) de atraso. Atraso atual: 9 dia(s). Regularize sua mensalidade para voltar a treinar.	{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 9, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 7}	f	2026-06-14 23:09:39.179362
m9zf8PTuUc1Sic6vPbjoa	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	promotion	­ƒÅà VOC├è FOI PROMOVIDO! Parab├®ns! Voc├¬ foi promovido para Faixa Branca ┬À 1┬║ grau!	{"belt": "Branca", "stripes": 1}	f	2026-06-14 23:23:23.806439
WKtyrwwnkGmjuWZCNP2vm	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	promotion	­ƒÅà VOC├è FOI PROMOVIDO! Parab├®ns! Voc├¬ foi promovido para Faixa Branca ┬À 1┬║ grau!	{"belt": "Branca", "stripes": 1}	f	2026-06-14 23:23:36.759259
39YmxHkOn6GezNOdpNmfi	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	promotion	­ƒÅà VOC├è FOI PROMOVIDO! Parab├®ns! Voc├¬ foi promovido para Faixa Branca ┬À 2┬║ grau!	{"belt": "Branca", "stripes": 2}	f	2026-06-14 23:50:04.703577
ge5Hr0JwX0CsVQw2HD7l6	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	payment_suspended	Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 7 dia(s) de atraso. Atraso atual: 9 dia(s). Regularize sua mensalidade para voltar a treinar.	{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 9, "enrollmentId": "is-VEEtlIp62bB2klmB6O", "autoSuspendAfterDays": 7}	f	2026-06-14 23:52:38.893695
HIkP7eJoZTm3hxpiS6gIA	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	payment_suspended	Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 7 dia(s) de atraso. Atraso atual: 9 dia(s). Regularize sua mensalidade para voltar a treinar.	{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 9, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 7}	f	2026-06-14 23:52:39.292599
uESdB3wqtYEy9y2RbkYhQ	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	payment_suspended	Sua matricula voltou para suspensao. Motivo: Pagamento estornado. Regularize a situacao para voltar a treinar.	{"reason": "Pagamento estornado.", "academyName": null, "enrollmentId": "is-VEEtlIp62bB2klmB6O", "professorUid": "Ool58qGfkawpIAGDRVJoh"}	f	2026-06-15 00:17:55.714702
hjEAlbVZn-M6GytIWHtUl	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	payment_suspended	Sua matricula voltou para suspensao. Motivo: Pagamento estornado. Regularize a situacao para voltar a treinar.	{"reason": "Pagamento estornado.", "academyName": null, "enrollmentId": "4_uliX597evoLo0C2tLi3", "professorUid": "Ool58qGfkawpIAGDRVJoh"}	f	2026-06-15 00:18:17.346477
icfGlCGsj_svxsHVOtlUe	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	enrollment_reactivated	Sua matricula foi reativada. Voce esta ativo novamente e ja pode voltar aos treinos.	{"academyName": null, "enrollmentId": "is-VEEtlIp62bB2klmB6O", "professorUid": "Ool58qGfkawpIAGDRVJoh"}	f	2026-06-15 00:19:36.433875
dWpIUXrQ2y1x5IYiwZGYl	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	Professor	enrollment_reactivated	Sua matricula foi reativada. Voce esta ativo novamente e ja pode voltar aos treinos.	{"academyName": null, "enrollmentId": "4_uliX597evoLo0C2tLi3", "professorUid": "Ool58qGfkawpIAGDRVJoh"}	f	2026-06-15 00:19:36.783635
Nwl5y85xAWoTC0w7Zdum-	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	promotion	­ƒÅà VOC├è FOI PROMOVIDO! Parab├®ns! Voc├¬ foi promovido para Faixa Branca ┬À 3┬║ grau!	{"belt": "Branca", "stripes": 3}	f	2026-06-15 00:34:03.675512
fqBE0YyG0WFbUsSSVoWpp	V_HrBI2BTm0ACwSJvTb4O	Ool58qGfkawpIAGDRVJoh	\N	low_frequency	Sentimos sua falta no tatame. Voce treinou 0 vezes em Junho. Que tal marcar presenca esta semana?	{"monthName": "Junho", "trainingsCount": 0}	f	2026-06-15 02:53:20.831978
P1XXZZHYSvxQ3vIh131LH	V_HrBI2BTm0ACwSJvTb4O	kogLjyu1wVBilVhdCD6pq	\N	request_accepted	Sua solicita├º├úo de ingresso em Tester foi aprovada! Bem-vindo!	\N	f	2026-06-15 21:03:13.753425
Se5a5k5aSyhh48JHBuYfd	V_HrBI2BTm0ACwSJvTb4O	kogLjyu1wVBilVhdCD6pq	\N	payment_due	­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 0.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.	{"amount": 0, "pixKey": "", "dueDate": "2026-06-05"}	f	2026-06-15 21:06:38.765925
Q9y9pDZGkp7BQYYIUedoC	V_HrBI2BTm0ACwSJvTb4O	kogLjyu1wVBilVhdCD6pq	Tester	payment_suspended	Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 10 dia(s) de atraso. Atraso atual: 10 dia(s). Regularize sua mensalidade para voltar a treinar.	{"paymentId": "37Zcj4l6rGGPhmyZCkyEj", "daysOverdue": 10, "enrollmentId": "y1cmUvO9GyA7DobPmSINF", "autoSuspendAfterDays": 10}	f	2026-06-15 21:06:46.774754
loyk9hArY2aDaFjH6uROq	V_HrBI2BTm0ACwSJvTb4O	kogLjyu1wVBilVhdCD6pq	Tester	academy_student_assigned_professor	Tester definiu foda para acompanhar seus treinos.	{"academyUid": "kogLjyu1wVBilVhdCD6pq", "assignmentId": "B19xzaSq2_i8KvO5pS7F8", "professorUid": "anDbL8Nf61fn2p_k5jhdd"}	f	2026-06-16 04:18:40.4179
iKbc9wX5nXVGP9OxM3_yo	V_HrBI2BTm0ACwSJvTb4O	kogLjyu1wVBilVhdCD6pq	Tester	enrollment_reactivated	Sua matricula foi reativada. Voce esta ativo novamente em Tester e ja pode voltar aos treinos.	{"academyName": "Tester", "enrollmentId": "y1cmUvO9GyA7DobPmSINF", "professorUid": "kogLjyu1wVBilVhdCD6pq"}	f	2026-06-16 04:46:25.332244
n9uyny4lfkzJIj1owEFpH	V_HrBI2BTm0ACwSJvTb4O	kogLjyu1wVBilVhdCD6pq	Tester	low_frequency	Sentimos sua falta no tatame. Voce treinou 0 vezes em Junho. Que tal marcar presenca esta semana?	{"auto": true, "monthName": "Junho", "trainingsCount": 0}	f	2026-06-16 05:09:42.588469
1nNncFgi1Z77r80F5s23u	V_HrBI2BTm0ACwSJvTb4O	kogLjyu1wVBilVhdCD6pq	\N	payment_suspended	Sua matricula em Tester foi suspensa. Motivo: dghdtghdgh	{"reason": "dghdtghdgh", "enrollmentId": "y1cmUvO9GyA7DobPmSINF"}	f	2026-06-16 05:37:54.340876
7NLaMkvCz3QS-C7O18ZL6	V_HrBI2BTm0ACwSJvTb4O	kogLjyu1wVBilVhdCD6pq	Tester	enrollment_reactivated	Sua matricula foi reativada. Voce esta ativo novamente em Tester e ja pode voltar aos treinos.	{"academyName": "Tester", "enrollmentId": "y1cmUvO9GyA7DobPmSINF", "professorUid": "kogLjyu1wVBilVhdCD6pq"}	f	2026-06-16 05:39:32.163545
Nbe1uFneAybRkLy4O4lD3	V_HrBI2BTm0ACwSJvTb4O	kogLjyu1wVBilVhdCD6pq	\N	payment_suspended	Sua matricula em Tester foi suspensa. Motivo: rfgfg	{"reason": "rfgfg", "enrollmentId": "y1cmUvO9GyA7DobPmSINF"}	f	2026-06-16 05:44:32.57479
Y4aYGbTkuj0zzVi8Os5B3	V_HrBI2BTm0ACwSJvTb4O	kogLjyu1wVBilVhdCD6pq	Tester	enrollment_reactivated	Sua matricula foi reativada. Voce esta ativo novamente em Tester e ja pode voltar aos treinos.	{"academyName": "Tester", "enrollmentId": "y1cmUvO9GyA7DobPmSINF", "professorUid": "kogLjyu1wVBilVhdCD6pq"}	f	2026-06-16 05:44:53.175306
lbGmqxHt2yAdwG-Jool1_	V_HrBI2BTm0ACwSJvTb4O	kogLjyu1wVBilVhdCD6pq	\N	promotion	Parabens! Tester promoveu voce para faixa Branca - 4 grau.	{"belt": "Branca", "stripes": 4, "promotionId": "THgntzSAQxn-vD9WznBLl"}	f	2026-06-16 19:35:37.740499
OvoMgxmlueIvKwd-4ds-3	anDbL8Nf61fn2p_k5jhdd	kogLjyu1wVBilVhdCD6pq	Tester	academy_professor_internal	Tester criou sua conta de professor. Faca login no BJJRats com seu e-mail. A academia gerencia seus alunos e mensalidades.	\N	t	2026-06-16 04:18:27.18375
Sh_kDJ85cuDFBjCbJlAlu	anDbL8Nf61fn2p_k5jhdd	kogLjyu1wVBilVhdCD6pq	Tester	academy_internal_student_assignment	Tester atribuiu aluno para seu acompanhamento.	{"academyUid": "kogLjyu1wVBilVhdCD6pq", "studentUid": "V_HrBI2BTm0ACwSJvTb4O", "assignmentId": "B19xzaSq2_i8KvO5pS7F8"}	t	2026-06-16 04:18:40.41634
7KflYaEbhPZqN-PDtHzju	Ool58qGfkawpIAGDRVJoh	kogLjyu1wVBilVhdCD6pq	Tester	academy_professor_partner	Tester convidou voce para ser professor parceiro com proposta de 50% da mensalidade para o professor. Aceite ou recuse no seu painel.	\N	f	2026-06-16 23:19:15.906048
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, professor_uid, student_uid, student_name, student_email, amount, due_date, paid_at, status, pix_link, created_at) FROM stdin;
YR2Av0iF-MW9GYOvrtmZo	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	aluno@aluno.com	105	2026-07-05 03:00:00	\N	pending	\N	2026-06-10 22:18:07.807953
RTL6DISasZqpSpTWbceiB	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-10 22:18:07.850753
7eWT0bVUo9xCct-XZVaG7	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-10 22:18:15.858343
WqJnzK_ON-cayI2TDVZbo	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 00:21:17.525553
OVCkrOXHTdIWzMajsXRUO	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 00:21:25.643614
1WM_-6zhr17sny0fv-J_x	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 00:29:43.098647
7vfiZeBC5HNxiMWJ4sSEG	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 00:51:35.607034
gNZPRWh9QQajwYPH0UBf9	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 00:51:41.51946
NVboPX1JIP4dvNLC7rLgN	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 01:50:22.041385
0InYhJ5e0yE5YNssEVT9b	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 01:50:46.370685
F2maXkCogEkPRyy1YGqOw	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 01:55:57.070254
YjbA2ZO6at9pR8XE3c-5w	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 02:45:09.843785
qNO-dbHfsDG8LwKm0iwdQ	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 02:46:01.736867
ZSGjUmecoGB3KhEw5uiGX	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 03:17:15.49491
50zwGj0ooKQ9wis7oRIIP	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 03:21:25.779983
W0xim-tdo5Scmv2jXQrl8	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 04:00:52.539321
m0Kkhf62lwNC0HygoK3Wc	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 04:04:06.857416
TsT18MpaSSej2azd-yDvg	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 04:05:17.782613
Dkk3xv8dmARf7THTqz8sw	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 04:24:23.237651
E6c_tTgbFhVeqnlt6yRua	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-11 04:31:33.757213
6GfEDaceY1KC2H5BIhKbZ	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-12 00:08:05.289343
Y9ZAE6hg9yvZ3uPQ_SBsH	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-12 00:36:25.681767
vEnU9en5eHAuqqeWG1aDl	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-12 00:40:01.619609
2et7C3wkEg-JAbesbOy6t	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-12 00:44:38.320359
uk9nVskkuwgx6T7jJYkvE	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-12 00:59:57.417497
OKMGWUVZP7HGTYgHNlV6U	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-12 01:07:53.970732
j2WpMvh1WSlTl56nLJXgs	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-12 01:09:14.694509
bNuuy5hHw-ID82FNRBv91	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-12 01:11:12.214436
5TRwy86j1rFyhQgnUL8Mj	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-12 01:17:24.24102
mXlPNu-0AtoV1ShSDSqqZ	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-12 01:18:54.505332
l6HxbXrPSjvvUR2ly7JHw	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-12 02:03:04.65807
bTo4qY2uDmpBCNYUYp0OO	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	pending	\N	2026-06-12 05:39:17.607353
37Zcj4l6rGGPhmyZCkyEj	kogLjyu1wVBilVhdCD6pq	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	0	2026-06-05 03:00:00	2026-06-16 03:00:00	paid	\N	2026-06-15 21:06:38.753572
vFaQ96C6H94sWmee7HxFm	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	\N	overdue	\N	2026-06-11 02:21:44.880829
ZHhIeSBWmAEqlQT_pBK92	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	150	2026-06-05 03:00:00	2026-06-15 03:00:00	paid	14707815731	2026-06-12 18:31:21.636821
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plans (id, name, slug, description, price, role_assigned, features, is_active, created_at, trial_days) FROM stdin;
Ca33pXpx3E5v6rRTVjcDU	Aluno	aluno	Registre seus treinos, acompanhe sua evolu├º├úo, participe da comunidade.	19.9	student	["training_tracking", "training_history", "streak", "community", "achievements", "competitions", "goals", "challenges", "events", "profile_stats"]	t	2026-05-25 23:10:47.715972	0
lemEcblz70phZ_6qu8aAT	Professor Particular	professor	Gerencie seus alunos com exclusividade e acompanhe o desenvolvimento de cada um.	47.9	professor	["professor_panel", "student_management", "unlimited_students", "enrollments", "payments", "promotions", "class_schedules", "class_checkins", "training_analytics", "exclusive_student_attention"]	t	2026-05-25 23:10:47.719239	0
yxtJZzQesfa63SRV6U-PA	Academia	academia	Gest├úo completa da sua academia com m├║ltiplos professores, CRM e relat├│rios.	97.9	academy	["admin_dashboard", "user_management", "crm", "multiple_professors", "class_schedules", "class_checkins", "reports", "enrollments", "payments", "promotions", "revenue_analytics"]	t	2026-05-25 23:10:47.720486	0
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.posts (id, author_uid, author_name, author_photo, author_belt, content, media_url, media_type, post_type, academy_id, training_data, likes, created_at, academy_name, academy_logo) FROM stdin;
Y6oWXIzGWkoG3aAvYmbi0	-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	\N	Branca	­ƒÑï Treino registrado ÔÇö 23/05/2026\n­ƒÑï Aula Coletiva ┬À Gi ┬À 120min\nÔÜí +25 XP	/uploads/suN2iNN4s2jZzflrsgBVz.png	\N	community	\N	{"xp": 25, "date": "23/05/2026", "duration": 120, "modality": "gi", "sessionType": "aula_coletiva"}	[]	2026-05-23 00:34:02.603077	\N	\N
DH799a6S0WwLGeuv2rsKZ	-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	\N	Branca	­ƒÑï Treino registrado ÔÇö 23/05/2026\n­ƒÑï Aula Coletiva ┬À Gi ┬À 120min\nÔÜí +25 XP	/uploads/suN2iNN4s2jZzflrsgBVz.png	\N	community	\N	{"xp": 25, "date": "23/05/2026", "duration": 120, "modality": "gi", "sessionType": "aula_coletiva"}	[]	2026-05-23 00:34:18.518494	\N	\N
79WNTPv0hWi3zrZrFXvbY	-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	\N	Branca	­ƒÑï Treino registrado ÔÇö 23/05/2026\n­ƒÑï Aula Coletiva ┬À Gi ┬À 120min\nÔÜí +25 XP	/uploads/suN2iNN4s2jZzflrsgBVz.png	\N	community	\N	{"xp": 25, "date": "23/05/2026", "duration": 120, "modality": "gi", "sessionType": "aula_coletiva"}	[]	2026-05-23 00:34:22.035072	\N	\N
mo6_T45C5BNrZ-FNSQN95	-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	\N	Branca	­ƒÑï Treino registrado ÔÇö 23/05/2026\n­ƒÄ» Aula Particular ┬À Gi ┬À 60min\nÔÜí +20 XP	/uploads/Vi1kjJI7if1HQhpQ07_Hc.png	\N	community	\N	{"xp": 20, "date": "23/05/2026", "duration": 60, "modality": "gi", "sessionType": "aula_particular"}	[]	2026-05-23 00:48:11.325365	\N	\N
vMERtF_a0dJZdudRNam0w	-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	\N	Branca	­ƒÑï Treino registrado ÔÇö 23/05/2026\n­ƒÄ» Aula Particular ┬À Gi ┬À 60min\nÔÜí +20 XP	/uploads/Vi1kjJI7if1HQhpQ07_Hc.png	\N	community	\N	{"xp": 20, "date": "23/05/2026", "duration": 60, "modality": "gi", "sessionType": "aula_particular"}	[]	2026-05-23 00:48:14.405212	\N	\N
0XlietRBcM16yxQu4JKKt	-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	\N	Branca	­ƒÑï Treino registrado ÔÇö 23/05/2026\n­ƒÄ» Aula Particular ┬À Gi ┬À 60min\nÔÜí +20 XP	/uploads/Vi1kjJI7if1HQhpQ07_Hc.png	\N	community	\N	{"xp": 20, "date": "23/05/2026", "duration": 60, "modality": "gi", "sessionType": "aula_particular"}	[]	2026-05-23 00:48:16.277525	\N	\N
QuSnw51aeU7frYSTTUom4	-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	/uploads/9O25ns2CTNXPH0wwgEXNI.png	Preta	­ƒÑï Treino registrado ÔÇö 23/05/2026\n­ƒÑï Aula Coletiva ┬À Gi ┬À 120min\nÔÜí +25 XP		\N	community	\N	{"xp": 25, "date": "23/05/2026", "duration": 120, "modality": "gi", "sessionType": "aula_coletiva"}	[]	2026-05-23 13:42:57.706615	\N	\N
YRiu7-mBlNuWEwlU2AYL1	-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	/uploads/alunos/fulano-da-silva/perfil/btxvfdZWPo-d-QDNMvaPx.png	Preta	­ƒÑï Treino registrado ÔÇö 23/05/2026\n­ƒÑï Aula Coletiva ┬À Gi ┬À 120min\nÔÜí +25 XP		\N	community	\N	{"xp": 25, "date": "23/05/2026", "duration": 120, "modality": "gi", "sessionType": "aula_coletiva"}	[]	2026-05-23 13:51:47.535664	\N	\N
Fr-EJlw6cn0otAztxC75V	-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	/uploads/alunos/fulano-da-silva/perfil/btxvfdZWPo-d-QDNMvaPx.png	Preta	­ƒÑï Treino registrado ÔÇö 23/05/2026\n­ƒÑï Aula Coletiva ┬À Gi ┬À 120min\nÔÜí +25 XP		\N	community	\N	{"xp": 25, "date": "23/05/2026", "duration": 120, "modality": "gi", "sessionType": "aula_coletiva"}	[]	2026-05-23 14:24:34.179198	\N	\N
wBK_gpmonfjbG8G9Ihw7B	-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	/uploads/alunos/fulano-da-silva/perfil/btxvfdZWPo-d-QDNMvaPx.png	Preta	­ƒÑï Treino registrado ÔÇö 23/05/2026\n­ƒÄ» Aula Particular ┬À Gi ┬À 60min\nÔÜí +20 XP		\N	community	\N	{"xp": 20, "date": "23/05/2026", "duration": 60, "modality": "gi", "sessionType": "aula_particular"}	[]	2026-05-23 14:25:49.016052	\N	\N
jF7FgBNOWkhq0xL75rXRE	-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	/uploads/alunos/fulano-da-silva/perfil/btxvfdZWPo-d-QDNMvaPx.png	Preta	ghghgdchgh		\N	community	\N	\N	[]	2026-05-23 14:26:14.728597	\N	\N
hSdSl406j_e5Z2wfe3zkk	-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	/uploads/alunos/fulano-da-silva/perfil/btxvfdZWPo-d-QDNMvaPx.png	Preta	ghgfhghd	/uploads/alunos/fulano-da-silva/comunidade/XqwizPkReKD-OY__YVldk.png	\N	community	\N	\N	[]	2026-05-23 14:27:06.512284	\N	\N
xxgIFPlP068C5EVyYvd0B	Ool58qGfkawpIAGDRVJoh	prof	/uploads/professores/prof/perfil/K9wwFpdlZWnCDh18znrWl.png	Branca	dgh	\N	\N	academy	Ool58qGfkawpIAGDRVJoh	{"category": "resultado"}	[]	2026-06-15 00:48:17.537418	\N	\N
26m34ycQ6tk8F3MhB5LRR	kogLjyu1wVBilVhdCD6pq	Tester	\N	Branca	zdfhdghdghgdh		\N	community	\N	{"category": "geral"}	[]	2026-06-16 21:30:44.073081	Tester	/uploads/academias/teste/perfil/kWojWgnMgfq8ubzjA_dbH.jpeg
\.


--
-- Data for Name: promotions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promotions (id, professor_uid, student_uid, student_name, from_belt, to_belt, from_stripes, to_stripes, notes, promoted_at, created_at) FROM stdin;
DD_IAq2MxSBJmq83zP1OA	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	\N	\N	\N	\N	\N	2026-06-14 23:12:39.468804	2026-06-14 23:12:39.468804
ipksut9Z9-9pswOK_wK9x	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	Branca	Branca	0	1	\N	2026-06-14 23:23:23.777479	2026-06-14 23:23:23.777479
LDiWetp1LhEYqHRKn7MJH	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	Branca	Branca	0	1	\N	2026-06-14 23:23:36.751455	2026-06-14 23:23:36.751455
QDLXH3cDo00e-uKU8bjTL	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	Branca	Branca	1	2	\N	2026-06-14 23:50:04.675785	2026-06-14 23:50:04.675785
ydLXn8BE9g8EbT61VMXpZ	Ool58qGfkawpIAGDRVJoh	V_HrBI2BTm0ACwSJvTb4O	aluno	Branca	Branca	2	3	\N	2026-06-15 00:34:03.64567	2026-06-15 00:34:03.64567
THgntzSAQxn-vD9WznBLl	kogLjyu1wVBilVhdCD6pq	V_HrBI2BTm0ACwSJvTb4O	aluno	Branca	Branca	3	4	fgfg	2026-06-16 19:35:37.731926	2026-06-16 19:35:37.731926
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (key, value) FROM stdin;
app_store_url	
play_store_url	
professor:Ool58qGfkawpIAGDRVJoh:financial:auto_suspend_after_days	7
owner:Ool58qGfkawpIAGDRVJoh:payments:webhook_token	cZvst1bnEmziMVImDHPgiId_NN8NtETJ
owner:kogLjyu1wVBilVhdCD6pq:payments:webhook_token	AWrtH736zBwYQ7KjVx0_N6yCVWkt5Geu
owner:anDbL8Nf61fn2p_k5jhdd:payments:webhook_token	zb847OcBgg2K7QC4C9mZO25rNFOJ2TRF
owner:kogLjyu1wVBilVhdCD6pq:payments:manual_enabled	true
owner:kogLjyu1wVBilVhdCD6pq:payments:asaas_enabled	false
owner:kogLjyu1wVBilVhdCD6pq:payments:asaas_sandbox	false
owner:kogLjyu1wVBilVhdCD6pq:payments:asaas_billing_type	PIX
owner:kogLjyu1wVBilVhdCD6pq:payments:pix_key	
owner:kogLjyu1wVBilVhdCD6pq:payments:pix_qr_code_url	
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, user_uid, plan_id, status, asaas_id, asaas_customer_id, current_period_start, current_period_end, trial_ends_at, cancelled_at, created_at) FROM stdin;
\.


--
-- Data for Name: trainings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.trainings (id, uid, training_date, session_type, modality, duration, intensity, satisfaction, techniques, notes, academy, professor, training_photo_url, xp, extra_data, comp_data, created_at) FROM stdin;
F-XVz2YXysfUdtQ5q8kIE	-qapzl2rZp0MxmS8_Y6ir	23/05/2026	aula_coletiva	gi	120	5	4	{"finalizacoes": ["Mata-le├úo (Rear Naked Choke)", "Tri├óngulo (Triangle Choke)", "Guilhotina (Guillotine Choke)", "Chave de bra├ºo (Armbar)", "Americana (Keylock)", "Kimura", "Omoplata", "Estrangulamento de lapela (Lapel Choke)", "Estrangulamento de gola (Collar Choke)", "D'arce (D'Arce Choke)", "Anaconda", "Heel Hook", "Kneebar", "Toe Hold", "Estrangulamento de pesco├ºo (Neck Crank)"]}	dghffgncfgncgngnc	gym	siclano	\N	25	\N	\N	2026-05-23 00:19:11.314662
Zlh7SePPhpyYY9kjK8zLD	-qapzl2rZp0MxmS8_Y6ir	23/05/2026	aula_coletiva	gi	120	5	5	{"quedas": ["Proje├º├úo de quadril (O-Goshi)", "Proje├º├úo de ombro (Seoi Nage)", "Derrubada de gancho (Hook Throw)", "Queda de joelho duplo (Knee Tap)", "Proje├º├úo de perna (Uchi Mata)", "Proje├º├úo de varredura (Harai Goshi)", "Queda de joelho (Morote Seoi Nage)", "Raspagem de perna (Osoto Gari)", "Raspagem de perna interna (Ouchi Gari)", "Raspagem de perna externa (Kouchi Gari)", "Queda dupla de perna (Double Leg Takedown)", "Queda de perna ├║nica (Single Leg Takedown)", "Derrubada de cabe├ºa (Headlock Takedown)", "Proje├º├úo de carregamento (Fireman Carry)"]}	xfgdfdhgdghdhdbdghdgh	gym	siclano	\N	25	\N	\N	2026-05-23 00:28:01.934368
5GVFg42HZxuL2kxSMQqpA	-qapzl2rZp0MxmS8_Y6ir	23/05/2026	aula_particular	gi	60	5	5	{"finalizacoes": ["Mata-le├úo (Rear Naked Choke)", "Tri├óngulo (Triangle Choke)", "Guilhotina (Guillotine Choke)", "Chave de bra├ºo (Armbar)", "Americana (Keylock)", "Kimura", "Omoplata", "Estrangulamento de lapela (Lapel Choke)", "Estrangulamento de gola (Collar Choke)", "D'arce (D'Arce Choke)", "Anaconda", "Heel Hook", "Kneebar", "Toe Hold", "Estrangulamento de pesco├ºo (Neck Crank)"]}	dhgdghdghdghdghdgh	gym	fulanilson	\N	20	\N	\N	2026-05-23 00:47:55.197301
\.


--
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_achievements (id, uid, achievement_id, unlocked_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (uid, name, email, password_hash, photo, belt, stripes, academy, academy_id, professor, dob, sex, weight_kg, height_cm, phone, address, bjj_since, xp, total_trainings, total_minutes, streak, last_training_date, athlete_type, is_academy_admin, role, academy_name, academy_address, academy_city, academy_state, academy_logo_url, professor_photo_url, saved_academies, saved_professors, invite_code, created_at, academy_cnpj, academy_cep, academy_number, academy_neighborhood, academy_complement, subscription_exempt, community_moderator, trial_ends_at, academy_latitude, academy_longitude, trial_requests_enabled, academy_phone, academy_instagram, academy_style, academy_franchise, academy_monthly_fee, academy_daily_fee, academy_pix_key, academy_photo_urls, academy_waiver_text, promotion_criteria, must_change_password) FROM stdin;
kE8gEO0Z8D87feOu0Geyj	Super Admin	admin@bjjrats.com	$2b$10$N.TIDmwfrt1uxJ.aG5bYXunVvuROLDdCIxDtejcG4S.XTMV1N/nom	\N	Preta	0		\N		\N	\N	\N	\N	\N	\N	\N	0	0	0	0	\N	\N	t	superadmin	\N	\N	\N	\N	\N	\N	[]	[]	KE8GEO	2026-05-22 22:49:05.061392	\N	\N	\N	\N	\N	f	f	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	[]	\N	[]	f
-qapzl2rZp0MxmS8_Y6ir	Fulano da Silva	fulano@bjjrats.com	$2b$10$t.BIMdraEYpQEGVG1ihAzOzKRJyRBeDvLGhPGhQ57rSzlsxst/TQ.	/uploads/alunos/fulano-da-silva/perfil/btxvfdZWPo-d-QDNMvaPx.png	Preta	0				\N	\N			27996174965	\N		70	3	300	1	23/05/2026	competitor	f	student	\N	\N	\N	\N	\N	\N	[]	[]	-QAPZL	2026-05-23 00:02:27.08091	\N	\N	\N	\N	\N	f	f	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	[]	\N	[]	f
rQvrHb9aKoR7imOwfEmu_	lu	lu@lu.com	$2b$10$gMkgO2bO8H8gox6XgaOGt.nzXVa8IAto6fYChe4MBZhcUY.zsLpqu	\N	Branca	0	Tester	\N	Siclano da Silva	1998-10-14	M	75	180	\N	\N	2026-05-17	0	0	0	0	\N	\N	f	student	\N	\N	\N	\N	\N	\N	[]	[]	RQVRHB	2026-05-26 00:02:39.578184	\N	\N	\N	\N	\N	f	f	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	[]	\N	[]	f
kogLjyu1wVBilVhdCD6pq	teste	teste@teste.com	$2b$10$dtxPmnVefdo8WMtyQQIJ0eZW8zwgeCG43GaG/3AT.2X.QcZ4mIHRS	\N	Branca	0		\N		\N	\N	\N	\N	27996174965	\N	\N	0	0	0	0	\N	\N	t	academy	Tester	Rua Martins Fontes	Volta Redonda	RJ	/uploads/academias/teste/perfil/kWojWgnMgfq8ubzjA_dbH.jpeg	\N	[]	[]	\N	2026-05-27 22:45:29.692932	28.029.146/0001-89	27251-330	75	Jardim Am├ília	\N	t	f	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	[]	\N	[]	f
V_HrBI2BTm0ACwSJvTb4O	aluno	aluno@aluno.com	$2b$10$PpgHtznrKu84EpNoSlzVEOXnAbTio8UyXyLJzzDsN4vRaYzsZns2G	\N	Branca	4	Tester	kogLjyu1wVBilVhdCD6pq		\N	\N	\N	\N	27996174965	\N	\N	0	0	0	0	\N	\N	f	student					\N	\N	[]	[]	\N	2026-05-27 23:21:29.920355						t	f	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	[]	\N	[]	f
Ool58qGfkawpIAGDRVJoh	prof	professor@bjjrats.com	$2b$10$jTnPoyUsRKXc4eYltNhMAeqgVu8SPHJKaX/dYdBbmsCg30Smchu72	/uploads/professores/prof/perfil/K9wwFpdlZWnCDh18znrWl.png	Branca	0		\N		\N	\N	\N	\N	27996174965	\N	\N	0	0	0	0	\N	\N	f	professor	\N				\N	/uploads/professores/prof/perfil/K9wwFpdlZWnCDh18znrWl.png	[]	[]	\N	2026-05-30 12:51:33.93029	\N		\N	\N	\N	t	f	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	[]	TERMO DE RESPONSABILIDADE E MATR├ìCULA\n\nAo realizar a matr├¡cula ou solicitar participa├º├úo em aulas, o aluno (ou respons├ível legal, no caso de menores de idade) declara estar ciente e de acordo com as seguintes condi├º├Áes:\n\n1. RISCOS DA ATIVIDADE\nO Jiu-Jitsu ├® uma arte marcial de contato que envolve riscos inerentes ├á pr├ítica, como quedas, tor├º├Áes e contato f├¡sico. O aluno declara estar em condi├º├Áes f├¡sicas adequadas para a pr├ítica e assume os riscos decorrentes.\n\n2. RESPONSABILIDADE\nA academia e o professor ficam isentos de responsabilidade por les├Áes decorrentes de acidentes durante os treinos, desde que n├úo haja neglig├¬ncia comprovada por parte dos instrutores.\n\n3. SA├ÜDE\nO aluno declara n├úo possuir contraindica├º├úo m├®dica para a pr├ítica de atividades f├¡sicas de alto impacto. Recomenda-se avalia├º├úo m├®dica pr├®via.\n\n4. CONDUTA\nO aluno compromete-se a respeitar colegas, professores e as regras da academia, seguindo as normas de higiene, pontualidade e disciplina exigidas.\n\n5. IMAGEM\nO aluno autoriza o uso de sua imagem em fotos e v├¡deos produzidos durante os treinos para fins de divulga├º├úo nas redes sociais da academia, podendo revogar essa autoriza├º├úo a qualquer momento mediante solicita├º├úo.\n\n6. PAGAMENTOS\nO aluno compromete-se a manter os pagamentos em dia conforme o plano escolhido. O n├úo pagamento poder├í resultar na suspens├úo do acesso ├ás aulas.\n\nAo confirmar a matr├¡cula ou participa├º├úo, o aluno declara ter lido, compreendido e concordado com todos os termos acima.	[]	f
anDbL8Nf61fn2p_k5jhdd	foda	foda@foda.com	$2b$10$ZGih.iS0DKvcMIeg.G06f.GMloJFhuKi9fHh4IjMKA6mab5OBj.7q	/uploads/professores/foda/perfil/AmCYwRAxtkwSxqCFR-n5e.jpeg	Preta	0	Tester	kogLjyu1wVBilVhdCD6pq		\N	\N	\N	\N	\N	\N	\N	0	0	0	0	\N	\N	f	professor	\N	\N	\N	\N	\N	/uploads/professores/foda/perfil/AmCYwRAxtkwSxqCFR-n5e.jpeg	[]	[]	\N	2026-06-16 04:18:27.174721	\N	\N	\N	\N	\N	f	f	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	[]	\N	[]	f
\.


--
-- Data for Name: whatsapp_instances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.whatsapp_instances (id, professor_uid, instance_name, status, phone, created_at, updated_at) FROM stdin;
qcC0iiM-G73C_XWhm_KGe	Ool58qGfkawpIAGDRVJoh	bjjrats_Ool58qGfkawpIAGDRVJoh	connected	\N	2026-06-12 01:08:19.587062	2026-06-12 01:08:19.587062
7s9GYJFagfWpspVhKDfxo	kogLjyu1wVBilVhdCD6pq	bjjrats_academy_kogLjyu1wVBilVhdCD6pq	connected	\N	2026-06-16 05:26:36.110774	2026-06-16 05:26:36.110774
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: -
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, false);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: academy_professor_links academy_professor_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_professor_links
    ADD CONSTRAINT academy_professor_links_pkey PRIMARY KEY (id);


--
-- Name: academy_requests academy_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_requests
    ADD CONSTRAINT academy_requests_pkey PRIMARY KEY (id);


--
-- Name: academy_student_professor_assignments academy_student_professor_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_student_professor_assignments
    ADD CONSTRAINT academy_student_professor_assignments_pkey PRIMARY KEY (id);


--
-- Name: announcement_dismissals announcement_dismissals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_dismissals
    ADD CONSTRAINT announcement_dismissals_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: challenges challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);


--
-- Name: class_check_ins class_check_ins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_check_ins
    ADD CONSTRAINT class_check_ins_pkey PRIMARY KEY (id);


--
-- Name: class_schedules class_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_schedules
    ADD CONSTRAINT class_schedules_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: competitions competitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: extra_trainings extra_trainings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extra_trainings
    ADD CONSTRAINT extra_trainings_pkey PRIMARY KEY (id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: plans plans_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_slug_unique UNIQUE (slug);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: trainings trainings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (uid);


--
-- Name: whatsapp_instances whatsapp_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_instances
    ADD CONSTRAINT whatsapp_instances_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_instances whatsapp_instances_professor_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_instances
    ADD CONSTRAINT whatsapp_instances_professor_uid_key UNIQUE (professor_uid);


--
-- Name: idx_academy_professor_link; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_academy_professor_link ON public.academy_professor_links USING btree (academy_uid, professor_uid);


--
-- Name: idx_academy_student_professor_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_academy_student_professor_assignment ON public.academy_student_professor_assignments USING btree (academy_uid, professor_uid, student_uid);


--
-- Name: idx_announcement_dismissal; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_announcement_dismissal ON public.announcement_dismissals USING btree (announcement_id, user_uid);


--
-- Name: academy_professor_links academy_professor_links_academy_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_professor_links
    ADD CONSTRAINT academy_professor_links_academy_uid_fkey FOREIGN KEY (academy_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: academy_professor_links academy_professor_links_created_by_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_professor_links
    ADD CONSTRAINT academy_professor_links_created_by_uid_fkey FOREIGN KEY (created_by_uid) REFERENCES public.users(uid) ON DELETE SET NULL;


--
-- Name: academy_professor_links academy_professor_links_professor_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_professor_links
    ADD CONSTRAINT academy_professor_links_professor_uid_fkey FOREIGN KEY (professor_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: academy_requests academy_requests_professor_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_requests
    ADD CONSTRAINT academy_requests_professor_uid_users_uid_fk FOREIGN KEY (professor_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: academy_requests academy_requests_student_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_requests
    ADD CONSTRAINT academy_requests_student_uid_users_uid_fk FOREIGN KEY (student_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: academy_student_professor_assignments academy_student_professor_assignments_academy_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_student_professor_assignments
    ADD CONSTRAINT academy_student_professor_assignments_academy_uid_fkey FOREIGN KEY (academy_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: academy_student_professor_assignments academy_student_professor_assignments_created_by_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_student_professor_assignments
    ADD CONSTRAINT academy_student_professor_assignments_created_by_uid_fkey FOREIGN KEY (created_by_uid) REFERENCES public.users(uid) ON DELETE SET NULL;


--
-- Name: academy_student_professor_assignments academy_student_professor_assignments_professor_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_student_professor_assignments
    ADD CONSTRAINT academy_student_professor_assignments_professor_uid_fkey FOREIGN KEY (professor_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: academy_student_professor_assignments academy_student_professor_assignments_student_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academy_student_professor_assignments
    ADD CONSTRAINT academy_student_professor_assignments_student_uid_fkey FOREIGN KEY (student_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: announcement_dismissals announcement_dismissals_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_dismissals
    ADD CONSTRAINT announcement_dismissals_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;


--
-- Name: announcement_dismissals announcement_dismissals_user_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_dismissals
    ADD CONSTRAINT announcement_dismissals_user_uid_fkey FOREIGN KEY (user_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: challenges challenges_creator_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_creator_uid_users_uid_fk FOREIGN KEY (creator_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: class_check_ins class_check_ins_schedule_id_class_schedules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_check_ins
    ADD CONSTRAINT class_check_ins_schedule_id_class_schedules_id_fk FOREIGN KEY (schedule_id) REFERENCES public.class_schedules(id) ON DELETE SET NULL;


--
-- Name: class_check_ins class_check_ins_student_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_check_ins
    ADD CONSTRAINT class_check_ins_student_uid_users_uid_fk FOREIGN KEY (student_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: class_schedules class_schedules_professor_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_schedules
    ADD CONSTRAINT class_schedules_professor_uid_users_uid_fk FOREIGN KEY (professor_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: comments comments_author_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_uid_users_uid_fk FOREIGN KEY (author_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: comments comments_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: competitions competitions_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_uid_users_uid_fk FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_professor_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_professor_uid_users_uid_fk FOREIGN KEY (professor_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_student_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_uid_users_uid_fk FOREIGN KEY (student_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: events events_creator_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_creator_uid_users_uid_fk FOREIGN KEY (creator_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: extra_trainings extra_trainings_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extra_trainings
    ADD CONSTRAINT extra_trainings_uid_users_uid_fk FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: goals goals_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_uid_users_uid_fk FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: notifications notifications_to_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_to_uid_users_uid_fk FOREIGN KEY (to_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: payments payments_professor_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_professor_uid_users_uid_fk FOREIGN KEY (professor_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: payments payments_student_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_student_uid_users_uid_fk FOREIGN KEY (student_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: posts posts_author_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_uid_users_uid_fk FOREIGN KEY (author_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: promotions promotions_professor_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_professor_uid_users_uid_fk FOREIGN KEY (professor_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: promotions promotions_student_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_student_uid_users_uid_fk FOREIGN KEY (student_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_user_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_uid_users_uid_fk FOREIGN KEY (user_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: trainings trainings_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_uid_users_uid_fk FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_uid_users_uid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_uid_users_uid_fk FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- Name: whatsapp_instances whatsapp_instances_professor_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_instances
    ADD CONSTRAINT whatsapp_instances_professor_uid_fkey FOREIGN KEY (professor_uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict J0pKv23dECKy4B7jiDcoDzq5YZkWBttvkRpRZnQkX0IPSU1cFVmOOlxcbqEkpX2

