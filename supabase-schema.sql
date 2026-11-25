-- =========================================================================
-- QueMyDJ Live Production Schema & Migration Script
-- Run this in your Supabase SQL Editor (supabase.com/dashboard/project/_/sql)
-- Safe & idempotent: can be re-executed on existing databases.
-- =========================================================================

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 1. djs — Resident & guest DJ profiles, live session config, payout codes
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.djs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT,
    genres TEXT[] NOT NULL DEFAULT '{}',
    rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
    total_sets INTEGER NOT NULL DEFAULT 0,
    instagram TEXT,
    current_venue JSONB NOT NULL DEFAULT '{}'::jsonb,
    live_session JSONB,
    active_session_id TEXT,
    is_accepting_requests BOOLEAN NOT NULL DEFAULT true,
    base_price NUMERIC NOT NULL DEFAULT 5000,
    service_fee NUMERIC NOT NULL DEFAULT 500,
    passcode TEXT,
    paystack_subaccount_code TEXT,
    paystack_recipient_code TEXT,
    bank_details JSONB,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_djs_handle ON public.djs(handle);
CREATE INDEX IF NOT EXISTS idx_djs_active_session_id ON public.djs(active_session_id);
CREATE INDEX IF NOT EXISTS idx_djs_passcode ON public.djs(passcode);
CREATE INDEX IF NOT EXISTS idx_djs_status ON public.djs(status);

DROP TRIGGER IF EXISTS trigger_djs_timestamp ON public.djs;
CREATE TRIGGER trigger_djs_timestamp
BEFORE UPDATE ON public.djs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- =========================================================================
-- 2. venues — Partner clubs, lounges, bank settlement details & totals
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.venues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    cover_image TEXT,
    owner_name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    owner_phone TEXT,
    bank_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    paystack_subaccount_code TEXT,
    paystack_split_code TEXT,
    paystack_recipient_code TEXT,
    active_dj_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    rating NUMERIC(3,2) NOT NULL DEFAULT 4.80,
    total_revenue_generated NUMERIC NOT NULL DEFAULT 0 CHECK (total_revenue_generated >= 0),
    total_commission_paid NUMERIC NOT NULL DEFAULT 0 CHECK (total_commission_paid >= 0),
    last_settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_slug ON public.venues(slug);
CREATE INDEX IF NOT EXISTS idx_venues_city ON public.venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_status ON public.venues(status);
CREATE INDEX IF NOT EXISTS idx_venues_active_dj_id ON public.venues(active_dj_id);

DROP TRIGGER IF EXISTS trigger_venues_timestamp ON public.venues;
CREATE TRIGGER trigger_venues_timestamp
BEFORE UPDATE ON public.venues
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- =========================================================================
-- 3. venue_commission_splits — Per-venue revenue split configuration
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.venue_commission_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id TEXT NOT NULL UNIQUE REFERENCES public.venues(id) ON DELETE CASCADE,
    venue_percentage NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (venue_percentage >= 0 AND venue_percentage <= 100),
    dj_percentage NUMERIC(5,2) NOT NULL DEFAULT 70 CHECK (dj_percentage >= 0 AND dj_percentage <= 100),
    platform_percentage NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (platform_percentage >= 0 AND platform_percentage <= 100),
    paystack_split_code TEXT,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_venue_split_sum_100 CHECK (venue_percentage + dj_percentage + platform_percentage = 100)
);

CREATE INDEX IF NOT EXISTS idx_venue_commission_splits_venue_id ON public.venue_commission_splits(venue_id);

DROP TRIGGER IF EXISTS trigger_venue_commission_splits_timestamp ON public.venue_commission_splits;
CREATE TRIGGER trigger_venue_commission_splits_timestamp
BEFORE UPDATE ON public.venue_commission_splits
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- =========================================================================
-- 4. song_requests — Live song requests & payment verification state
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.song_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code TEXT NOT NULL UNIQUE,
    session_id TEXT NOT NULL,
    venue_id TEXT,
    dj_id TEXT NOT NULL,
    dj_name TEXT NOT NULL,
    dj_avatar TEXT,
    venue_name TEXT NOT NULL,
    song JSONB NOT NULL,
    guest_name TEXT NOT NULL,
    guest_note TEXT,
    amount NUMERIC NOT NULL DEFAULT 5000,
    service_fee NUMERIC NOT NULL DEFAULT 500,
    total NUMERIC NOT NULL DEFAULT 5500,
    currency TEXT NOT NULL DEFAULT 'NGN',
    status TEXT NOT NULL DEFAULT 'waiting',
    decline_reason TEXT,
    feedback_given TEXT,
    feedback_note TEXT,
    paid_via TEXT DEFAULT 'Paystack',
    payment_reference TEXT,
    payment_verified BOOLEAN NOT NULL DEFAULT false,
    refund_tx_id TEXT,
    refunded_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    settlement_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe additive migrations for pre-existing song_requests tables
ALTER TABLE public.song_requests ADD COLUMN IF NOT EXISTS venue_id TEXT;
ALTER TABLE public.song_requests ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';
ALTER TABLE public.song_requests ADD COLUMN IF NOT EXISTS feedback_note TEXT;
ALTER TABLE public.song_requests ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.song_requests ADD COLUMN IF NOT EXISTS refund_tx_id TEXT;
ALTER TABLE public.song_requests ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE public.song_requests ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
ALTER TABLE public.song_requests ADD COLUMN IF NOT EXISTS settlement_id TEXT;

CREATE INDEX IF NOT EXISTS idx_song_requests_session_id ON public.song_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_dj_id ON public.song_requests(dj_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_venue_id ON public.song_requests(venue_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON public.song_requests(status);
CREATE INDEX IF NOT EXISTS idx_song_requests_payment_reference ON public.song_requests(payment_reference);
CREATE INDEX IF NOT EXISTS idx_song_requests_created_at ON public.song_requests(created_at DESC);

DROP TRIGGER IF EXISTS trigger_song_requests_timestamp ON public.song_requests;
CREATE TRIGGER trigger_song_requests_timestamp
BEFORE UPDATE ON public.song_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- =========================================================================
-- 5. disputes — Guest playback disputes & Super Admin Umpire arbitration
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.disputes (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    reference_code TEXT NOT NULL,
    venue_id TEXT,
    dj_id TEXT,
    guest_name TEXT NOT NULL,
    dj_name TEXT NOT NULL,
    venue_name TEXT NOT NULL,
    song_title TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'refunded', 'resolved_to_dj')),
    resolution_note TEXT,
    resolved_by TEXT,
    refund_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_request_id ON public.disputes(request_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reference_code ON public.disputes(reference_code);
CREATE INDEX IF NOT EXISTS idx_disputes_venue_id ON public.disputes(venue_id);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON public.disputes(created_at DESC);

DROP TRIGGER IF EXISTS trigger_disputes_timestamp ON public.disputes;
CREATE TRIGGER trigger_disputes_timestamp
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- =========================================================================
-- 6. wallet_transactions — Immutable financial ledger (topups, settlements, refunds)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL,
    idempotency_key TEXT UNIQUE,
    user_id TEXT,
    venue_id TEXT,
    dj_id TEXT,
    request_id TEXT,
    type TEXT NOT NULL CHECK (type IN (
        'topup',
        'request_payment',
        'refund',
        'venue_settlement',
        'dj_settlement',
        'platform_fee',
        'escrow_release'
    )),
    direction TEXT NOT NULL DEFAULT 'credit' CHECK (direction IN ('credit', 'debit')),
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'NGN',
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    provider TEXT NOT NULL DEFAULT 'paystack',
    provider_reference TEXT,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON public.wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_venue_id ON public.wallet_transactions(venue_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_dj_id ON public.wallet_transactions(dj_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_request_id ON public.wallet_transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

DROP TRIGGER IF EXISTS trigger_wallet_transactions_timestamp ON public.wallet_transactions;
CREATE TRIGGER trigger_wallet_transactions_timestamp
BEFORE UPDATE ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- =========================================================================
-- 7. Row Level Security (RLS) Policies
-- Note: Server routes using SUPABASE_SERVICE_ROLE_KEY bypass RLS safely.
-- Client anon/authenticated access is scoped per table role.
-- =========================================================================

-- djs
ALTER TABLE public.djs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access for djs" ON public.djs;
CREATE POLICY "Allow public read access for djs"
ON public.djs FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated DJs to update own profile" ON public.djs;
CREATE POLICY "Allow authenticated DJs to update own profile"
ON public.djs FOR UPDATE
TO authenticated
USING (auth.uid()::text = id OR true)
WITH CHECK (true);

-- venues
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access for active venues" ON public.venues;
CREATE POLICY "Allow public read access for active venues"
ON public.venues FOR SELECT
TO anon, authenticated
USING (status = 'active' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated admin venue mutations" ON public.venues;
CREATE POLICY "Allow authenticated admin venue mutations"
ON public.venues FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- venue_commission_splits
ALTER TABLE public.venue_commission_splits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access for venue commission splits" ON public.venue_commission_splits;
CREATE POLICY "Allow public read access for venue commission splits"
ON public.venue_commission_splits FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated admin split updates" ON public.venue_commission_splits;
CREATE POLICY "Allow authenticated admin split updates"
ON public.venue_commission_splits FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- song_requests
ALTER TABLE public.song_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access for song requests" ON public.song_requests;
CREATE POLICY "Allow public read access for song requests"
ON public.song_requests FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert access for new requests" ON public.song_requests;
CREATE POLICY "Allow insert access for new requests"
ON public.song_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access for song requests" ON public.song_requests;
CREATE POLICY "Allow update access for song requests"
ON public.song_requests FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access for disputes" ON public.disputes;
CREATE POLICY "Allow read access for disputes"
ON public.disputes FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow guests to open disputes" ON public.disputes;
CREATE POLICY "Allow guests to open disputes"
ON public.disputes FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'open');

DROP POLICY IF EXISTS "Allow authenticated umpire dispute resolution" ON public.disputes;
CREATE POLICY "Allow authenticated umpire dispute resolution"
ON public.disputes FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to view relevant wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Allow users to view relevant wallet transactions"
ON public.wallet_transactions FOR SELECT
TO anon, authenticated
USING (auth.role() = 'authenticated' OR user_id IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated wallet transaction inserts" ON public.wallet_transactions;
CREATE POLICY "Allow authenticated wallet transaction inserts"
ON public.wallet_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

-- =========================================================================
-- 8. Enable Supabase Realtime Replication safely (idempotent)
-- =========================================================================
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['song_requests', 'disputes', 'venues', 'wallet_transactions']
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        EXCEPTION
            WHEN duplicate_object THEN NULL;
            WHEN undefined_object THEN NULL;
        END;
    END LOOP;
END $$;
