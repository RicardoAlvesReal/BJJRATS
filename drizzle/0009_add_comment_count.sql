-- Add comment_count to posts and populate from existing comments
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Sincronizar contagem existente
UPDATE posts p
SET comment_count = (
  SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id
);
