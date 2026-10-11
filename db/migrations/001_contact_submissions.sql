-- orbLand owns the `orbland` schema in the shared Neon database (famList lives in `public`).
CREATE SCHEMA IF NOT EXISTS orbland;

CREATE TABLE IF NOT EXISTS orbland.contact_submissions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  name        text NOT NULL,
  email       text NOT NULL,
  interest    text,
  message     text NOT NULL,
  source      text NOT NULL DEFAULT 'landing',
  status      text NOT NULL DEFAULT 'new',
  email_sent  boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx
  ON orbland.contact_submissions (created_at DESC);
