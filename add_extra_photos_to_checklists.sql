-- Adicionar novos campos para fotos adicionais no checklist
ALTER TABLE public.daily_checklists
ADD COLUMN IF NOT EXISTS photo_url_2 TEXT,
ADD COLUMN IF NOT EXISTS photo_url_3 TEXT,
ADD COLUMN IF NOT EXISTS device_info TEXT,
ADD COLUMN IF NOT EXISTS location_info TEXT;
