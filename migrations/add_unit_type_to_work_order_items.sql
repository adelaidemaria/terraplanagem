
-- Adicionar coluna unit_type na tabela work_order_items
ALTER TABLE work_order_items ADD COLUMN IF NOT EXISTS unit_type TEXT;
