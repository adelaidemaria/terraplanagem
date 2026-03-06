-- Criação da tabela de Agenda
CREATE TABLE IF NOT EXISTS public.agenda_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at BIGINT NOT NULL,
    scheduled_date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('Urgente', 'Lembrete')),
    completed BOOLEAN NOT NULL DEFAULT false
);

-- Ativar RLS
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso completo (mesmo padrão usado no restante do sistema em enable_rls_seguranca.sql)
CREATE POLICY "Enable all access for all users" ON public.agenda_items FOR ALL USING (true) WITH CHECK (true);
