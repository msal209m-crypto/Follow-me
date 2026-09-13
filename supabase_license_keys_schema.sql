-- =========================================================================
-- FlowApp Pro - License Keys Table & RLS Policies (Supabase / PostgreSQL)
-- =========================================================================

-- 1. Create table for license keys
CREATE TABLE IF NOT EXISTS public.license_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    plan TEXT NOT NULL DEFAULT '1Y', -- '1M', '3M', '6M', '1Y', 'LIFE'
    duration_days INTEGER NOT NULL DEFAULT 365,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT, -- Admin email or UID
    used_at TIMESTAMPTZ,
    used_by TEXT, -- Customer user_id (auth.uid())
    user_email TEXT, -- Customer email
    notes TEXT
);

-- Create index on key for ultra-fast lookup
CREATE INDEX IF NOT EXISTS idx_license_keys_key ON public.license_keys (key);
CREATE INDEX IF NOT EXISTS idx_license_keys_is_used ON public.license_keys (is_used);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Only admins can view the complete list of license keys
CREATE POLICY "Admins can view and manage all license keys"
ON public.license_keys
FOR ALL
TO authenticated
USING (
    auth.jwt() ->> 'email' = 'msal209m@gmail.com'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'ADMIN')
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'ADMIN')
    )
);

-- 4. Policy: Normal authenticated customers can ONLY verify a single unused key during activation
CREATE POLICY "Authenticated users can lookup unused keys for activation"
ON public.license_keys
FOR SELECT
TO authenticated
USING (
    is_used = false 
    OR used_by = auth.uid()::text
);

-- 5. Policy: Customers can only update an unused key to mark it as used by themselves
CREATE POLICY "Users can activate an unused key"
ON public.license_keys
FOR UPDATE
TO authenticated
USING (
    is_used = false
)
WITH CHECK (
    is_used = true
    AND used_by = auth.uid()::text
);
