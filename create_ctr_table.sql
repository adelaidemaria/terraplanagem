-- 13. CTR (Controle de Transporte de Resíduos)
CREATE TABLE IF NOT EXISTS ctr (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ctr_number TEXT NOT NULL,
    emitted_at DATE NOT NULL,
    client_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    client_name TEXT,
    attachment_url TEXT,
    observations TEXT,
    created_at BIGINT
);

-- Habilitar RLS
ALTER TABLE ctr ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso total para usuários autenticados
DROP POLICY IF EXISTS "Acesso restrito auth" ON ctr;
CREATE POLICY "Acesso restrito auth" ON ctr FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

-- Observação: Se o bucket 'receipts' não existir no Storage, ele deve ser criado manualmente no Dashboard do Supabase.
