-- Tabela de Empréstimos a Funcionários
CREATE TABLE IF NOT EXISTS emprestimos_funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL,
  funcionario_nome TEXT NOT NULL,
  data_emprestimo DATE NOT NULL,
  valor_emprestimo NUMERIC(12,2) NOT NULL,
  banco_saida_id UUID,
  account_plan_id UUID,
  descricao TEXT,
  qtd_parcelas INT NOT NULL,
  parcelas JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE emprestimos_funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_emprestimos" ON emprestimos_funcionarios FOR ALL USING (true);

-- Adicionar campo mostrar_dre ao plano de contas
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS mostrar_dre BOOLEAN DEFAULT true;
