-- Create the daily_checklists table
CREATE TABLE public.daily_checklists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operator_name TEXT NOT NULL,
    equipment_id UUID,
    equipment_name TEXT NOT NULL,
    equipment_type TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    items JSONB NOT NULL DEFAULT '{}'::jsonb,
    observations TEXT,
    situation TEXT, -- e.g., 'EQUIPAMENTO LIBERADO' or 'EQUIPAMENTO NÃO LIBERADO'
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.daily_checklists ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone to insert checklists (since it's a public link)
CREATE POLICY "Enable insert for anonymous users" ON public.daily_checklists
    FOR INSERT WITH CHECK (true);

-- Create policy for authenticated users to view checklists
CREATE POLICY "Enable select for authenticated users only" ON public.daily_checklists
    FOR SELECT TO authenticated USING (true);

-- Create policy for authenticated users to delete/update (admin panel)
CREATE POLICY "Enable update for authenticated users only" ON public.daily_checklists
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.daily_checklists
    FOR DELETE TO authenticated USING (true);

-- We need to ensure operators can read the 'company_vehicles' or 'equipment' list publicly
-- Assuming the table is company_vehicles
CREATE POLICY "Enable read access for all users on company_vehicles" ON public.company_vehicles
    FOR SELECT USING (true);

-- Create storage bucket for checklist photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checklist_photos', 'checklist_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public uploads to checklist_photos bucket
CREATE POLICY "Public Uploads to checklist_photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'checklist_photos');

-- Allow public reading of checklist_photos (for the admin panel or reports)
CREATE POLICY "Public Read for checklist_photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'checklist_photos');
