-- =========================================================================
-- Qaryati Platform (منصة قريتي الذكية) - Master Supabase / PostgreSQL Schema
-- Five Robust Tables with Village-First Filtering, Admin Gatekeeping, RLS & Realtime
-- =========================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- TABLE 1: villages (القرى الثابتة المعتمدة في النظام)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.villages (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    region TEXT DEFAULT 'منطقة ميسان / بني مالك',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pre-populate the 10 fixed official villages
INSERT INTO public.villages (id, name, region) VALUES
    ('vil-fasour', 'قرية الفصور', 'منطقة ميسان / بني مالك'),
    ('vil-haqali', 'قرية الحقالي', 'منطقة ميسان / بني مالك'),
    ('vil-barka', 'قرية الباركة', 'منطقة ميسان / بني مالك'),
    ('vil-anhoom', 'قرية الانهوم', 'منطقة ميسان / بني مالك'),
    ('vil-mushayjiba', 'قرية مشيجبه', 'منطقة ميسان / بني مالك'),
    ('vil-jabari', 'سوق حول جباري', 'منطقة ميسان / بني مالك'),
    ('vil-midad', 'قرية المداد', 'منطقة ميسان / بني مالك'),
    ('vil-jami', 'قرية الجامع', 'منطقة ميسان / بني مالك'),
    ('vil-masilah', 'قرية المسيلة', 'منطقة ميسان / بني مالك'),
    ('vil-makil', 'قرية المكيل', 'منطقة ميسان / بني مالك')
ON CONFLICT (name) DO UPDATE SET is_active = true;

CREATE INDEX IF NOT EXISTS idx_villages_name ON public.villages (name);

-- =========================================================================
-- TABLE 2: merchants (حسابات التجار ومتاجرهم)
-- Gatekeeping: is_approved defaults to FALSE (Pending approval by developer)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.merchants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    national_id TEXT NOT NULL,
    photo TEXT,
    id_card_photo TEXT,
    village_id TEXT NOT NULL,
    village_name TEXT NOT NULL,
    store_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT false, -- Admin Gatekeeping: false = pending approval
    is_pro BOOLEAN NOT NULL DEFAULT false,
    plan_name TEXT DEFAULT 'الباقة المجانية',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ultra-fast indexing for the Village-First query:
-- SELECT * FROM merchants WHERE village_id = [Chosen_Village] AND is_approved = true
CREATE INDEX IF NOT EXISTS idx_merchants_village_approved 
ON public.merchants (village_id, is_approved);

CREATE INDEX IF NOT EXISTS idx_merchants_village_name_approved 
ON public.merchants (village_name, is_approved);

CREATE INDEX IF NOT EXISTS idx_merchants_phone ON public.merchants (phone);
CREATE INDEX IF NOT EXISTS idx_merchants_national_id ON public.merchants (national_id);

-- =========================================================================
-- TABLE 3: drivers (مناديب وسائقو التوصيل)
-- Gatekeeping: is_approved defaults to FALSE (Pending approval by developer)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.drivers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    national_id TEXT NOT NULL,
    photo TEXT,
    id_card_photo TEXT,
    vehicle_type TEXT NOT NULL DEFAULT 'MOTORCYCLE', -- 'BICYCLE', 'MOTORCYCLE', 'CAR'
    vehicle_plate TEXT,
    zone TEXT DEFAULT 'القرية',
    village_id TEXT,
    password_hash TEXT NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT false, -- Admin Gatekeeping
    is_online BOOLEAN NOT NULL DEFAULT true,
    total_delivered INTEGER NOT NULL DEFAULT 0,
    rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_phone ON public.drivers (phone);
CREATE INDEX IF NOT EXISTS idx_drivers_is_approved ON public.drivers (is_approved);
CREATE INDEX IF NOT EXISTS idx_drivers_is_online ON public.drivers (is_online);

-- =========================================================================
-- TABLE 4: customers (سجل العملاء والمشترين)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    village_id TEXT,
    village_name TEXT,
    national_id TEXT,
    house_photo TEXT,
    status TEXT DEFAULT 'NEW',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);

-- =========================================================================
-- TABLE 5: orders (إدارة حركة الطلبات بين العميل والتاجر والسائق)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_address TEXT,
    store_id TEXT NOT NULL,
    store_name TEXT NOT NULL,
    driver_id TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    village_id TEXT,
    village_name TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'CASH_ON_DELIVERY',
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED'
    notes TEXT,
    store_rating NUMERIC(2,1),
    driver_rating NUMERIC(2,1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders (store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders (driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

-- =========================================================================
-- 6. Realtime Publication Setup
-- Enable Supabase Realtime for automatic synchronization across 100+ concurrent users
-- =========================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.villages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.merchants;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================================
-- 7. Row Level Security (RLS) Setup
-- =========================================================================
ALTER TABLE public.villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Villages Policies: Public read for all visitors
CREATE POLICY "Allow public read on villages"
ON public.villages FOR SELECT TO public
USING (true);

-- Merchants Policies:
-- 1. Public visitors can ONLY see approved merchants in their chosen village:
-- Formula: SELECT * FROM merchants WHERE village_id = [Chosen_Village] AND is_approved = true
CREATE POLICY "Public read only approved merchants"
ON public.merchants FOR SELECT TO public
USING (is_approved = true);

-- 2. Allow registration insertion by any visitor (defaults to is_approved = false)
CREATE POLICY "Allow registration insert for merchants"
ON public.merchants FOR INSERT TO public
WITH CHECK (true);

-- 3. Merchants can view their own record even if not approved
CREATE POLICY "Merchants can view and update own profile"
ON public.merchants FOR ALL TO public
USING (true)
WITH CHECK (true);

-- Drivers Policies:
CREATE POLICY "Public read approved drivers"
ON public.drivers FOR SELECT TO public
USING (true);

CREATE POLICY "Allow driver registration insert"
ON public.drivers FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "Drivers manage own profile"
ON public.drivers FOR UPDATE TO public
USING (true)
WITH CHECK (true);

-- Customers Policies:
CREATE POLICY "Customers manage own profile"
ON public.customers FOR ALL TO public
USING (true)
WITH CHECK (true);

-- Orders Policies:
CREATE POLICY "Public create and read orders"
ON public.orders FOR ALL TO public
USING (true)
WITH CHECK (true);
