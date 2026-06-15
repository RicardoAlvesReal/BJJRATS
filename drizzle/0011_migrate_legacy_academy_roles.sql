-- Migra contas e planos legados de academia para o role tecnico "academy".
-- Mantem "superadmin" como unico role administrativo da plataforma.

UPDATE "users"
SET
  "role" = 'academy',
  "is_academy_admin" = true
WHERE
  "role" = 'admin'
  OR (
    COALESCE("is_academy_admin", false) = true
    AND "role" IS DISTINCT FROM 'superadmin'
    AND "role" IS DISTINCT FROM 'academy'
  );

UPDATE "users"
SET "is_academy_admin" = true
WHERE
  "role" = 'academy'
  AND COALESCE("is_academy_admin", false) = false;

DO $$
BEGIN
  IF to_regclass('public.plans') IS NOT NULL THEN
    UPDATE "plans"
    SET "role_assigned" = 'academy'
    WHERE "role_assigned" = 'admin';
  END IF;
END $$;
