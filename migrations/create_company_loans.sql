-- Migration: Create company_loans table
-- Tabela para gerenciar empréstimos bancários que a empresa contraiu

CREATE TABLE IF NOT EXISTS company_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_emprestimo TEXT NOT NULL,
  valor_emprestado NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_taxas_contrato NUMERIC(15,2) NOT NULL DEFAULT 0,
  data_emprestimo DATE NOT NULL,
  descricao TEXT DEFAULT '',
  banco_credito_id UUID,
  qtd_parcelas INTEGER NOT NULL DEFAULT 1,
  parcelas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text
);

-- Enable Row Level Security
ALTER TABLE company_loans ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users full access
CREATE POLICY "Allow authenticated full access on company_loans"
  ON company_loans
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comentários nas colunas
COMMENT ON TABLE company_loans IS 'Empréstimos bancários que a empresa contraiu';
COMMENT ON COLUMN company_loans.nome_emprestimo IS 'Nome/descrição do empréstimo (ex: Financiamento Caminhão)';
COMMENT ON COLUMN company_loans.valor_emprestado IS 'Valor total emprestado pelo banco';
COMMENT ON COLUMN company_loans.total_taxas_contrato IS 'Total de taxas administrativas/IOF do contrato';
COMMENT ON COLUMN company_loans.banco_credito_id IS 'ID da conta bancária onde o dinheiro entrou';
COMMENT ON COLUMN company_loans.parcelas IS 'Array JSON com as parcelas do empréstimo';
