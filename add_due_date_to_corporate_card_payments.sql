-- Adiciona o campo de vencimento da fatura na tabela corporate_card_payments
ALTER TABLE corporate_card_payments ADD COLUMN IF NOT EXISTS due_date date;
