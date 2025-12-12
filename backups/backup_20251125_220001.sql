--
-- PostgreSQL database dump
--

\restrict NcGLONoJBstjF42NAVG0BRkd6GZUj8OMVpLItF5bhFwX0Kbc0FUJO51djolravp

-- Dumped from database version 15.15
-- Dumped by pg_dump version 17.7

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'LIBRARIAN',
    'MONITOR'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: TaskPriority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TaskPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE public."TaskPriority" OWNER TO postgres;

--
-- Name: TaskStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TaskStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'CANNOT_COMPLETE'
);


ALTER TYPE public."TaskStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "authorId" text NOT NULL,
    "authorName" text NOT NULL,
    "imageUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "actorId" text NOT NULL,
    "targetUserId" text,
    action text NOT NULL,
    details text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calendar_events (
    id text NOT NULL,
    title text NOT NULL,
    "typeId" text NOT NULL,
    "startDate" text NOT NULL,
    "endDate" text NOT NULL,
    "allDay" boolean DEFAULT false NOT NULL,
    "periodStart" integer,
    "periodEnd" integer,
    description text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.calendar_events OWNER TO postgres;

--
-- Name: checkin_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.checkin_codes (
    id text NOT NULL,
    code text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.checkin_codes OWNER TO postgres;

--
-- Name: event_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_types (
    id text NOT NULL,
    name text NOT NULL,
    color text NOT NULL,
    icon text,
    "closesLibrary" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.event_types OWNER TO postgres;

--
-- Name: kiosk_checkins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kiosk_checkins (
    id text NOT NULL,
    "monitorId" text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.kiosk_checkins OWNER TO postgres;

--
-- Name: laptop_checkouts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.laptop_checkouts (
    id text NOT NULL,
    "laptopId" text NOT NULL,
    "borrowerName" text NOT NULL,
    ossis text,
    "checkedOutAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "checkedInAt" timestamp(3) without time zone,
    "checkedOutById" text,
    "checkedInById" text
);


ALTER TABLE public.laptop_checkouts OWNER TO postgres;

--
-- Name: laptops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.laptops (
    id text NOT NULL,
    number integer NOT NULL,
    "isAccessible" boolean DEFAULT true NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.laptops OWNER TO postgres;

--
-- Name: magazine_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.magazine_logs (
    id text NOT NULL,
    "magazineId" text NOT NULL,
    "weekIdentifier" text NOT NULL,
    "checkedByMonitorId" text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.magazine_logs OWNER TO postgres;

--
-- Name: magazines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.magazines (
    id text NOT NULL,
    title text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.magazines OWNER TO postgres;

--
-- Name: monitor_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monitor_logs (
    id text NOT NULL,
    "monitorId" text NOT NULL,
    "monitorName" text NOT NULL,
    date text NOT NULL,
    period integer NOT NULL,
    "checkIn" text,
    "checkOut" text,
    "durationMinutes" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.monitor_logs OWNER TO postgres;

--
-- Name: period_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.period_definitions (
    id text NOT NULL,
    period integer NOT NULL,
    duration integer NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.period_definitions OWNER TO postgres;

--
-- Name: shift_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shift_assignments (
    id text NOT NULL,
    "shiftId" text NOT NULL,
    "monitorId" text NOT NULL
);


ALTER TABLE public.shift_assignments OWNER TO postgres;

--
-- Name: shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shifts (
    id text NOT NULL,
    date text NOT NULL,
    period integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.shifts OWNER TO postgres;

--
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_assignments (
    id text NOT NULL,
    "taskId" text NOT NULL,
    "monitorId" text NOT NULL
);


ALTER TABLE public.task_assignments OWNER TO postgres;

--
-- Name: task_statuses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_statuses (
    id text NOT NULL,
    "taskId" text NOT NULL,
    "monitorId" text NOT NULL,
    status public."TaskStatus" NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.task_statuses OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    priority public."TaskPriority" NOT NULL,
    "dueDate" text NOT NULL,
    "dueTime" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public."Role" NOT NULL,
    "profilePicture" text,
    "backgroundColor" text,
    "themePreferences" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d81a52cd-bd53-4763-a2a7-4d0e42ea0b8c	dc597ff3568c156ae516090cc349e2e701fe25aec9499c31f902b0e60ee56895	\N	20240101000000_monitor_terminology_update	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20240101000000_monitor_terminology_update\n\nDatabase error code: 42P01\n\nDatabase error:\nERROR: relation "shift_assignments" does not exist\n\nPosition:\n[1m  0[0m\n[1m  1[0m -- Update existing data to use monitor terminology\n[1m  2[0m -- This migration updates all volunteer references to monitor\n[1m  3[0m\n[1m  4[0m -- First, update the shift assignments table\n[1m  5[1;31m UPDATE shift_assignments SET monitor_id = volunteer_id WHERE volunteer_id IS NOT NULL;[0m\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P01), message: "relation \\"shift_assignments\\" does not exist", detail: None, hint: None, position: Some(Original(171)), where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("parse_relation.c"), line: Some(1392), routine: Some("parserOpenTable") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20240101000000_monitor_terminology_update"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20240101000000_monitor_terminology_update"\n             at schema-engine/core/src/commands/apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:226	\N	2025-11-21 06:12:13.9846+00	0
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, title, content, "authorId", "authorName", "imageUrl", "createdAt", "updatedAt") FROM stdin;
sample-announcement	Welcome Back!	Welcome back to a new school year! We are excited to have our monitors back in the library.	cmi8gwxug0000142tv3l82bi4	Dr. Anya Sharma	\N	2025-11-21 06:17:12.566	2025-11-21 06:17:12.566
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, "actorId", "targetUserId", action, details, "createdAt") FROM stdin;
cmi8gzmvs000513iag9nah6wz	cmi8gwxug0000142tv3l82bi4	cmi8gwxug0000142tv3l82bi4	USER_UPDATED	{"beforeRole":"LIBRARIAN","afterRole":"LIBRARIAN","name":"Dr. Anya Sharma","email":"admin@school.edu","profilePicture":"https://picsum.photos/seed/librarian/100/100","backgroundColor":"#f3f4f6"}	2025-11-21 06:19:18.041
cmi8gzq00000713iardj83xxw	cmi8gwxug0000142tv3l82bi4	cmi8gwxug0000142tv3l82bi4	USER_UPDATED	{"beforeRole":"LIBRARIAN","afterRole":"LIBRARIAN","name":"Dr. Anya Sharma","email":"admin@school.edu","profilePicture":"https://picsum.photos/seed/librarian/100/100","backgroundColor":"#f3f4f6"}	2025-11-21 06:19:22.08
cmi8gztjl000913iapizzsy41	cmi8gwxug0000142tv3l82bi4	cmi8gwxug0000142tv3l82bi4	USER_UPDATED	{"beforeRole":"LIBRARIAN","afterRole":"LIBRARIAN","name":"Dr. Anya Sharma","email":"admin@school.edu","profilePicture":"https://picsum.photos/seed/librarian/100/100","backgroundColor":"#f3f4f6"}	2025-11-21 06:19:26.674
cmi8h000d000b13iapz7qhgx5	cmi8gwxug0000142tv3l82bi4	cmi8gwxug0000142tv3l82bi4	USER_UPDATED	{"beforeRole":"LIBRARIAN","afterRole":"LIBRARIAN","name":"Dr. Anya Sharma","email":"admin@school.edu","profilePicture":"https://picsum.photos/seed/librarian/100/100","backgroundColor":"#f3f4f6"}	2025-11-21 06:19:35.053
\.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calendar_events (id, title, "typeId", "startDate", "endDate", "allDay", "periodStart", "periodEnd", description, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: checkin_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.checkin_codes (id, code, "createdAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: event_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_types (id, name, color, icon, "closesLibrary", "createdAt", "updatedAt") FROM stdin;
cmi8gziki000013iay283jwrq	Closure	#ef4444	ban	t	2025-11-21 06:19:12.45	2025-11-21 06:19:12.45
cmi8gziki000113iao6wltmh8	Holiday	#f59e0b	calendar	t	2025-11-21 06:19:12.45	2025-11-21 06:19:12.45
cmi8gziki000213ia2t35hcdr	General Event	#3b82f6	dot	f	2025-11-21 06:19:12.45	2025-11-21 06:19:12.45
cmi8gziki000313ia1m3udkd0	Maintenance	#10b981	wrench	t	2025-11-21 06:19:12.45	2025-11-21 06:19:12.45
\.


--
-- Data for Name: kiosk_checkins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kiosk_checkins (id, "monitorId", "timestamp") FROM stdin;
\.


--
-- Data for Name: laptop_checkouts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.laptop_checkouts (id, "laptopId", "borrowerName", ossis, "checkedOutAt", "checkedInAt", "checkedOutById", "checkedInById") FROM stdin;
\.


--
-- Data for Name: laptops; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.laptops (id, number, "isAccessible", note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: magazine_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.magazine_logs (id, "magazineId", "weekIdentifier", "checkedByMonitorId", "timestamp") FROM stdin;
\.


--
-- Data for Name: magazines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.magazines (id, title, "createdAt", "updatedAt") FROM stdin;
cmi8gwy22000j142te77whqoo	National Geographic	2025-11-21 06:17:12.555	2025-11-21 06:17:12.555
cmi8gwy27000k142t8aqm765d	Time Magazine	2025-11-21 06:17:12.559	2025-11-21 06:17:12.559
cmi8gwy2a000l142tpz56k3n6	Scientific American	2025-11-21 06:17:12.563	2025-11-21 06:17:12.563
\.


--
-- Data for Name: monitor_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monitor_logs (id, "monitorId", "monitorName", date, period, "checkIn", "checkOut", "durationMinutes", "createdAt", "updatedAt") FROM stdin;
cmi8gwy2y000z142t5ytddo6y	cmi8gwy0o0001142tulwk5rxv	Ben Carter	2024-07-22	3	10:05	10:50	45	2025-11-21 06:17:12.586	2025-11-21 06:17:12.586
cmi8gwy310011142teooblw3n	cmi8gwy0t0002142t2yeef2sy	Chloe Davis	2024-07-22	4	11:00	11:45	45	2025-11-21 06:17:12.59	2025-11-21 06:17:12.59
\.


--
-- Data for Name: period_definitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.period_definitions (id, period, duration, "startTime", "endTime", "createdAt", "updatedAt") FROM stdin;
cmi8gwy0y0003142tapppvljm	0	45	07:00	07:45	2025-11-21 06:17:12.514	2025-11-22 05:51:41.919
cmi8gwy110004142t58wam1d9	1	46	08:00	08:46	2025-11-21 06:17:12.518	2025-11-22 05:51:41.922
cmi8gwy150005142tb8m7yj8e	2	46	08:49	09:35	2025-11-21 06:17:12.521	2025-11-22 05:51:41.926
cmi8gwy180006142thtvbahp5	3	46	09:38	10:24	2025-11-21 06:17:12.524	2025-11-22 05:51:41.929
cmi8gwy1b0007142tci0y2o13	4	46	10:27	11:13	2025-11-21 06:17:12.527	2025-11-22 05:51:41.932
cmi8gwy1e0008142t3wxu563m	5	46	11:16	12:02	2025-11-21 06:17:12.53	2025-11-22 05:51:41.935
cmi8gwy1h0009142tb8ygs102	6	46	12:05	12:51	2025-11-21 06:17:12.533	2025-11-22 05:51:41.938
cmi8gwy1k000a142tcm0jt8xy	7	46	12:54	13:40	2025-11-21 06:17:12.537	2025-11-22 05:51:41.941
cmi8gwy1n000b142tcrxjr59h	8	46	13:43	14:29	2025-11-21 06:17:12.539	2025-11-22 05:51:41.944
cmi8gwy1q000c142tanncdgxv	9	46	14:32	15:18	2025-11-21 06:17:12.542	2025-11-22 05:51:41.947
\.


--
-- Data for Name: shift_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shift_assignments (id, "shiftId", "monitorId") FROM stdin;
cmi9vo88r0002aftfuso0q2rm	cmi9vo88p0000aftff7gg8xgn	cmi8gwy0t0002142t2yeef2sy
cmi9vs52y0000wpmsfssirflz	cmi8gwy1t000d142tya0ld3qq	cmi8gwy0o0001142tulwk5rxv
cmi9vs5360001wpms1mwrx9g9	cmi8gwy1z000g142t3wpbuw51	cmi8gwy0t0002142t2yeef2sy
cmi9vs53d0002wpmsrtwedj0t	cmi8h1okz000010n93jad9n3a	cmi8gwy0o0001142tulwk5rxv
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shifts (id, date, period, "createdAt", "updatedAt") FROM stdin;
cmi8gwy1t000d142tya0ld3qq	2024-07-29	3	2025-11-21 06:17:12.545	2025-11-21 06:17:12.545
cmi8gwy1z000g142t3wpbuw51	2024-07-29	4	2025-11-21 06:17:12.551	2025-11-21 06:17:12.551
cmi8h1okz000010n93jad9n3a	2025-11-17	0	2025-11-21 06:20:53.555	2025-11-21 06:20:53.555
cmi9vo88p0000aftff7gg8xgn	2025-11-18	1	2025-11-22 05:58:06.266	2025-11-22 05:58:06.266
\.


--
-- Data for Name: task_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_assignments (id, "taskId", "monitorId") FROM stdin;
cmi8gwy2j000o142t87ad98d9	cmi8gwy2j000m142t1eh0pvuj	cmi8gwy0o0001142tulwk5rxv
cmi8gwy2j000p142tlq9r868g	cmi8gwy2j000m142t1eh0pvuj	cmi8gwy0t0002142t2yeef2sy
cmi8gwy2t000v142tu6dazc1z	cmi8gwy2t000t142t41p3ms00	cmi8gwy0o0001142tulwk5rxv
\.


--
-- Data for Name: task_statuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_statuses (id, "taskId", "monitorId", status, "completedAt", "createdAt", "updatedAt") FROM stdin;
cmi8gwy2j000r142tl3ms2sy8	cmi8gwy2j000m142t1eh0pvuj	cmi8gwy0o0001142tulwk5rxv	PENDING	\N	2025-11-21 06:17:12.571	2025-11-21 06:17:12.571
cmi8gwy2j000s142tykdh1d7z	cmi8gwy2j000m142t1eh0pvuj	cmi8gwy0t0002142t2yeef2sy	PENDING	\N	2025-11-21 06:17:12.571	2025-11-21 06:17:12.571
cmi8gwy2t000x142tp97n65g9	cmi8gwy2t000t142t41p3ms00	cmi8gwy0o0001142tulwk5rxv	COMPLETED	2025-11-21 06:17:12.58	2025-11-21 06:17:12.581	2025-11-21 06:17:12.581
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (id, title, description, priority, "dueDate", "dueTime", "createdAt", "updatedAt") FROM stdin;
cmi8gwy2j000m142t1eh0pvuj	Organize Biography Section	Please organize the biography section (920-929) alphabetically by subject last name.	MEDIUM	2024-08-15	\N	2025-11-21 06:17:12.571	2025-11-21 06:17:12.571
cmi8gwy2t000t142t41p3ms00	Prepare New Book Cart	Get the cart of new books ready for shelving. This includes stamping and adding security tags.	HIGH	2024-08-01	\N	2025-11-21 06:17:12.581	2025-11-21 06:17:12.581
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, role, "profilePicture", "backgroundColor", "themePreferences", "createdAt", "updatedAt") FROM stdin;
cmi8gwy0o0001142tulwk5rxv	Ben Carter	ben@student.school.edu	$2a$12$WCwepxHFtJYXKT2FSWkqEuKyVvZ2ZcPzUnZ8/JWjJJSaCDmvEy7ei	MONITOR	https://picsum.photos/seed/ben/100/100	#f3f4f6	\N	2025-11-21 06:17:12.505	2025-11-21 06:17:12.505
cmi8gwy0t0002142t2yeef2sy	Chloe Davis	chloe@student.school.edu	$2a$12$WCwepxHFtJYXKT2FSWkqEuKyVvZ2ZcPzUnZ8/JWjJJSaCDmvEy7ei	MONITOR	https://picsum.photos/seed/chloe/100/100	#f3f4f6	\N	2025-11-21 06:17:12.51	2025-11-21 06:17:12.51
cmi8gwxug0000142tv3l82bi4	Dr. Anya Sharma	admin@school.edu	$2a$12$D4Qh6VMJNzfZZ.eolOp.xeXBI2PDVVisBLfgjrq.6FyQVB9Qqj8Le	LIBRARIAN	https://picsum.photos/seed/librarian/100/100	#f3f4f6	{"mode": "light", "primary": "#2563eb", "secondary": "#64748b", "background": "#f9fafb", "textPrimary": "#111827", "textSecondary": "#6b7280"}	2025-11-21 06:17:12.281	2025-11-21 06:19:35.041
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: checkin_codes checkin_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checkin_codes
    ADD CONSTRAINT checkin_codes_pkey PRIMARY KEY (id);


--
-- Name: event_types event_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_pkey PRIMARY KEY (id);


--
-- Name: kiosk_checkins kiosk_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kiosk_checkins
    ADD CONSTRAINT kiosk_checkins_pkey PRIMARY KEY (id);


--
-- Name: laptop_checkouts laptop_checkouts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laptop_checkouts
    ADD CONSTRAINT laptop_checkouts_pkey PRIMARY KEY (id);


--
-- Name: laptops laptops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laptops
    ADD CONSTRAINT laptops_pkey PRIMARY KEY (id);


--
-- Name: magazine_logs magazine_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.magazine_logs
    ADD CONSTRAINT magazine_logs_pkey PRIMARY KEY (id);


--
-- Name: magazines magazines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.magazines
    ADD CONSTRAINT magazines_pkey PRIMARY KEY (id);


--
-- Name: monitor_logs monitor_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monitor_logs
    ADD CONSTRAINT monitor_logs_pkey PRIMARY KEY (id);


--
-- Name: period_definitions period_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_definitions
    ADD CONSTRAINT period_definitions_pkey PRIMARY KEY (id);


--
-- Name: shift_assignments shift_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_assignments
    ADD CONSTRAINT shift_assignments_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- Name: task_statuses task_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_statuses
    ADD CONSTRAINT task_statuses_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: announcements_authorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "announcements_authorId_idx" ON public.announcements USING btree ("authorId");


--
-- Name: announcements_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "announcements_createdAt_idx" ON public.announcements USING btree ("createdAt");


--
-- Name: audit_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_logs_createdAt_idx" ON public.audit_logs USING btree ("createdAt");


--
-- Name: calendar_events_endDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "calendar_events_endDate_idx" ON public.calendar_events USING btree ("endDate");


--
-- Name: calendar_events_startDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "calendar_events_startDate_idx" ON public.calendar_events USING btree ("startDate");


--
-- Name: checkin_codes_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checkin_codes_code_idx ON public.checkin_codes USING btree (code);


--
-- Name: checkin_codes_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX checkin_codes_code_key ON public.checkin_codes USING btree (code);


--
-- Name: checkin_codes_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "checkin_codes_expiresAt_idx" ON public.checkin_codes USING btree ("expiresAt");


--
-- Name: event_types_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX event_types_name_key ON public.event_types USING btree (name);


--
-- Name: kiosk_checkins_monitorId_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "kiosk_checkins_monitorId_timestamp_idx" ON public.kiosk_checkins USING btree ("monitorId", "timestamp");


--
-- Name: laptop_checkouts_laptopId_checkedInAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "laptop_checkouts_laptopId_checkedInAt_idx" ON public.laptop_checkouts USING btree ("laptopId", "checkedInAt");


--
-- Name: laptops_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX laptops_number_key ON public.laptops USING btree (number);


--
-- Name: magazine_logs_magazineId_weekIdentifier_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "magazine_logs_magazineId_weekIdentifier_key" ON public.magazine_logs USING btree ("magazineId", "weekIdentifier");


--
-- Name: magazines_title_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX magazines_title_key ON public.magazines USING btree (title);


--
-- Name: monitor_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "monitor_logs_createdAt_idx" ON public.monitor_logs USING btree ("createdAt");


--
-- Name: monitor_logs_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX monitor_logs_date_idx ON public.monitor_logs USING btree (date);


--
-- Name: monitor_logs_monitorId_date_period_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "monitor_logs_monitorId_date_period_key" ON public.monitor_logs USING btree ("monitorId", date, period);


--
-- Name: monitor_logs_monitorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "monitor_logs_monitorId_idx" ON public.monitor_logs USING btree ("monitorId");


--
-- Name: period_definitions_period_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX period_definitions_period_key ON public.period_definitions USING btree (period);


--
-- Name: shift_assignments_shiftId_monitorId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "shift_assignments_shiftId_monitorId_key" ON public.shift_assignments USING btree ("shiftId", "monitorId");


--
-- Name: shifts_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shifts_date_idx ON public.shifts USING btree (date);


--
-- Name: shifts_date_period_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX shifts_date_period_key ON public.shifts USING btree (date, period);


--
-- Name: shifts_period_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shifts_period_idx ON public.shifts USING btree (period);


--
-- Name: task_assignments_taskId_monitorId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "task_assignments_taskId_monitorId_key" ON public.task_assignments USING btree ("taskId", "monitorId");


--
-- Name: task_statuses_taskId_monitorId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "task_statuses_taskId_monitorId_key" ON public.task_statuses USING btree ("taskId", "monitorId");


--
-- Name: tasks_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tasks_createdAt_idx" ON public.tasks USING btree ("createdAt");


--
-- Name: tasks_dueDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tasks_dueDate_idx" ON public.tasks USING btree ("dueDate");


--
-- Name: tasks_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_priority_idx ON public.tasks USING btree (priority);


--
-- Name: users_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "users_createdAt_idx" ON public.users USING btree ("createdAt");


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- Name: announcements announcements_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT "announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_targetUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT "calendar_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_typeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT "calendar_events_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES public.event_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: kiosk_checkins kiosk_checkins_monitorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kiosk_checkins
    ADD CONSTRAINT "kiosk_checkins_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: laptop_checkouts laptop_checkouts_checkedInById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laptop_checkouts
    ADD CONSTRAINT "laptop_checkouts_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: laptop_checkouts laptop_checkouts_checkedOutById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laptop_checkouts
    ADD CONSTRAINT "laptop_checkouts_checkedOutById_fkey" FOREIGN KEY ("checkedOutById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: laptop_checkouts laptop_checkouts_laptopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laptop_checkouts
    ADD CONSTRAINT "laptop_checkouts_laptopId_fkey" FOREIGN KEY ("laptopId") REFERENCES public.laptops(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: magazine_logs magazine_logs_checkedByMonitorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.magazine_logs
    ADD CONSTRAINT "magazine_logs_checkedByMonitorId_fkey" FOREIGN KEY ("checkedByMonitorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: magazine_logs magazine_logs_magazineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.magazine_logs
    ADD CONSTRAINT "magazine_logs_magazineId_fkey" FOREIGN KEY ("magazineId") REFERENCES public.magazines(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: monitor_logs monitor_logs_monitorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monitor_logs
    ADD CONSTRAINT "monitor_logs_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shift_assignments shift_assignments_monitorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_assignments
    ADD CONSTRAINT "shift_assignments_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shift_assignments shift_assignments_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_assignments
    ADD CONSTRAINT "shift_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public.shifts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_monitorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT "task_assignments_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT "task_assignments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task_statuses task_statuses_monitorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_statuses
    ADD CONSTRAINT "task_statuses_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task_statuses task_statuses_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_statuses
    ADD CONSTRAINT "task_statuses_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict NcGLONoJBstjF42NAVG0BRkd6GZUj8OMVpLItF5bhFwX0Kbc0FUJO51djolravp

