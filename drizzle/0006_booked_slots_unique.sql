-- Evita que dois alunos reservem o mesmo horário simultaneamente
CREATE UNIQUE INDEX IF NOT EXISTS idx_booked_slot_unique ON "booked_slots" ("professor_uid", "date", "time") WHERE "status" = 'confirmed';
