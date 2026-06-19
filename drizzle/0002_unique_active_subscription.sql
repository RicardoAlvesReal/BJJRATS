-- Garante que cada usuário tenha no máximo UMA assinatura ativa/trial/past_due
-- Se tentar inserir uma segunda, o banco rejeita com erro de constraint

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_sub_per_user 
  ON subscriptions (user_uid) 
  WHERE status IN ('active', 'trial', 'past_due');
