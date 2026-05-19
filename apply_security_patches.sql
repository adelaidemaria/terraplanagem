-- =========================================================================
-- PATCH DE SEGURANÇA (AUDITORIA DE DADOS E UPLOAD)
-- COPIE E EXECUTE ESTE CÓDIGO INTEIRO NO SQL EDITOR DO SUPABASE
-- =========================================================================

-- 1. CORREÇÃO DA TABELA DAILY_CHECKLISTS
-- Remove a permissão perigosa que permitia ler todo o histórico
DROP POLICY IF EXISTS "Enable select for anonymous users on daily_checklists" ON public.daily_checklists;

-- Cria a nova permissão restrita: permite ler apenas os checklists criados nas últimas 24 horas
-- Isso permite o sistema checar se já foi inspecionado hoje, sem vazar o histórico total
CREATE POLICY "Enable select for anonymous users on daily_checklists" ON public.daily_checklists
    FOR SELECT USING (created_at >= (now() - interval '24 hours'));


-- 2. CORREÇÃO DA TABELA FUNCIONARIOS
-- Remove a permissão atual ampla (se existir)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.funcionarios;
DROP POLICY IF EXISTS "Enable select for anonymous users" ON public.funcionarios;
DROP POLICY IF EXISTS "Enable select for active employees only" ON public.funcionarios;
DROP POLICY IF EXISTS "Acesso total auth funcionarios" ON public.funcionarios;

-- Garante que o RLS está ativo
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- SEGURANÇA: Garante que o painel admin (logado) tenha acesso total
CREATE POLICY "Acesso total auth funcionarios" ON public.funcionarios FOR ALL TO authenticated USING (true);

-- Permite leitura para visitantes (Link do Operador) apenas para funcionários que são operadores
-- Assim não vaza nomes e dados de funcionários administrativos
CREATE POLICY "Enable select for active employees only" ON public.funcionarios
    FOR SELECT TO anon USING (is_operator = true);


-- 3. CORREÇÃO DA TABELA COMPANY_VEHICLES
-- Remove a permissão ampla (se existir)
DROP POLICY IF EXISTS "Enable read access for all users on company_vehicles" ON public.company_vehicles;
DROP POLICY IF EXISTS "Enable select for anonymous users" ON public.company_vehicles;
DROP POLICY IF EXISTS "Enable select for active vehicles only" ON public.company_vehicles;
DROP POLICY IF EXISTS "Acesso total auth company_vehicles" ON public.company_vehicles;

ALTER TABLE public.company_vehicles ENABLE ROW LEVEL SECURITY;

-- SEGURANÇA: Garante que o painel admin (logado) tenha acesso total
CREATE POLICY "Acesso total auth company_vehicles" ON public.company_vehicles FOR ALL TO authenticated USING (true);

-- Permite leitura para visitantes (Link do Operador) apenas para veículos com status 'Ativo'
CREATE POLICY "Enable select for active vehicles only" ON public.company_vehicles
    FOR SELECT TO anon USING (status = 'Ativo');


-- 4. CORREÇÃO DO BUCKET DE FOTOS (STORAGE)
-- Remove a permissão de upload ilimitado atual
DROP POLICY IF EXISTS "Public Uploads to checklist_photos" ON storage.objects;

-- Cria uma permissão de upload blindada que verifica a extensão do arquivo
-- Evita upload de vírus ou arquivos indevidos (.exe, .pdf, .zip)
CREATE POLICY "Public Uploads to checklist_photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'checklist_photos'
    AND position('.' in name) > 0 
    AND lower(substring(name from position('.' in name))) IN ('.jpg', '.jpeg', '.png', '.webp', '.heic')
  );
