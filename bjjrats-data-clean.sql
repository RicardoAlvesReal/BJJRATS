--
-- PostgreSQL database dump
--

\restrict ww8PiPGEO602SAm8jltbhzNE72ann228ho0xh3faxLxXdbgFoLYvVjsRuCuI7bY

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

--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: -
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users VALUES ('kE8gEO0Z8D87feOu0Geyj', 'Super Admin', 'admin@bjjrats.com', '$2b$10$N.TIDmwfrt1uxJ.aG5bYXunVvuROLDdCIxDtejcG4S.XTMV1N/nom', NULL, 'Preta', 0, '', NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, NULL, NULL, true, 'superadmin', NULL, NULL, NULL, NULL, NULL, NULL, '[]', '[]', 'KE8GEO', '2026-05-22 22:49:05.061392', NULL, NULL, NULL, NULL, NULL, false, false, NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, '[]', false);
INSERT INTO public.users VALUES ('-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', 'fulano@bjjrats.com', '$2b$10$t.BIMdraEYpQEGVG1ihAzOzKRJyRBeDvLGhPGhQ57rSzlsxst/TQ.', '/uploads/alunos/fulano-da-silva/perfil/btxvfdZWPo-d-QDNMvaPx.png', 'Preta', 0, '', '', '', NULL, NULL, '', '', '27996174965', NULL, '', 70, 3, 300, 1, '23/05/2026', 'competitor', false, 'student', NULL, NULL, NULL, NULL, NULL, NULL, '[]', '[]', '-QAPZL', '2026-05-23 00:02:27.08091', NULL, NULL, NULL, NULL, NULL, false, false, NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, '[]', false);
INSERT INTO public.users VALUES ('rQvrHb9aKoR7imOwfEmu_', 'lu', 'lu@lu.com', '$2b$10$gMkgO2bO8H8gox6XgaOGt.nzXVa8IAto6fYChe4MBZhcUY.zsLpqu', NULL, 'Branca', 0, 'Tester', NULL, 'Siclano da Silva', '1998-10-14', 'M', '75', '180', NULL, NULL, '2026-05-17', 0, 0, 0, 0, NULL, NULL, false, 'student', NULL, NULL, NULL, NULL, NULL, NULL, '[]', '[]', 'RQVRHB', '2026-05-26 00:02:39.578184', NULL, NULL, NULL, NULL, NULL, false, false, NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, '[]', false);
INSERT INTO public.users VALUES ('kogLjyu1wVBilVhdCD6pq', 'teste', 'teste@teste.com', '$2b$10$dtxPmnVefdo8WMtyQQIJ0eZW8zwgeCG43GaG/3AT.2X.QcZ4mIHRS', NULL, 'Branca', 0, '', NULL, '', NULL, NULL, NULL, NULL, '27996174965', NULL, NULL, 0, 0, 0, 0, NULL, NULL, true, 'academy', 'Tester', 'Rua Martins Fontes', 'Volta Redonda', 'RJ', '/uploads/academias/teste/perfil/kWojWgnMgfq8ubzjA_dbH.jpeg', NULL, '[]', '[]', NULL, '2026-05-27 22:45:29.692932', '28.029.146/0001-89', '27251-330', '75', 'Jardim Am├ília', NULL, true, false, NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, '[]', false);
INSERT INTO public.users VALUES ('V_HrBI2BTm0ACwSJvTb4O', 'aluno', 'aluno@aluno.com', '$2b$10$PpgHtznrKu84EpNoSlzVEOXnAbTio8UyXyLJzzDsN4vRaYzsZns2G', NULL, 'Branca', 4, 'Tester', 'kogLjyu1wVBilVhdCD6pq', '', NULL, NULL, NULL, NULL, '27996174965', NULL, NULL, 0, 0, 0, 0, NULL, NULL, false, 'student', '', '', '', '', NULL, NULL, '[]', '[]', NULL, '2026-05-27 23:21:29.920355', '', '', '', '', '', true, false, NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, '[]', false);
INSERT INTO public.users VALUES ('Ool58qGfkawpIAGDRVJoh', 'prof', 'professor@bjjrats.com', '$2b$10$jTnPoyUsRKXc4eYltNhMAeqgVu8SPHJKaX/dYdBbmsCg30Smchu72', '/uploads/professores/prof/perfil/K9wwFpdlZWnCDh18znrWl.png', 'Branca', 0, '', NULL, '', NULL, NULL, NULL, NULL, '27996174965', NULL, NULL, 0, 0, 0, 0, NULL, NULL, false, 'professor', NULL, '', '', '', NULL, '/uploads/professores/prof/perfil/K9wwFpdlZWnCDh18znrWl.png', '[]', '[]', NULL, '2026-05-30 12:51:33.93029', NULL, '', NULL, NULL, NULL, true, false, NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 'TERMO DE RESPONSABILIDADE E MATR├ìCULA

Ao realizar a matr├¡cula ou solicitar participa├º├úo em aulas, o aluno (ou respons├ível legal, no caso de menores de idade) declara estar ciente e de acordo com as seguintes condi├º├Áes:

1. RISCOS DA ATIVIDADE
O Jiu-Jitsu ├® uma arte marcial de contato que envolve riscos inerentes ├á pr├ítica, como quedas, tor├º├Áes e contato f├¡sico. O aluno declara estar em condi├º├Áes f├¡sicas adequadas para a pr├ítica e assume os riscos decorrentes.

2. RESPONSABILIDADE
A academia e o professor ficam isentos de responsabilidade por les├Áes decorrentes de acidentes durante os treinos, desde que n├úo haja neglig├¬ncia comprovada por parte dos instrutores.

3. SA├ÜDE
O aluno declara n├úo possuir contraindica├º├úo m├®dica para a pr├ítica de atividades f├¡sicas de alto impacto. Recomenda-se avalia├º├úo m├®dica pr├®via.

4. CONDUTA
O aluno compromete-se a respeitar colegas, professores e as regras da academia, seguindo as normas de higiene, pontualidade e disciplina exigidas.

5. IMAGEM
O aluno autoriza o uso de sua imagem em fotos e v├¡deos produzidos durante os treinos para fins de divulga├º├úo nas redes sociais da academia, podendo revogar essa autoriza├º├úo a qualquer momento mediante solicita├º├úo.

6. PAGAMENTOS
O aluno compromete-se a manter os pagamentos em dia conforme o plano escolhido. O n├úo pagamento poder├í resultar na suspens├úo do acesso ├ás aulas.

Ao confirmar a matr├¡cula ou participa├º├úo, o aluno declara ter lido, compreendido e concordado com todos os termos acima.', '[]', false);
INSERT INTO public.users VALUES ('anDbL8Nf61fn2p_k5jhdd', 'foda', 'foda@foda.com', '$2b$10$ZGih.iS0DKvcMIeg.G06f.GMloJFhuKi9fHh4IjMKA6mab5OBj.7q', '/uploads/professores/foda/perfil/AmCYwRAxtkwSxqCFR-n5e.jpeg', 'Preta', 0, 'Tester', 'kogLjyu1wVBilVhdCD6pq', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, NULL, NULL, false, 'professor', NULL, NULL, NULL, NULL, NULL, '/uploads/professores/foda/perfil/AmCYwRAxtkwSxqCFR-n5e.jpeg', '[]', '[]', NULL, '2026-06-16 04:18:27.174721', NULL, NULL, NULL, NULL, NULL, false, false, NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, '[]', false);


--
-- Data for Name: academy_professor_links; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.academy_professor_links VALUES ('iajlffZhwVfpnqpOIOJXP', 'kogLjyu1wVBilVhdCD6pq', 'anDbL8Nf61fn2p_k5jhdd', 'internal', 'active', NULL, 'kogLjyu1wVBilVhdCD6pq', '2026-06-16 04:18:27.180147', '2026-06-16 07:18:27.176', NULL, NULL);
INSERT INTO public.academy_professor_links VALUES ('fu8O7lnOLINvXZOGfm0Hd', 'kogLjyu1wVBilVhdCD6pq', 'Ool58qGfkawpIAGDRVJoh', 'partner', 'pending', NULL, 'kogLjyu1wVBilVhdCD6pq', '2026-06-16 23:19:15.903939', '2026-06-17 02:19:15.902', 50, NULL);


--
-- Data for Name: academy_requests; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.academy_requests VALUES ('dDXqHF3IlyRLt6IY6gD6_', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', 'aluno@aluno.com', NULL, 'Branca', 'kogLjyu1wVBilVhdCD6pq', 'Tester', 'accepted', '2026-06-07 23:10:20.165977');


--
-- Data for Name: academy_student_professor_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.academy_student_professor_assignments VALUES ('B19xzaSq2_i8KvO5pS7F8', 'kogLjyu1wVBilVhdCD6pq', 'anDbL8Nf61fn2p_k5jhdd', 'V_HrBI2BTm0ACwSJvTb4O', 'internal', 'active', 'aluno', 'foda', NULL, 'kogLjyu1wVBilVhdCD6pq', '2026-06-16 07:18:40.409', '2026-06-16 04:18:40.413265', '2026-06-16 07:18:40.409');


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: announcement_dismissals; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: challenges; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.challenges VALUES ('7k72G5puk6Ss1dk8n7fdv', 'Ool58qGfkawpIAGDRVJoh', 'Ool58qGfkawpIAGDRVJoh', 'dghghgdh', 'rgdtgtedgtg', 1, 'treinos', '2026-06-16', '2026-06-17', NULL, true, '[]', '2026-06-15 20:50:02.687276');
INSERT INTO public.challenges VALUES ('ebww8KI_aDFt1nZDnQqEH', 'kogLjyu1wVBilVhdCD6pq', 'kogLjyu1wVBilVhdCD6pq', 'hmgjmfhdg', 'hmjkyhfgdasfaef', 1, 'treinos', '2026-06-15', '2026-06-30', NULL, true, '[]', '2026-06-15 22:07:47.118898');


--
-- Data for Name: class_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.class_schedules VALUES ('1FuS_bXOllYu92xiKxbK4', 'Ool58qGfkawpIAGDRVJoh', 'Ool58qGfkawpIAGDRVJoh', NULL, NULL, NULL, NULL, NULL, '2026-06-15 02:24:32.426874', '[]', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.class_schedules VALUES ('a4WTcpSV8D1CtrvNSRb76', 'Ool58qGfkawpIAGDRVJoh', 'Ool58qGfkawpIAGDRVJoh', NULL, NULL, NULL, NULL, NULL, '2026-06-15 02:27:31.199632', '[]', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.class_schedules VALUES ('PRQN28a1QTl9nWIp6nd5i', 'Ool58qGfkawpIAGDRVJoh', 'Ool58qGfkawpIAGDRVJoh', NULL, NULL, NULL, NULL, NULL, '2026-06-15 02:34:20.227092', '["seg"]', '03:34', 'Geral', 'No-Gi', 'Misto', 60, 'dfgdb');
INSERT INTO public.class_schedules VALUES ('ltpXIhwTQt0997VLnz3Wy', 'Ool58qGfkawpIAGDRVJoh', 'Ool58qGfkawpIAGDRVJoh', NULL, NULL, NULL, NULL, NULL, '2026-06-15 02:39:34.834279', '["seg"]', '04:39', 'Geral', 'No-Gi', 'Feminino', 60, 'ghfghghghgh');
INSERT INTO public.class_schedules VALUES ('CVq9F20wcRffFAnjqS7_N', 'Ool58qGfkawpIAGDRVJoh', 'Ool58qGfkawpIAGDRVJoh', NULL, NULL, NULL, NULL, NULL, '2026-06-15 02:43:20.195087', '["seg"]', '05:43', 'Geral', 'No-Gi', 'Masculino', 60, 'fhgchjf');


--
-- Data for Name: class_check_ins; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.posts VALUES ('Y6oWXIzGWkoG3aAvYmbi0', '-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', NULL, 'Branca', '­ƒÑï Treino registrado ÔÇö 23/05/2026
­ƒÑï Aula Coletiva ┬À Gi ┬À 120min
ÔÜí +25 XP', '/uploads/suN2iNN4s2jZzflrsgBVz.png', NULL, 'community', NULL, '{"xp": 25, "date": "23/05/2026", "duration": 120, "modality": "gi", "sessionType": "aula_coletiva"}', '[]', '2026-05-23 00:34:02.603077', NULL, NULL);
INSERT INTO public.posts VALUES ('DH799a6S0WwLGeuv2rsKZ', '-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', NULL, 'Branca', '­ƒÑï Treino registrado ÔÇö 23/05/2026
­ƒÑï Aula Coletiva ┬À Gi ┬À 120min
ÔÜí +25 XP', '/uploads/suN2iNN4s2jZzflrsgBVz.png', NULL, 'community', NULL, '{"xp": 25, "date": "23/05/2026", "duration": 120, "modality": "gi", "sessionType": "aula_coletiva"}', '[]', '2026-05-23 00:34:18.518494', NULL, NULL);
INSERT INTO public.posts VALUES ('79WNTPv0hWi3zrZrFXvbY', '-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', NULL, 'Branca', '­ƒÑï Treino registrado ÔÇö 23/05/2026
­ƒÑï Aula Coletiva ┬À Gi ┬À 120min
ÔÜí +25 XP', '/uploads/suN2iNN4s2jZzflrsgBVz.png', NULL, 'community', NULL, '{"xp": 25, "date": "23/05/2026", "duration": 120, "modality": "gi", "sessionType": "aula_coletiva"}', '[]', '2026-05-23 00:34:22.035072', NULL, NULL);
INSERT INTO public.posts VALUES ('mo6_T45C5BNrZ-FNSQN95', '-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', NULL, 'Branca', '­ƒÑï Treino registrado ÔÇö 23/05/2026
­ƒÄ» Aula Particular ┬À Gi ┬À 60min
ÔÜí +20 XP', '/uploads/Vi1kjJI7if1HQhpQ07_Hc.png', NULL, 'community', NULL, '{"xp": 20, "date": "23/05/2026", "duration": 60, "modality": "gi", "sessionType": "aula_particular"}', '[]', '2026-05-23 00:48:11.325365', NULL, NULL);
INSERT INTO public.posts VALUES ('vMERtF_a0dJZdudRNam0w', '-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', NULL, 'Branca', '­ƒÑï Treino registrado ÔÇö 23/05/2026
­ƒÄ» Aula Particular ┬À Gi ┬À 60min
ÔÜí +20 XP', '/uploads/Vi1kjJI7if1HQhpQ07_Hc.png', NULL, 'community', NULL, '{"xp": 20, "date": "23/05/2026", "duration": 60, "modality": "gi", "sessionType": "aula_particular"}', '[]', '2026-05-23 00:48:14.405212', NULL, NULL);
INSERT INTO public.posts VALUES ('0XlietRBcM16yxQu4JKKt', '-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', NULL, 'Branca', '­ƒÑï Treino registrado ÔÇö 23/05/2026
­ƒÄ» Aula Particular ┬À Gi ┬À 60min
ÔÜí +20 XP', '/uploads/Vi1kjJI7if1HQhpQ07_Hc.png', NULL, 'community', NULL, '{"xp": 20, "date": "23/05/2026", "duration": 60, "modality": "gi", "sessionType": "aula_particular"}', '[]', '2026-05-23 00:48:16.277525', NULL, NULL);
INSERT INTO public.posts VALUES ('QuSnw51aeU7frYSTTUom4', '-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', '/uploads/9O25ns2CTNXPH0wwgEXNI.png', 'Preta', '­ƒÑï Treino registrado ÔÇö 23/05/2026
­ƒÑï Aula Coletiva ┬À Gi ┬À 120min
ÔÜí +25 XP', '', NULL, 'community', NULL, '{"xp": 25, "date": "23/05/2026", "duration": 120, "modality": "gi", "sessionType": "aula_coletiva"}', '[]', '2026-05-23 13:42:57.706615', NULL, NULL);
INSERT INTO public.posts VALUES ('YRiu7-mBlNuWEwlU2AYL1', '-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', '/uploads/alunos/fulano-da-silva/perfil/btxvfdZWPo-d-QDNMvaPx.png', 'Preta', '­ƒÑï Treino registrado ÔÇö 23/05/2026
­ƒÑï Aula Coletiva ┬À Gi ┬À 120min
ÔÜí +25 XP', '', NULL, 'community', NULL, '{"xp": 25, "date": "23/05/2026", "duration": 120, "modality": "gi", "sessionType": "aula_coletiva"}', '[]', '2026-05-23 13:51:47.535664', NULL, NULL);
INSERT INTO public.posts VALUES ('Fr-EJlw6cn0otAztxC75V', '-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', '/uploads/alunos/fulano-da-silva/perfil/btxvfdZWPo-d-QDNMvaPx.png', 'Preta', '­ƒÑï Treino registrado ÔÇö 23/05/2026
­ƒÑï Aula Coletiva ┬À Gi ┬À 120min
ÔÜí +25 XP', '', NULL, 'community', NULL, '{"xp": 25, "date": "23/05/2026", "duration": 120, "modality": "gi", "sessionType": "aula_coletiva"}', '[]', '2026-05-23 14:24:34.179198', NULL, NULL);
INSERT INTO public.posts VALUES ('wBK_gpmonfjbG8G9Ihw7B', '-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', '/uploads/alunos/fulano-da-silva/perfil/btxvfdZWPo-d-QDNMvaPx.png', 'Preta', '­ƒÑï Treino registrado ÔÇö 23/05/2026
­ƒÄ» Aula Particular ┬À Gi ┬À 60min
ÔÜí +20 XP', '', NULL, 'community', NULL, '{"xp": 20, "date": "23/05/2026", "duration": 60, "modality": "gi", "sessionType": "aula_particular"}', '[]', '2026-05-23 14:25:49.016052', NULL, NULL);
INSERT INTO public.posts VALUES ('jF7FgBNOWkhq0xL75rXRE', '-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', '/uploads/alunos/fulano-da-silva/perfil/btxvfdZWPo-d-QDNMvaPx.png', 'Preta', 'ghghgdchgh', '', NULL, 'community', NULL, NULL, '[]', '2026-05-23 14:26:14.728597', NULL, NULL);
INSERT INTO public.posts VALUES ('hSdSl406j_e5Z2wfe3zkk', '-qapzl2rZp0MxmS8_Y6ir', 'Fulano da Silva', '/uploads/alunos/fulano-da-silva/perfil/btxvfdZWPo-d-QDNMvaPx.png', 'Preta', 'ghgfhghd', '/uploads/alunos/fulano-da-silva/comunidade/XqwizPkReKD-OY__YVldk.png', NULL, 'community', NULL, NULL, '[]', '2026-05-23 14:27:06.512284', NULL, NULL);
INSERT INTO public.posts VALUES ('xxgIFPlP068C5EVyYvd0B', 'Ool58qGfkawpIAGDRVJoh', 'prof', '/uploads/professores/prof/perfil/K9wwFpdlZWnCDh18znrWl.png', 'Branca', 'dgh', NULL, NULL, 'academy', 'Ool58qGfkawpIAGDRVJoh', '{"category": "resultado"}', '[]', '2026-06-15 00:48:17.537418', NULL, NULL);
INSERT INTO public.posts VALUES ('26m34ycQ6tk8F3MhB5LRR', 'kogLjyu1wVBilVhdCD6pq', 'Tester', NULL, 'Branca', 'zdfhdghdghgdh', '', NULL, 'community', NULL, '{"category": "geral"}', '[]', '2026-06-16 21:30:44.073081', 'Tester', '/uploads/academias/teste/perfil/kWojWgnMgfq8ubzjA_dbH.jpeg');


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: competitions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.competitions VALUES ('rtVwN5PFZ4F93qt3e6Ngw', '-qapzl2rZp0MxmS8_Y6ir', 'copita', '2026-05-24', 'sff', 'ffb', NULL, 'gold', 'dcbgzgcb', '2026-05-24 23:49:38.588471');


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.enrollments VALUES ('is-VEEtlIp62bB2klmB6O', 'Ool58qGfkawpIAGDRVJoh', NULL, NULL, 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', 150, 5, 'active', '14707815731', '2026-06-10 21:01:10.966708');
INSERT INTO public.enrollments VALUES ('4_uliX597evoLo0C2tLi3', 'Ool58qGfkawpIAGDRVJoh', NULL, NULL, 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', 150, 5, 'active', '14707815731', '2026-06-10 22:18:07.797437');
INSERT INTO public.enrollments VALUES ('y1cmUvO9GyA7DobPmSINF', 'kogLjyu1wVBilVhdCD6pq', NULL, 'Tester', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', 150, 1, 'active', NULL, '2026-06-15 21:03:13.751771');


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.events VALUES ('4CyBPzn0PEov7Au_eNBPj', 'Ool58qGfkawpIAGDRVJoh', 'Ool58qGfkawpIAGDRVJoh', 'dgbdgg', 'gnddghdg', '2026-06-15', '20:05', 'Tester', NULL, true, '[]', '2026-06-15 19:05:39.249281', 'outro', 5, 'R$ 5.00', NULL, 'prof', '/uploads/professores/prof/perfil/K9wwFpdlZWnCDh18znrWl.png', '{}', '{}', false, '27251330', 'Rua Martins Fontes', '75', 'Jardim Am├ília', 'Volta Redonda', 'RJ', NULL, NULL);
INSERT INTO public.events VALUES ('sYzhRRIl9EJyPgD22MSG2', 'kogLjyu1wVBilVhdCD6pq', 'kogLjyu1wVBilVhdCD6pq', 'ghxfgh', 'fgjhdfyhjtg', '2026-06-17', '22:05', 'Tester', NULL, true, '[]', '2026-06-15 22:05:11.817116', 'competicao', 8, 'Gratuito', NULL, 'Tester', '', '{}', '{}', false, '27251330', 'Rua Martins Fontes', '75', 'Jardim Am├ília', 'Volta Redonda', 'RJ', NULL, NULL);


--
-- Data for Name: extra_trainings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: goals; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.notifications VALUES ('wStWhQDaGhFbTVcIK4Kuy', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 00:51:35.616379');
INSERT INTO public.notifications VALUES ('yzQXDxJoKUu6japIZT3dT', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 00:51:41.5288');
INSERT INTO public.notifications VALUES ('RfAWrIpesIj_VuztZng42', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 01:50:22.055948');
INSERT INTO public.notifications VALUES ('UfXMVFePl0NktjoPdWayb', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 01:50:46.378972');
INSERT INTO public.notifications VALUES ('qHg2_zWLkxKJHLUrZQbNm', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 01:55:57.079228');
INSERT INTO public.notifications VALUES ('cKu-_pftW9sKb-ISpuVOB', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 02:21:44.893712');
INSERT INTO public.notifications VALUES ('E1vAe-5qaEul1oCf0VNIH', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 02:45:09.851815');
INSERT INTO public.notifications VALUES ('0QnP-TlkOUypRZrBAWrdq', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 02:46:01.744632');
INSERT INTO public.notifications VALUES ('RsM8ZbTW3xAb6hqRZmB8b', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 03:17:15.503127');
INSERT INTO public.notifications VALUES ('ZtJjDjPdbXfXtuOqEBfOo', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 03:21:25.788642');
INSERT INTO public.notifications VALUES ('pM5tlsDRX5_ZDKZN2hYC1', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 04:00:52.550946');
INSERT INTO public.notifications VALUES ('T97r3jGFQA4_JyBxSEgyV', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 04:04:06.864384');
INSERT INTO public.notifications VALUES ('DxCtLO8xmWIevhRInb8MC', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 04:05:17.795684');
INSERT INTO public.notifications VALUES ('FYuUVSGudMyHov-C0Tn4a', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 04:24:23.245392');
INSERT INTO public.notifications VALUES ('6kfUb0-Dc9B9z1EbrrLJn', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-11 04:31:33.76511');
INSERT INTO public.notifications VALUES ('j09mKuxiZTDFnn5FCbkA5', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 00:08:05.301523');
INSERT INTO public.notifications VALUES ('iRod1gif_Q1-h2i6kd4y2', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 00:36:25.689783');
INSERT INTO public.notifications VALUES ('OevDxXq3WccQ15MAhrEmu', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 00:40:01.62715');
INSERT INTO public.notifications VALUES ('_r9PbbmDp0qQq0mkjWBK8', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 00:44:38.327278');
INSERT INTO public.notifications VALUES ('6sj4WW3RXx5EqFnd4bVZ-', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 00:59:57.423963');
INSERT INTO public.notifications VALUES ('XXxeNhIUdU79AG9RqCGZ2', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 01:07:53.978166');
INSERT INTO public.notifications VALUES ('nWS6jSZoC9-XYKNZzLez_', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 01:09:14.701544');
INSERT INTO public.notifications VALUES ('5XACFdkyON-ipjG_NO2zs', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 01:11:12.221682');
INSERT INTO public.notifications VALUES ('yw2sAhpNzyJrghSFlBT3J', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 01:17:24.249141');
INSERT INTO public.notifications VALUES ('ViY-VI1ltfSTPeGteL_-3', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 01:18:54.512345');
INSERT INTO public.notifications VALUES ('z9Z1xQbb_h7qsBoYmNiTD', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 02:03:04.665735');
INSERT INTO public.notifications VALUES ('OmRkpWQfli4WRQASXK565', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_overdue', 'Mensalidade em atraso ha 7 dia(s). Valor em aberto: R$ 150.00. Vencimento: 05/06/2026. Regularize para continuar treinando.', '{"amount": 150, "pixKey": "", "dueDate": "2026-06-05", "daysOverdue": 7}', false, '2026-06-12 02:03:32.365342');
INSERT INTO public.notifications VALUES ('N8i5eA8E7I8F78B1J4mb3', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 05:39:17.615415');
INSERT INTO public.notifications VALUES ('HX4iiuGl7OQV18iSDvlLh', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'payment_suspended', 'Seu acesso foi suspenso automaticamente apos 7 dia(s) de inadimplencia. Regularize sua mensalidade para voltar a treinar.', '{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "is-VEEtlIp62bB2klmB6O", "autoSuspendAfterDays": 1}', false, '2026-06-12 05:40:14.246698');
INSERT INTO public.notifications VALUES ('WPtaKtIO5ZM2-qWdU0aW6', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'payment_suspended', 'Seu acesso foi suspenso automaticamente apos 7 dia(s) de inadimplencia. Regularize sua mensalidade para voltar a treinar.', '{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 1}', false, '2026-06-12 05:40:14.577272');
INSERT INTO public.notifications VALUES ('Nv5mbFjyl2D4hmlDRtCRn', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'payment_suspended', 'Seu acesso foi suspenso automaticamente apos 7 dia(s) de inadimplencia. Regularize sua mensalidade para voltar a treinar.', '{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 2}', false, '2026-06-12 06:16:13.493319');
INSERT INTO public.notifications VALUES ('R81gBGPRiLqfV2GFAswsL', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'payment_suspended', 'Seu acesso foi suspenso automaticamente apos 7 dia(s) de inadimplencia. Regularize sua mensalidade para voltar a treinar.', '{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 2}', false, '2026-06-12 06:17:07.683922');
INSERT INTO public.notifications VALUES ('dFf1dH5fVnMsPVU7g4kHs', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'payment_suspended', 'Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 1 dia(s) de atraso. Atraso atual: 7 dia(s). Regularize sua mensalidade para voltar a treinar.', '{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 1}', false, '2026-06-12 06:21:18.194573');
INSERT INTO public.notifications VALUES ('0VbRCgscSiuLsJLQhAnwC', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'payment_suspended', 'Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 7 dia(s) de atraso. Atraso atual: 7 dia(s). Regularize sua mensalidade para voltar a treinar.', '{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 7}', false, '2026-06-12 06:41:29.18345');
INSERT INTO public.notifications VALUES ('kvRDdHEzZ1srWHXNY3xFD', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'payment_suspended', 'Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 7 dia(s) de atraso. Atraso atual: 7 dia(s). Regularize sua mensalidade para voltar a treinar.', '{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 7, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 7}', false, '2026-06-12 18:26:09.040185');
INSERT INTO public.notifications VALUES ('L8pmbjdHAabi6HqY589B6', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_overdue', 'Mensalidade em atraso ha 7 dia(s). Valor em aberto: R$ 150.00. Vencimento: 05/06/2026. Regularize para continuar treinando.', '{"amount": 150, "pixKey": "", "dueDate": "2026-06-05", "daysOverdue": 7}', false, '2026-06-12 18:26:17.265955');
INSERT INTO public.notifications VALUES ('W4a7n45yRTpRvor41f73t', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'low_frequency', 'Sentimos sua falta no tatame. Voce treinou 0 vezes em Junho. Que tal marcar presenca esta semana?', '{"monthName": "Junho", "trainingsCount": 0}', false, '2026-06-12 18:26:54.923267');
INSERT INTO public.notifications VALUES ('bJZ-f-NlOK_yqfafwppKj', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'low_frequency', 'Sentimos sua falta no tatame. Voce treinou 0 vezes em Junho. Que tal marcar presenca esta semana?', '{"monthName": "Junho", "trainingsCount": 0}', false, '2026-06-12 18:27:13.133066');
INSERT INTO public.notifications VALUES ('T8IDcrOqhSD016UxE65CF', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 150.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 150, "pixKey": "14707815731", "dueDate": "2026-06-05"}', false, '2026-06-12 18:31:21.644721');
INSERT INTO public.notifications VALUES ('jFjJ2TEZAoVzmLQQcMdvk', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'payment_suspended', 'Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 7 dia(s) de atraso. Atraso atual: 9 dia(s). Regularize sua mensalidade para voltar a treinar.', '{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 9, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 7}', false, '2026-06-14 23:09:39.179362');
INSERT INTO public.notifications VALUES ('m9zf8PTuUc1Sic6vPbjoa', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'promotion', '­ƒÅà VOC├è FOI PROMOVIDO! Parab├®ns! Voc├¬ foi promovido para Faixa Branca ┬À 1┬║ grau!', '{"belt": "Branca", "stripes": 1}', false, '2026-06-14 23:23:23.806439');
INSERT INTO public.notifications VALUES ('WKtyrwwnkGmjuWZCNP2vm', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'promotion', '­ƒÅà VOC├è FOI PROMOVIDO! Parab├®ns! Voc├¬ foi promovido para Faixa Branca ┬À 1┬║ grau!', '{"belt": "Branca", "stripes": 1}', false, '2026-06-14 23:23:36.759259');
INSERT INTO public.notifications VALUES ('39YmxHkOn6GezNOdpNmfi', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'promotion', '­ƒÅà VOC├è FOI PROMOVIDO! Parab├®ns! Voc├¬ foi promovido para Faixa Branca ┬À 2┬║ grau!', '{"belt": "Branca", "stripes": 2}', false, '2026-06-14 23:50:04.703577');
INSERT INTO public.notifications VALUES ('ge5Hr0JwX0CsVQw2HD7l6', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'payment_suspended', 'Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 7 dia(s) de atraso. Atraso atual: 9 dia(s). Regularize sua mensalidade para voltar a treinar.', '{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 9, "enrollmentId": "is-VEEtlIp62bB2klmB6O", "autoSuspendAfterDays": 7}', false, '2026-06-14 23:52:38.893695');
INSERT INTO public.notifications VALUES ('HIkP7eJoZTm3hxpiS6gIA', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'payment_suspended', 'Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 7 dia(s) de atraso. Atraso atual: 9 dia(s). Regularize sua mensalidade para voltar a treinar.', '{"paymentId": "RTL6DISasZqpSpTWbceiB", "daysOverdue": 9, "enrollmentId": "4_uliX597evoLo0C2tLi3", "autoSuspendAfterDays": 7}', false, '2026-06-14 23:52:39.292599');
INSERT INTO public.notifications VALUES ('uESdB3wqtYEy9y2RbkYhQ', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'payment_suspended', 'Sua matricula voltou para suspensao. Motivo: Pagamento estornado. Regularize a situacao para voltar a treinar.', '{"reason": "Pagamento estornado.", "academyName": null, "enrollmentId": "is-VEEtlIp62bB2klmB6O", "professorUid": "Ool58qGfkawpIAGDRVJoh"}', false, '2026-06-15 00:17:55.714702');
INSERT INTO public.notifications VALUES ('hjEAlbVZn-M6GytIWHtUl', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'payment_suspended', 'Sua matricula voltou para suspensao. Motivo: Pagamento estornado. Regularize a situacao para voltar a treinar.', '{"reason": "Pagamento estornado.", "academyName": null, "enrollmentId": "4_uliX597evoLo0C2tLi3", "professorUid": "Ool58qGfkawpIAGDRVJoh"}', false, '2026-06-15 00:18:17.346477');
INSERT INTO public.notifications VALUES ('icfGlCGsj_svxsHVOtlUe', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'enrollment_reactivated', 'Sua matricula foi reativada. Voce esta ativo novamente e ja pode voltar aos treinos.', '{"academyName": null, "enrollmentId": "is-VEEtlIp62bB2klmB6O", "professorUid": "Ool58qGfkawpIAGDRVJoh"}', false, '2026-06-15 00:19:36.433875');
INSERT INTO public.notifications VALUES ('dWpIUXrQ2y1x5IYiwZGYl', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', 'Professor', 'enrollment_reactivated', 'Sua matricula foi reativada. Voce esta ativo novamente e ja pode voltar aos treinos.', '{"academyName": null, "enrollmentId": "4_uliX597evoLo0C2tLi3", "professorUid": "Ool58qGfkawpIAGDRVJoh"}', false, '2026-06-15 00:19:36.783635');
INSERT INTO public.notifications VALUES ('Nwl5y85xAWoTC0w7Zdum-', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'promotion', '­ƒÅà VOC├è FOI PROMOVIDO! Parab├®ns! Voc├¬ foi promovido para Faixa Branca ┬À 3┬║ grau!', '{"belt": "Branca", "stripes": 3}', false, '2026-06-15 00:34:03.675512');
INSERT INTO public.notifications VALUES ('fqBE0YyG0WFbUsSSVoWpp', 'V_HrBI2BTm0ACwSJvTb4O', 'Ool58qGfkawpIAGDRVJoh', NULL, 'low_frequency', 'Sentimos sua falta no tatame. Voce treinou 0 vezes em Junho. Que tal marcar presenca esta semana?', '{"monthName": "Junho", "trainingsCount": 0}', false, '2026-06-15 02:53:20.831978');
INSERT INTO public.notifications VALUES ('P1XXZZHYSvxQ3vIh131LH', 'V_HrBI2BTm0ACwSJvTb4O', 'kogLjyu1wVBilVhdCD6pq', NULL, 'request_accepted', 'Sua solicita├º├úo de ingresso em Tester foi aprovada! Bem-vindo!', NULL, false, '2026-06-15 21:03:13.753425');
INSERT INTO public.notifications VALUES ('Se5a5k5aSyhh48JHBuYfd', 'V_HrBI2BTm0ACwSJvTb4O', 'kogLjyu1wVBilVhdCD6pq', NULL, 'payment_due', '­ƒÆ│ Nova mensalidade gerada ÔÇö R$ 0.00 ÔÇö vence em 05/06/2026. Pague via PIX para continuar treinando.', '{"amount": 0, "pixKey": "", "dueDate": "2026-06-05"}', false, '2026-06-15 21:06:38.765925');
INSERT INTO public.notifications VALUES ('Q9y9pDZGkp7BQYYIUedoC', 'V_HrBI2BTm0ACwSJvTb4O', 'kogLjyu1wVBilVhdCD6pq', 'Tester', 'payment_suspended', 'Seu acesso foi suspenso automaticamente porque sua mensalidade ultrapassou o limite configurado de 10 dia(s) de atraso. Atraso atual: 10 dia(s). Regularize sua mensalidade para voltar a treinar.', '{"paymentId": "37Zcj4l6rGGPhmyZCkyEj", "daysOverdue": 10, "enrollmentId": "y1cmUvO9GyA7DobPmSINF", "autoSuspendAfterDays": 10}', false, '2026-06-15 21:06:46.774754');
INSERT INTO public.notifications VALUES ('loyk9hArY2aDaFjH6uROq', 'V_HrBI2BTm0ACwSJvTb4O', 'kogLjyu1wVBilVhdCD6pq', 'Tester', 'academy_student_assigned_professor', 'Tester definiu foda para acompanhar seus treinos.', '{"academyUid": "kogLjyu1wVBilVhdCD6pq", "assignmentId": "B19xzaSq2_i8KvO5pS7F8", "professorUid": "anDbL8Nf61fn2p_k5jhdd"}', false, '2026-06-16 04:18:40.4179');
INSERT INTO public.notifications VALUES ('iKbc9wX5nXVGP9OxM3_yo', 'V_HrBI2BTm0ACwSJvTb4O', 'kogLjyu1wVBilVhdCD6pq', 'Tester', 'enrollment_reactivated', 'Sua matricula foi reativada. Voce esta ativo novamente em Tester e ja pode voltar aos treinos.', '{"academyName": "Tester", "enrollmentId": "y1cmUvO9GyA7DobPmSINF", "professorUid": "kogLjyu1wVBilVhdCD6pq"}', false, '2026-06-16 04:46:25.332244');
INSERT INTO public.notifications VALUES ('n9uyny4lfkzJIj1owEFpH', 'V_HrBI2BTm0ACwSJvTb4O', 'kogLjyu1wVBilVhdCD6pq', 'Tester', 'low_frequency', 'Sentimos sua falta no tatame. Voce treinou 0 vezes em Junho. Que tal marcar presenca esta semana?', '{"auto": true, "monthName": "Junho", "trainingsCount": 0}', false, '2026-06-16 05:09:42.588469');
INSERT INTO public.notifications VALUES ('1nNncFgi1Z77r80F5s23u', 'V_HrBI2BTm0ACwSJvTb4O', 'kogLjyu1wVBilVhdCD6pq', NULL, 'payment_suspended', 'Sua matricula em Tester foi suspensa. Motivo: dghdtghdgh', '{"reason": "dghdtghdgh", "enrollmentId": "y1cmUvO9GyA7DobPmSINF"}', false, '2026-06-16 05:37:54.340876');
INSERT INTO public.notifications VALUES ('7NLaMkvCz3QS-C7O18ZL6', 'V_HrBI2BTm0ACwSJvTb4O', 'kogLjyu1wVBilVhdCD6pq', 'Tester', 'enrollment_reactivated', 'Sua matricula foi reativada. Voce esta ativo novamente em Tester e ja pode voltar aos treinos.', '{"academyName": "Tester", "enrollmentId": "y1cmUvO9GyA7DobPmSINF", "professorUid": "kogLjyu1wVBilVhdCD6pq"}', false, '2026-06-16 05:39:32.163545');
INSERT INTO public.notifications VALUES ('Nbe1uFneAybRkLy4O4lD3', 'V_HrBI2BTm0ACwSJvTb4O', 'kogLjyu1wVBilVhdCD6pq', NULL, 'payment_suspended', 'Sua matricula em Tester foi suspensa. Motivo: rfgfg', '{"reason": "rfgfg", "enrollmentId": "y1cmUvO9GyA7DobPmSINF"}', false, '2026-06-16 05:44:32.57479');
INSERT INTO public.notifications VALUES ('Y4aYGbTkuj0zzVi8Os5B3', 'V_HrBI2BTm0ACwSJvTb4O', 'kogLjyu1wVBilVhdCD6pq', 'Tester', 'enrollment_reactivated', 'Sua matricula foi reativada. Voce esta ativo novamente em Tester e ja pode voltar aos treinos.', '{"academyName": "Tester", "enrollmentId": "y1cmUvO9GyA7DobPmSINF", "professorUid": "kogLjyu1wVBilVhdCD6pq"}', false, '2026-06-16 05:44:53.175306');
INSERT INTO public.notifications VALUES ('lbGmqxHt2yAdwG-Jool1_', 'V_HrBI2BTm0ACwSJvTb4O', 'kogLjyu1wVBilVhdCD6pq', NULL, 'promotion', 'Parabens! Tester promoveu voce para faixa Branca - 4 grau.', '{"belt": "Branca", "stripes": 4, "promotionId": "THgntzSAQxn-vD9WznBLl"}', false, '2026-06-16 19:35:37.740499');
INSERT INTO public.notifications VALUES ('OvoMgxmlueIvKwd-4ds-3', 'anDbL8Nf61fn2p_k5jhdd', 'kogLjyu1wVBilVhdCD6pq', 'Tester', 'academy_professor_internal', 'Tester criou sua conta de professor. Faca login no BJJRats com seu e-mail. A academia gerencia seus alunos e mensalidades.', NULL, true, '2026-06-16 04:18:27.18375');
INSERT INTO public.notifications VALUES ('Sh_kDJ85cuDFBjCbJlAlu', 'anDbL8Nf61fn2p_k5jhdd', 'kogLjyu1wVBilVhdCD6pq', 'Tester', 'academy_internal_student_assignment', 'Tester atribuiu aluno para seu acompanhamento.', '{"academyUid": "kogLjyu1wVBilVhdCD6pq", "studentUid": "V_HrBI2BTm0ACwSJvTb4O", "assignmentId": "B19xzaSq2_i8KvO5pS7F8"}', true, '2026-06-16 04:18:40.41634');
INSERT INTO public.notifications VALUES ('7KflYaEbhPZqN-PDtHzju', 'Ool58qGfkawpIAGDRVJoh', 'kogLjyu1wVBilVhdCD6pq', 'Tester', 'academy_professor_partner', 'Tester convidou voce para ser professor parceiro com proposta de 50% da mensalidade para o professor. Aceite ou recuse no seu painel.', NULL, false, '2026-06-16 23:19:15.906048');


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.payments VALUES ('YR2Av0iF-MW9GYOvrtmZo', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', 'aluno@aluno.com', 105, '2026-07-05 03:00:00', NULL, 'pending', NULL, '2026-06-10 22:18:07.807953');
INSERT INTO public.payments VALUES ('RTL6DISasZqpSpTWbceiB', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-10 22:18:07.850753');
INSERT INTO public.payments VALUES ('7eWT0bVUo9xCct-XZVaG7', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-10 22:18:15.858343');
INSERT INTO public.payments VALUES ('WqJnzK_ON-cayI2TDVZbo', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 00:21:17.525553');
INSERT INTO public.payments VALUES ('OVCkrOXHTdIWzMajsXRUO', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 00:21:25.643614');
INSERT INTO public.payments VALUES ('1WM_-6zhr17sny0fv-J_x', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 00:29:43.098647');
INSERT INTO public.payments VALUES ('7vfiZeBC5HNxiMWJ4sSEG', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 00:51:35.607034');
INSERT INTO public.payments VALUES ('gNZPRWh9QQajwYPH0UBf9', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 00:51:41.51946');
INSERT INTO public.payments VALUES ('NVboPX1JIP4dvNLC7rLgN', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 01:50:22.041385');
INSERT INTO public.payments VALUES ('0InYhJ5e0yE5YNssEVT9b', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 01:50:46.370685');
INSERT INTO public.payments VALUES ('F2maXkCogEkPRyy1YGqOw', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 01:55:57.070254');
INSERT INTO public.payments VALUES ('YjbA2ZO6at9pR8XE3c-5w', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 02:45:09.843785');
INSERT INTO public.payments VALUES ('qNO-dbHfsDG8LwKm0iwdQ', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 02:46:01.736867');
INSERT INTO public.payments VALUES ('ZSGjUmecoGB3KhEw5uiGX', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 03:17:15.49491');
INSERT INTO public.payments VALUES ('50zwGj0ooKQ9wis7oRIIP', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 03:21:25.779983');
INSERT INTO public.payments VALUES ('W0xim-tdo5Scmv2jXQrl8', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 04:00:52.539321');
INSERT INTO public.payments VALUES ('m0Kkhf62lwNC0HygoK3Wc', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 04:04:06.857416');
INSERT INTO public.payments VALUES ('TsT18MpaSSej2azd-yDvg', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 04:05:17.782613');
INSERT INTO public.payments VALUES ('Dkk3xv8dmARf7THTqz8sw', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 04:24:23.237651');
INSERT INTO public.payments VALUES ('E6c_tTgbFhVeqnlt6yRua', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-11 04:31:33.757213');
INSERT INTO public.payments VALUES ('6GfEDaceY1KC2H5BIhKbZ', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-12 00:08:05.289343');
INSERT INTO public.payments VALUES ('Y9ZAE6hg9yvZ3uPQ_SBsH', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-12 00:36:25.681767');
INSERT INTO public.payments VALUES ('vEnU9en5eHAuqqeWG1aDl', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-12 00:40:01.619609');
INSERT INTO public.payments VALUES ('2et7C3wkEg-JAbesbOy6t', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-12 00:44:38.320359');
INSERT INTO public.payments VALUES ('uk9nVskkuwgx6T7jJYkvE', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-12 00:59:57.417497');
INSERT INTO public.payments VALUES ('OKMGWUVZP7HGTYgHNlV6U', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-12 01:07:53.970732');
INSERT INTO public.payments VALUES ('j2WpMvh1WSlTl56nLJXgs', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-12 01:09:14.694509');
INSERT INTO public.payments VALUES ('bNuuy5hHw-ID82FNRBv91', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-12 01:11:12.214436');
INSERT INTO public.payments VALUES ('5TRwy86j1rFyhQgnUL8Mj', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-12 01:17:24.24102');
INSERT INTO public.payments VALUES ('mXlPNu-0AtoV1ShSDSqqZ', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-12 01:18:54.505332');
INSERT INTO public.payments VALUES ('l6HxbXrPSjvvUR2ly7JHw', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-12 02:03:04.65807');
INSERT INTO public.payments VALUES ('bTo4qY2uDmpBCNYUYp0OO', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'pending', NULL, '2026-06-12 05:39:17.607353');
INSERT INTO public.payments VALUES ('37Zcj4l6rGGPhmyZCkyEj', 'kogLjyu1wVBilVhdCD6pq', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 0, '2026-06-05 03:00:00', '2026-06-16 03:00:00', 'paid', NULL, '2026-06-15 21:06:38.753572');
INSERT INTO public.payments VALUES ('vFaQ96C6H94sWmee7HxFm', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', NULL, 'overdue', NULL, '2026-06-11 02:21:44.880829');
INSERT INTO public.payments VALUES ('ZHhIeSBWmAEqlQT_pBK92', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, 150, '2026-06-05 03:00:00', '2026-06-15 03:00:00', 'paid', '14707815731', '2026-06-12 18:31:21.636821');


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.plans VALUES ('Ca33pXpx3E5v6rRTVjcDU', 'Aluno', 'aluno', 'Registre seus treinos, acompanhe sua evolu├º├úo, participe da comunidade.', 19.9, 'student', '["training_tracking", "training_history", "streak", "community", "achievements", "competitions", "goals", "challenges", "events", "profile_stats"]', true, '2026-05-25 23:10:47.715972', 0);
INSERT INTO public.plans VALUES ('lemEcblz70phZ_6qu8aAT', 'Professor Particular', 'professor', 'Gerencie seus alunos com exclusividade e acompanhe o desenvolvimento de cada um.', 47.9, 'professor', '["professor_panel", "student_management", "unlimited_students", "enrollments", "payments", "promotions", "class_schedules", "class_checkins", "training_analytics", "exclusive_student_attention"]', true, '2026-05-25 23:10:47.719239', 0);
INSERT INTO public.plans VALUES ('yxtJZzQesfa63SRV6U-PA', 'Academia', 'academia', 'Gest├úo completa da sua academia com m├║ltiplos professores, CRM e relat├│rios.', 97.9, 'academy', '["admin_dashboard", "user_management", "crm", "multiple_professors", "class_schedules", "class_checkins", "reports", "enrollments", "payments", "promotions", "revenue_analytics"]', true, '2026-05-25 23:10:47.720486', 0);


--
-- Data for Name: promotions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.promotions VALUES ('DD_IAq2MxSBJmq83zP1OA', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', NULL, NULL, NULL, NULL, NULL, '2026-06-14 23:12:39.468804', '2026-06-14 23:12:39.468804');
INSERT INTO public.promotions VALUES ('ipksut9Z9-9pswOK_wK9x', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', 'Branca', 'Branca', 0, 1, NULL, '2026-06-14 23:23:23.777479', '2026-06-14 23:23:23.777479');
INSERT INTO public.promotions VALUES ('LDiWetp1LhEYqHRKn7MJH', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', 'Branca', 'Branca', 0, 1, NULL, '2026-06-14 23:23:36.751455', '2026-06-14 23:23:36.751455');
INSERT INTO public.promotions VALUES ('QDLXH3cDo00e-uKU8bjTL', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', 'Branca', 'Branca', 1, 2, NULL, '2026-06-14 23:50:04.675785', '2026-06-14 23:50:04.675785');
INSERT INTO public.promotions VALUES ('ydLXn8BE9g8EbT61VMXpZ', 'Ool58qGfkawpIAGDRVJoh', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', 'Branca', 'Branca', 2, 3, NULL, '2026-06-15 00:34:03.64567', '2026-06-15 00:34:03.64567');
INSERT INTO public.promotions VALUES ('THgntzSAQxn-vD9WznBLl', 'kogLjyu1wVBilVhdCD6pq', 'V_HrBI2BTm0ACwSJvTb4O', 'aluno', 'Branca', 'Branca', 3, 4, 'fgfg', '2026-06-16 19:35:37.731926', '2026-06-16 19:35:37.731926');


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.settings VALUES ('app_store_url', '');
INSERT INTO public.settings VALUES ('play_store_url', '');
INSERT INTO public.settings VALUES ('professor:Ool58qGfkawpIAGDRVJoh:financial:auto_suspend_after_days', '7');
INSERT INTO public.settings VALUES ('owner:Ool58qGfkawpIAGDRVJoh:payments:webhook_token', 'cZvst1bnEmziMVImDHPgiId_NN8NtETJ');
INSERT INTO public.settings VALUES ('owner:kogLjyu1wVBilVhdCD6pq:payments:webhook_token', 'AWrtH736zBwYQ7KjVx0_N6yCVWkt5Geu');
INSERT INTO public.settings VALUES ('owner:anDbL8Nf61fn2p_k5jhdd:payments:webhook_token', 'zb847OcBgg2K7QC4C9mZO25rNFOJ2TRF');
INSERT INTO public.settings VALUES ('owner:kogLjyu1wVBilVhdCD6pq:payments:manual_enabled', 'true');
INSERT INTO public.settings VALUES ('owner:kogLjyu1wVBilVhdCD6pq:payments:asaas_enabled', 'false');
INSERT INTO public.settings VALUES ('owner:kogLjyu1wVBilVhdCD6pq:payments:asaas_sandbox', 'false');
INSERT INTO public.settings VALUES ('owner:kogLjyu1wVBilVhdCD6pq:payments:asaas_billing_type', 'PIX');
INSERT INTO public.settings VALUES ('owner:kogLjyu1wVBilVhdCD6pq:payments:pix_key', '');
INSERT INTO public.settings VALUES ('owner:kogLjyu1wVBilVhdCD6pq:payments:pix_qr_code_url', '');


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: trainings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.trainings VALUES ('F-XVz2YXysfUdtQ5q8kIE', '-qapzl2rZp0MxmS8_Y6ir', '23/05/2026', 'aula_coletiva', 'gi', 120, 5, 4, '{"finalizacoes": ["Mata-le├úo (Rear Naked Choke)", "Tri├óngulo (Triangle Choke)", "Guilhotina (Guillotine Choke)", "Chave de bra├ºo (Armbar)", "Americana (Keylock)", "Kimura", "Omoplata", "Estrangulamento de lapela (Lapel Choke)", "Estrangulamento de gola (Collar Choke)", "D''arce (D''Arce Choke)", "Anaconda", "Heel Hook", "Kneebar", "Toe Hold", "Estrangulamento de pesco├ºo (Neck Crank)"]}', 'dghffgncfgncgngnc', 'gym', 'siclano', NULL, 25, NULL, NULL, '2026-05-23 00:19:11.314662');
INSERT INTO public.trainings VALUES ('Zlh7SePPhpyYY9kjK8zLD', '-qapzl2rZp0MxmS8_Y6ir', '23/05/2026', 'aula_coletiva', 'gi', 120, 5, 5, '{"quedas": ["Proje├º├úo de quadril (O-Goshi)", "Proje├º├úo de ombro (Seoi Nage)", "Derrubada de gancho (Hook Throw)", "Queda de joelho duplo (Knee Tap)", "Proje├º├úo de perna (Uchi Mata)", "Proje├º├úo de varredura (Harai Goshi)", "Queda de joelho (Morote Seoi Nage)", "Raspagem de perna (Osoto Gari)", "Raspagem de perna interna (Ouchi Gari)", "Raspagem de perna externa (Kouchi Gari)", "Queda dupla de perna (Double Leg Takedown)", "Queda de perna ├║nica (Single Leg Takedown)", "Derrubada de cabe├ºa (Headlock Takedown)", "Proje├º├úo de carregamento (Fireman Carry)"]}', 'xfgdfdhgdghdhdbdghdgh', 'gym', 'siclano', NULL, 25, NULL, NULL, '2026-05-23 00:28:01.934368');
INSERT INTO public.trainings VALUES ('5GVFg42HZxuL2kxSMQqpA', '-qapzl2rZp0MxmS8_Y6ir', '23/05/2026', 'aula_particular', 'gi', 60, 5, 5, '{"finalizacoes": ["Mata-le├úo (Rear Naked Choke)", "Tri├óngulo (Triangle Choke)", "Guilhotina (Guillotine Choke)", "Chave de bra├ºo (Armbar)", "Americana (Keylock)", "Kimura", "Omoplata", "Estrangulamento de lapela (Lapel Choke)", "Estrangulamento de gola (Collar Choke)", "D''arce (D''Arce Choke)", "Anaconda", "Heel Hook", "Kneebar", "Toe Hold", "Estrangulamento de pesco├ºo (Neck Crank)"]}', 'dhgdghdghdghdghdgh', 'gym', 'fulanilson', NULL, 20, NULL, NULL, '2026-05-23 00:47:55.197301');


--
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: whatsapp_instances; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.whatsapp_instances VALUES ('qcC0iiM-G73C_XWhm_KGe', 'Ool58qGfkawpIAGDRVJoh', 'bjjrats_Ool58qGfkawpIAGDRVJoh', 'connected', NULL, '2026-06-12 01:08:19.587062', '2026-06-12 01:08:19.587062');
INSERT INTO public.whatsapp_instances VALUES ('7s9GYJFagfWpspVhKDfxo', 'kogLjyu1wVBilVhdCD6pq', 'bjjrats_academy_kogLjyu1wVBilVhdCD6pq', 'connected', NULL, '2026-06-16 05:26:36.110774', '2026-06-16 05:26:36.110774');


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: -
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict ww8PiPGEO602SAm8jltbhzNE72ann228ho0xh3faxLxXdbgFoLYvVjsRuCuI7bY

