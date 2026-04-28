
-- Adicionar coluna costCenter na tabela work_order_items
ALTER TABLE work_order_items ADD COLUMN IF NOT EXISTS cost_center TEXT;
