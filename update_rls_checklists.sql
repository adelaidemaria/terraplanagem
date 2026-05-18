-- Enable public read access for daily_checklists so we can check if it was already filled today
CREATE POLICY "Enable select for anonymous users on daily_checklists" ON public.daily_checklists
    FOR SELECT USING (true);
