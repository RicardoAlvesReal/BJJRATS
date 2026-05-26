-- Migração manual: adiciona subscription_exempt + tabelas plans e subscriptions

ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_exempt boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price real NOT NULL,
  role_assigned text NOT NULL,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY,
  user_uid text NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status text DEFAULT 'active',
  asaas_id text,
  asaas_customer_id text,
  current_period_start timestamp,
  current_period_end timestamp,
  trial_ends_at timestamp,
  cancelled_at timestamp,
  created_at timestamp DEFAULT now()
);
