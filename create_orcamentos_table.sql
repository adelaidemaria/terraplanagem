-- ============================================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS DE ORÇAMENTOS
-- COPIE E EXECUTE NO SQL EDITOR DO SUPABASE
-- ============================================================

-- 1. Tabela de Orçamentos
CREATE TABLE IF NOT EXISTS orcamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero INTEGER NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    endereco TEXT,
    dados_complementares TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    forma_pagamento TEXT DEFAULT 'A Vista',
    condicao_pagamento TEXT DEFAULT 'Pix',
    inicio_servicos TEXT DEFAULT 'A Combinar com o cliente',
    informacoes_complementares TEXT,
    data_emissao TEXT NOT NULL,
    status TEXT DEFAULT 'Aguardando Cliente',
    efetivado_info TEXT,
    ocultar_total BOOLEAN DEFAULT FALSE,
    created_at BIGINT
);

-- 2. Tabela de Controle de Numeração (próximo número de orçamento)
CREATE TABLE IF NOT EXISTS orcamento_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proximo_numero INTEGER NOT NULL DEFAULT 118
);

-- Inserir registro inicial (número 118) apenas se a tabela estiver vazia
INSERT INTO orcamento_config (proximo_numero)
SELECT 118
WHERE NOT EXISTS (SELECT 1 FROM orcamento_config);

-- 3. Habilitar Row Level Security
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_config ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso para usuários autenticados
DROP POLICY IF EXISTS "Acesso restrito auth" ON orcamentos;
CREATE POLICY "Acesso restrito auth" ON orcamentos
    FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON orcamento_config;
CREATE POLICY "Acesso restrito auth" ON orcamento_config
    FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);
