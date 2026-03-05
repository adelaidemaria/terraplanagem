-- =========================================================================
-- SCRIPT DE SEGURANÇA: HABILITAR AUTH E ROW LEVEL SECURITY (RLS)
-- COPIE E EXECUTE ESTE CÓDIGO INTEIRO NO SQL EDITOR DO SUPABASE
-- =========================================================================

-- 1. Habilitar RLS (Row Level Security) em todas as tabelas
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transfers ENABLE ROW LEVEL SECURITY;

-- 2. Criar Política de Acesso Total Apenas para Usuários Autenticados
-- A função auth.uid() garante que o usuário está logado através do módulo Supabase Auth Oficial
DROP POLICY IF EXISTS "Acesso restrito auth" ON customers;
CREATE POLICY "Acesso restrito auth" ON customers FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON vendor_categories;
CREATE POLICY "Acesso restrito auth" ON vendor_categories FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON vendors;
CREATE POLICY "Acesso restrito auth" ON vendors FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON account_categories;
CREATE POLICY "Acesso restrito auth" ON account_categories FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON account_subcategories;
CREATE POLICY "Acesso restrito auth" ON account_subcategories FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON account_plans;
CREATE POLICY "Acesso restrito auth" ON account_plans FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON bank_accounts;
CREATE POLICY "Acesso restrito auth" ON bank_accounts FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON equipment;
CREATE POLICY "Acesso restrito auth" ON equipment FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON maintenance_records;
CREATE POLICY "Acesso restrito auth" ON maintenance_records FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON sales;
CREATE POLICY "Acesso restrito auth" ON sales FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON expenses;
CREATE POLICY "Acesso restrito auth" ON expenses FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON payments;
CREATE POLICY "Acesso restrito auth" ON payments FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso restrito auth" ON bank_transfers;
CREATE POLICY "Acesso restrito auth" ON bank_transfers FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

-- 3. Remover tabela antiga vulnerável
DROP TABLE IF EXISTS admin_users;
