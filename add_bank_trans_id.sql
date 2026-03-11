-- Script para adicionar a coluna bank_trans_id para evitar importações duplicadas
-- de arquivos OFX / CSV do extrato bancário.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bank_trans_id text UNIQUE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_trans_id text UNIQUE;

-- Com isso, garantimos em nível de banco de dados que não será possível
-- registrar a mesma transação duas vezes.
