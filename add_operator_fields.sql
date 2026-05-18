-- Add new columns to the funcionarios table to manage operators and linked vehicles
ALTER TABLE public.funcionarios ADD COLUMN is_operator BOOLEAN DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN linked_vehicles UUID[] DEFAULT '{}'::uuid[];

-- Enable public read access to funcionarios so the public checklist page can fetch the operator's linked vehicles
CREATE POLICY "Enable select for anonymous users on funcionarios" ON public.funcionarios
    FOR SELECT USING (true);
