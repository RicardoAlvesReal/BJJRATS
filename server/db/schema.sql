-- ============================================================
-- BJJRats — Schema PostgreSQL
-- Gerado a partir de server/db/schema.ts (Drizzle ORM)
-- ============================================================

-- ─── users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  uid                  TEXT        PRIMARY KEY,
  name                 TEXT        NOT NULL,
  email                TEXT        NOT NULL UNIQUE,
  password_hash        TEXT        NOT NULL,
  photo                TEXT,
  belt                 TEXT        NOT NULL DEFAULT 'Branca',
  stripes              INTEGER     DEFAULT 0,
  academy              TEXT        DEFAULT '',
  academy_id           TEXT,
  professor            TEXT        DEFAULT '',
  dob                  TEXT,
  sex                  TEXT,
  weight_kg            TEXT,
  height_cm            TEXT,
  phone                TEXT,
  address              TEXT,
  bjj_since            TEXT,
  xp                   INTEGER     DEFAULT 0,
  total_trainings      INTEGER     DEFAULT 0,
  total_minutes        INTEGER     DEFAULT 0,
  streak               INTEGER     DEFAULT 0,
  last_training_date   TEXT,
  athlete_type         TEXT,
  is_academy_admin     BOOLEAN     DEFAULT FALSE,
  role                 TEXT        DEFAULT 'student',
  academy_name         TEXT,
  academy_address      TEXT,
  academy_city         TEXT,
  academy_state        TEXT,
  academy_logo_url     TEXT,
  professor_photo_url  TEXT,
  saved_academies      JSONB       DEFAULT '[]',
  saved_professors     JSONB       DEFAULT '[]',
  invite_code          TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── trainings ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trainings (
  id                  TEXT        PRIMARY KEY,
  uid                 TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  training_date       TEXT        NOT NULL,
  session_type        TEXT,
  modality            TEXT,
  duration            INTEGER     NOT NULL,
  intensity           INTEGER,
  satisfaction        INTEGER,
  techniques          JSONB       DEFAULT '{}',
  notes               TEXT,
  academy             TEXT,
  professor           TEXT,
  training_photo_url  TEXT,
  xp                  INTEGER     DEFAULT 0,
  extra_data          JSONB,
  comp_data           JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── extra_trainings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS extra_trainings (
  id            TEXT        PRIMARY KEY,
  uid           TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  training_date TEXT        NOT NULL,
  activity      TEXT,
  duration      INTEGER     NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── goals ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id         TEXT        PRIMARY KEY,
  uid        TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  target     INTEGER     DEFAULT 0,
  unit       TEXT        DEFAULT 'treinos',
  period     TEXT        DEFAULT 'weekly',
  is_active  BOOLEAN     DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── posts ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id            TEXT        PRIMARY KEY,
  author_uid    TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  author_name   TEXT,
  author_photo  TEXT,
  author_belt   TEXT,
  content       TEXT,
  media_url     TEXT,
  media_type    TEXT,
  post_type     TEXT        DEFAULT 'community',
  academy_id    TEXT,
  training_data JSONB,
  likes         JSONB       DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── comments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id           TEXT        PRIMARY KEY,
  post_id      TEXT        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_uid   TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  author_name  TEXT,
  author_photo TEXT,
  content      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── events ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id           TEXT        PRIMARY KEY,
  creator_uid  TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  academy_id   TEXT,
  title        TEXT        NOT NULL,
  description  TEXT,
  event_date   TEXT,
  event_time   TEXT,
  location     TEXT,
  media_url    TEXT,
  is_public    BOOLEAN     DEFAULT TRUE,
  rsvps        JSONB       DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── challenges ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id           TEXT        PRIMARY KEY,
  creator_uid  TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  academy_id   TEXT,
  title        TEXT        NOT NULL,
  description  TEXT,
  target       INTEGER     DEFAULT 1,
  unit         TEXT        DEFAULT 'treinos',
  start_date   TEXT,
  end_date     TEXT,
  media_url    TEXT,
  is_public    BOOLEAN     DEFAULT TRUE,
  participants JSONB       DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── notifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT        PRIMARY KEY,
  to_uid     TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  from_uid   TEXT,
  from_name  TEXT,
  type       TEXT,
  message    TEXT        NOT NULL,
  data       JSONB,
  read       BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── payments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id            TEXT        PRIMARY KEY,
  professor_uid TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  student_uid   TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  student_name  TEXT,
  student_email TEXT,
  amount        REAL        NOT NULL,
  due_date      TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ,
  status        TEXT        DEFAULT 'pending',
  pix_link      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── enrollments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id             TEXT        PRIMARY KEY,
  professor_uid  TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  professor_name TEXT,
  academy_name   TEXT,
  student_uid    TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  student_name   TEXT,
  monthly_fee    REAL        DEFAULT 0,
  due_day        INTEGER     DEFAULT 1,
  status         TEXT        DEFAULT 'active',
  pix_key        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── academy_requests ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academy_requests (
  id            TEXT        PRIMARY KEY,
  student_uid   TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  student_name  TEXT,
  student_email TEXT,
  student_photo TEXT,
  student_belt  TEXT,
  professor_uid TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  academy_name  TEXT,
  status        TEXT        DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── class_schedules ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_schedules (
  id            TEXT        PRIMARY KEY,
  academy_id    TEXT        NOT NULL,
  professor_uid TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  day_of_week   INTEGER,
  start_time    TEXT,
  end_time      TEXT,
  class_name    TEXT,
  modality      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── class_check_ins ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_check_ins (
  id            TEXT        PRIMARY KEY,
  schedule_id   TEXT        REFERENCES class_schedules(id) ON DELETE SET NULL,
  academy_id    TEXT        NOT NULL,
  student_uid   TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  check_in_date TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── promotions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id            TEXT        PRIMARY KEY,
  professor_uid TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  student_uid   TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  student_name  TEXT,
  from_belt     TEXT,
  to_belt       TEXT,
  from_stripes  INTEGER,
  to_stripes    INTEGER,
  notes         TEXT,
  promoted_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── user_achievements ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  id             TEXT        PRIMARY KEY,
  uid            TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  achievement_id TEXT        NOT NULL,
  unlocked_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── competitions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competitions (
  id           TEXT        PRIMARY KEY,
  uid          TEXT        NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  date         TEXT,
  location     TEXT,
  category     TEXT,
  weight_class TEXT,
  result       TEXT        DEFAULT 'gold',
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Índices para performance ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trainings_uid            ON trainings(uid);
CREATE INDEX IF NOT EXISTS idx_trainings_date           ON trainings(training_date);
CREATE INDEX IF NOT EXISTS idx_extra_trainings_uid      ON extra_trainings(uid);
CREATE INDEX IF NOT EXISTS idx_goals_uid                ON goals(uid);
CREATE INDEX IF NOT EXISTS idx_posts_author             ON posts(author_uid);
CREATE INDEX IF NOT EXISTS idx_posts_academy            ON posts(academy_id);
CREATE INDEX IF NOT EXISTS idx_comments_post            ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_to_uid     ON notifications(to_uid);
CREATE INDEX IF NOT EXISTS idx_payments_professor       ON payments(professor_uid);
CREATE INDEX IF NOT EXISTS idx_payments_student         ON payments(student_uid);
CREATE INDEX IF NOT EXISTS idx_enrollments_professor    ON enrollments(professor_uid);
CREATE INDEX IF NOT EXISTS idx_enrollments_student      ON enrollments(student_uid);
CREATE INDEX IF NOT EXISTS idx_academy_requests_student ON academy_requests(student_uid);
CREATE INDEX IF NOT EXISTS idx_academy_requests_prof    ON academy_requests(professor_uid);
CREATE INDEX IF NOT EXISTS idx_class_schedules_academy  ON class_schedules(academy_id);
CREATE INDEX IF NOT EXISTS idx_class_check_ins_student  ON class_check_ins(student_uid);
CREATE INDEX IF NOT EXISTS idx_class_check_ins_academy  ON class_check_ins(academy_id);
CREATE INDEX IF NOT EXISTS idx_promotions_professor     ON promotions(professor_uid);
CREATE INDEX IF NOT EXISTS idx_promotions_student       ON promotions(student_uid);
CREATE INDEX IF NOT EXISTS idx_user_achievements_uid    ON user_achievements(uid);
CREATE INDEX IF NOT EXISTS idx_competitions_uid         ON competitions(uid);
