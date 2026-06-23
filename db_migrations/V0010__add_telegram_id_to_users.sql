ALTER TABLE t_p62618369_ai_ugc_gaming_servic.users
  ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_uniq
  ON t_p62618369_ai_ugc_gaming_servic.users (telegram_id)
  WHERE telegram_id IS NOT NULL;