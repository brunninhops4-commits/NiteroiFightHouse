-- Esquema de referência para PostgreSQL. Não é aplicado pelo protótipo estático.
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE martial_art AS ENUM ('muay_thai_feminino', 'muay_thai_geral', 'bjj');
CREATE TYPE class_level AS ENUM ('iniciante', 'intermediario', 'avancado', 'todos');
CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'checked_in', 'no_show');

CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       text NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 120),
  email           citext NOT NULL UNIQUE,
  phone           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE coaches (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name             text NOT NULL,
  bio                   text,
  credentials           jsonb NOT NULL DEFAULT '[]'::jsonb,
  credentials_verified  boolean NOT NULL DEFAULT false,
  active                boolean NOT NULL DEFAULT true
);

CREATE TABLE classes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modality        martial_art NOT NULL,
  title           text NOT NULL,
  level           class_level NOT NULL DEFAULT 'todos',
  coach_id        uuid REFERENCES coaches(id) ON DELETE SET NULL,
  duration_min    smallint NOT NULL CHECK (duration_min BETWEEN 20 AND 240),
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  starts_at       timestamptz NOT NULL,
  capacity        smallint NOT NULL CHECK (capacity > 0),
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cancelled', 'completed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, starts_at)
);
CREATE INDEX schedules_start_idx ON schedules (starts_at) WHERE status = 'open';
CREATE INDEX schedules_class_start_idx ON schedules (class_id, starts_at);

CREATE TABLE bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  schedule_id     uuid NOT NULL REFERENCES schedules(id) ON DELETE RESTRICT,
  status          booking_status NOT NULL DEFAULT 'confirmed',
  ticket_token    text NOT NULL UNIQUE,
  idempotency_key uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  checked_in_at   timestamptz,
  UNIQUE (user_id, schedule_id),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX bookings_schedule_status_idx ON bookings (schedule_id, status);
CREATE INDEX bookings_user_status_idx ON bookings (user_id, status);
