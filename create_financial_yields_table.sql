CREATE TABLE IF NOT EXISTS public.financial_yields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_plan_id UUID REFERENCES public.account_plans(id) ON DELETE CASCADE,
    bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    created_at BIGINT NOT NULL
);

ALTER TABLE public.financial_yields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.financial_yields
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
