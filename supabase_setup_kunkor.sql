-- 1. Create the products table with technical specifications
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Basic Information
    name TEXT NOT NULL,
    sku TEXT,
    price TEXT,
    collection TEXT,
    description TEXT,
    tagline TEXT DEFAULT 'A new masterpiece from our atölye',
    status TEXT DEFAULT 'taslak', -- 'taslak' or 'yayinda'
    slug TEXT UNIQUE,
    views_count INTEGER DEFAULT 0,
    
    -- Images
    image TEXT, -- Main thumb
    images JSONB DEFAULT '[]'::jsonb, -- Gallery images
    
    -- Translations (Multi-language support)
    translations JSONB DEFAULT '{}'::jsonb,
    
    -- Technical Specifications (Mühendislik Detayları)
    movement TEXT, -- Mekanizma
    case_material TEXT, -- Kasa Materyali
    case_size TEXT, -- Kasa Çapı
    water_resistance TEXT, -- Su Geçirmezlik
    power_reserve TEXT, -- Güç Rezervi
    crystal TEXT, -- Cam
    
    -- Additional Story/Content
    story TEXT
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
-- Allow everyone to read published products
CREATE POLICY "Public can view published products" ON public.products
    FOR SELECT USING (status = 'yayinda');

-- Allow authenticated users (CRM admins) to manage all products
CREATE POLICY "Admins can manage all products" ON public.products
    FOR ALL USING (true); -- Note: In production, use auth.role() = 'authenticated'

-- 4. Update Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON public.products 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- 5. Function to increment view count
CREATE OR REPLACE FUNCTION increment_views(product_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.products
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
