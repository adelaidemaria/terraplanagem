-- Create the vehicle_checklist_items table
CREATE TABLE public.vehicle_checklist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.company_vehicles(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vehicle_checklist_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Enable all for authenticated users" ON public.vehicle_checklist_items
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
    
-- Allow public select for the checklist form
CREATE POLICY "Enable read for anonymous users" ON public.vehicle_checklist_items
    FOR SELECT USING (true);
