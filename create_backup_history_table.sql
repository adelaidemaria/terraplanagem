-- =========================================================================
-- TABELA DE HISTÓRICO DE BACKUPS E RESTAURAÇÕES NO SUPABASE
-- COPIE E EXECUTE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.backup_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'backup' ou 'restore'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    filename TEXT NOT NULL,
    total_records INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Sucesso'
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso total para permitir gravação e leitura do histórico
DROP POLICY IF EXISTS "Acesso total backup_history" ON public.backup_history;
CREATE POLICY "Acesso total backup_history" ON public.backup_history FOR ALL TO public USING (true);
