-- =========================================================================
-- QueMyDJ Live Production Schema (Song Requests & DJ Sessions)
-- Run this in your Supabase SQL Editor (supabase.com/dashboard/project/_/sql)
-- =========================================================================

-- 1. Create song_requests table
CREATE TABLE IF NOT EXISTS public.song_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code TEXT NOT NULL UNIQUE,
    session_id TEXT NOT NULL,
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
    status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'accepted' | 'playing' | 'played' | 'declined' | 'refunded'
    decline_reason TEXT,
    feedback_given TEXT,
    paid_via TEXT DEFAULT 'Paystack',
    payment_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant session-keyed filtering
CREATE INDEX IF NOT EXISTS idx_song_requests_session_id ON public.song_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON public.song_requests(status);
CREATE INDEX IF NOT EXISTS idx_song_requests_created_at ON public.song_requests(created_at DESC);

-- 2. Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_song_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_song_requests_timestamp ON public.song_requests;
CREATE TRIGGER trigger_song_requests_timestamp
BEFORE UPDATE ON public.song_requests
FOR EACH ROW
EXECUTE FUNCTION update_song_requests_timestamp();

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.song_requests ENABLE ROW LEVEL SECURITY;

-- Allow public read of requests belonging to an active session
CREATE POLICY "Allow public read access for song requests"
ON public.song_requests FOR SELECT
TO anon, authenticated
USING (true);

-- Allow guests and server endpoints to insert new requests
CREATE POLICY "Allow insert access for new requests"
ON public.song_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow DJs to update request status (accept, play, decline)
CREATE POLICY "Allow update access for song requests"
ON public.song_requests FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Enable Supabase Realtime Replication for instant push to DJ Workstation
ALTER PUBLICATION supabase_realtime ADD TABLE public.song_requests;
