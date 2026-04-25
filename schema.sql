-- ===============================================================
-- PlaylistHub: SQL Schema for a single-user music app
-- Backend: Supabase (PostgreSQL)
-- ===============================================================

-- 1. USERS (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    user_type TEXT CHECK (user_type IN ('producer', 'client')) NOT NULL DEFAULT 'client',
    full_name TEXT,
    avatar_url TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;

-- 2. TRACKS
CREATE TABLE IF NOT EXISTS tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    artist TEXT DEFAULT 'OGBeatz',
    duration INTEGER,
    bpm INTEGER,
    key_signature TEXT,
    file_url TEXT,
    image_url TEXT,
    size INTEGER DEFAULT 0,
    type TEXT DEFAULT 'audio/mpeg',
    status TEXT DEFAULT 'ready',
    plays INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS tracks DISABLE ROW LEVEL SECURITY;

-- 3. ACTIVITIES
CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL,
    track_name TEXT,
    client_name TEXT DEFAULT 'System',
    playlist_name TEXT,
    share_token TEXT,
    item_type TEXT CHECK (item_type IN ('playlist', 'track')),
    item_id UUID,
    item_name TEXT,
    allow_download BOOLEAN,
    expires_at TIMESTAMPTZ,
    cover_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS activities DISABLE ROW LEVEL SECURITY;

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS track_name TEXT;
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT 'System';
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS playlist_name TEXT;
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS share_token TEXT;
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS item_type TEXT CHECK (item_type IN ('playlist', 'track'));
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS item_id UUID;
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS allow_download BOOLEAN;
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. PLAYLISTS
CREATE TABLE IF NOT EXISTS playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    track_ids UUID[] DEFAULT '{}'::uuid[],
    color_from TEXT DEFAULT '#8B5CF6',
    color_to TEXT DEFAULT '#EC4899',
    image_url TEXT,
    cover_image_url TEXT,
    is_locked BOOLEAN DEFAULT FALSE, -- If true, client cannot download
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS playlists DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE playlists IS 'Curated collections of tracks managed in the app.';

-- 4. PLAYLIST_TRACKS (Junction Table)
CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL, -- For custom ordering
    PRIMARY KEY (playlist_id, track_id)
);
ALTER TABLE IF EXISTS playlist_tracks DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE playlist_tracks IS 'Maps tracks to playlists with custom ordering.';

-- 5. CLIENTS (Relationship Management)
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT,
    client_email TEXT, -- Legacy alias kept for older rows
    status TEXT DEFAULT 'online',
    last_active TEXT DEFAULT 'Recently',
    active_playlists INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE clients IS 'Client records used by the app.';

ALTER TABLE tracks
    ADD COLUMN IF NOT EXISTS plays INTEGER DEFAULT 0;
ALTER TABLE tracks
    ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

ALTER TABLE playlists
    ADD COLUMN IF NOT EXISTS track_ids UUID[] DEFAULT '{}'::uuid[];
ALTER TABLE playlists
    ADD COLUMN IF NOT EXISTS color_from TEXT DEFAULT '#8B5CF6';
ALTER TABLE playlists
    ADD COLUMN IF NOT EXISTS color_to TEXT DEFAULT '#EC4899';
ALTER TABLE playlists
    ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE playlists
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE playlists
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online';
ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS last_active TEXT DEFAULT 'Recently';
ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS active_playlists INTEGER DEFAULT 0;
ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'clients'
          AND column_name = 'producer_id'
    ) THEN
        EXECUTE 'ALTER TABLE clients ALTER COLUMN producer_id DROP NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'clients'
          AND column_name = 'client_user_id'
    ) THEN
        EXECUTE 'ALTER TABLE clients ALTER COLUMN client_user_id DROP NOT NULL';
    END IF;
END $$;

UPDATE playlists
SET
    image_url = COALESCE(image_url, cover_image_url),
    color_from = COALESCE(color_from, '#8B5CF6'),
    color_to = COALESCE(color_to, '#EC4899'),
    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE image_url IS NULL
   OR color_from IS NULL
   OR color_to IS NULL
   OR updated_at IS NULL;

UPDATE playlists p
SET track_ids = COALESCE(
    (
        SELECT array_agg(pt.track_id ORDER BY pt.position)
        FROM playlist_tracks pt
        WHERE pt.playlist_id = p.id
    ),
    '{}'::uuid[]
)
WHERE (p.track_ids IS NULL OR cardinality(p.track_ids) = 0)
  AND EXISTS (
      SELECT 1
      FROM playlist_tracks pt
      WHERE pt.playlist_id = p.id
  );

UPDATE clients
SET
    email = COALESCE(email, client_email),
    client_email = COALESCE(client_email, email),
    name = COALESCE(
        name,
        CASE
            WHEN COALESCE(email, client_email) IS NOT NULL THEN initcap(
                regexp_replace(
                    split_part(COALESCE(email, client_email), '@', 1),
                    '[._-]+',
                    ' ',
                    'g'
                )
            )
            ELSE 'Client'
        END
    ),
    status = COALESCE(status, 'online'),
    last_active = COALESCE(last_active, 'Recently'),
    active_playlists = COALESCE(active_playlists, 0);

INSERT INTO clients (
    id,
    name,
    email,
    client_email,
    status,
    last_active,
    active_playlists,
    notes,
    created_at
)
SELECT
    p.id,
    COALESCE(
        NULLIF(TRIM(p.full_name), ''),
        initcap(
            regexp_replace(
                split_part(p.email, '@', 1),
                '[._-]+',
                ' ',
                'g'
            )
        )
    ) AS name,
    p.email,
    p.email,
    'online',
    'Recently',
    0,
    NULL,
    COALESCE(p.created_at, NOW())
FROM profiles p
WHERE p.user_type = 'client'
  AND NOT EXISTS (
      SELECT 1
      FROM clients c
      WHERE c.id = p.id
         OR LOWER(COALESCE(c.email, c.client_email)) = LOWER(p.email)
  );

-- 6. PLAYLIST_SHARES (Access Control)
CREATE TABLE IF NOT EXISTS playlist_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    access_token TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
    can_download BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS playlist_shares DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE playlist_shares IS 'Secure access tokens for sharing playlists with specific clients.';

-- 7. PUBLIC SHARE LINKS
CREATE TABLE IF NOT EXISTS share_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    share_token TEXT UNIQUE NOT NULL,
    item_type TEXT CHECK (item_type IN ('playlist', 'track')) NOT NULL,
    item_id UUID NOT NULL,
    item_name TEXT,
    client_name TEXT DEFAULT 'Public Link',
    allow_download BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    cover_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS share_links DISABLE ROW LEVEL SECURITY;

ALTER TABLE share_links
    ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE share_links
    ADD COLUMN IF NOT EXISTS share_token TEXT;
ALTER TABLE share_links
    ADD COLUMN IF NOT EXISTS item_type TEXT CHECK (item_type IN ('playlist', 'track'));
ALTER TABLE share_links
    ADD COLUMN IF NOT EXISTS item_id UUID;
ALTER TABLE share_links
    ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE share_links
    ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT 'Public Link';
ALTER TABLE share_links
    ADD COLUMN IF NOT EXISTS allow_download BOOLEAN DEFAULT TRUE;
ALTER TABLE share_links
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE share_links
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE share_links
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE share_links
SET
    token = COALESCE(token, share_token, id::text),
    share_token = COALESCE(share_token, token, id::text),
    client_name = COALESCE(client_name, 'Public Link'),
    allow_download = COALESCE(allow_download, TRUE),
    created_at = COALESCE(created_at, NOW())
WHERE token IS NULL OR share_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(share_token);
COMMENT ON TABLE share_links IS 'Public share tokens for tracks and playlists.';

-- 8. LEGACY SHARE BACKFILL
WITH legacy_share_groups AS (
    SELECT
        a.share_token,
        CASE
            WHEN BOOL_OR(a.playlist_name IS NOT NULL) THEN 'playlist'
            WHEN BOOL_OR(a.track_name IS NOT NULL) THEN 'track'
            ELSE NULL
        END AS item_type,
        COALESCE(
            MAX(a.playlist_name) FILTER (WHERE a.playlist_name IS NOT NULL),
            MAX(a.track_name) FILTER (WHERE a.track_name IS NOT NULL)
        ) AS item_name,
        COALESCE(MAX(a.client_name) FILTER (WHERE a.client_name IS NOT NULL), 'Public Link') AS client_name,
        TRUE AS allow_download,
        NULL::TIMESTAMPTZ AS expires_at,
        MIN(a.created_at) AS created_at
    FROM activities a
    WHERE a.type = 'share' AND a.share_token IS NOT NULL
    GROUP BY a.share_token
),
legacy_share_resolved AS (
    SELECT
        g.share_token,
        g.item_type,
        COALESCE(
            (
                SELECT p.id
                FROM playlists p
                WHERE p.name = g.item_name
                ORDER BY p.updated_at DESC, p.created_at DESC
                LIMIT 1
            ),
            (
                SELECT t.id
                FROM tracks t
                WHERE t.name = g.item_name
                ORDER BY t.created_at DESC
                LIMIT 1
            ),
            gen_random_uuid()
        ) AS item_id,
        g.item_name,
        g.client_name,
        g.allow_download,
        g.expires_at,
        COALESCE(
            (
                SELECT p.cover_image_url
                FROM playlists p
                WHERE p.name = g.item_name
                ORDER BY p.updated_at DESC, p.created_at DESC
                LIMIT 1
            ),
            (
                SELECT t.image_url
                FROM tracks t
                WHERE t.name = g.item_name
                ORDER BY t.created_at DESC
                LIMIT 1
            )
        ) AS cover_image_url,
        g.created_at
    FROM legacy_share_groups g
    WHERE g.item_type IS NOT NULL
)
UPDATE share_links s
SET
    token = COALESCE(s.token, r.share_token),
    item_type = r.item_type,
    item_id = r.item_id,
    item_name = r.item_name,
    client_name = r.client_name,
    allow_download = r.allow_download,
    expires_at = r.expires_at,
    cover_image_url = r.cover_image_url
FROM legacy_share_resolved r
WHERE s.share_token = r.share_token;

WITH legacy_share_groups AS (
    SELECT
        a.share_token,
        CASE
            WHEN BOOL_OR(a.playlist_name IS NOT NULL) THEN 'playlist'
            WHEN BOOL_OR(a.track_name IS NOT NULL) THEN 'track'
            ELSE NULL
        END AS item_type,
        COALESCE(
            MAX(a.playlist_name) FILTER (WHERE a.playlist_name IS NOT NULL),
            MAX(a.track_name) FILTER (WHERE a.track_name IS NOT NULL)
        ) AS item_name,
        COALESCE(MAX(a.client_name) FILTER (WHERE a.client_name IS NOT NULL), 'Public Link') AS client_name,
        TRUE AS allow_download,
        NULL::TIMESTAMPTZ AS expires_at,
        MIN(a.created_at) AS created_at
    FROM activities a
    WHERE a.type = 'share' AND a.share_token IS NOT NULL
    GROUP BY a.share_token
),
legacy_share_resolved AS (
    SELECT
        g.share_token,
        g.item_type,
        COALESCE(
            (
                SELECT p.id
                FROM playlists p
                WHERE p.name = g.item_name
                ORDER BY p.updated_at DESC, p.created_at DESC
                LIMIT 1
            ),
            (
                SELECT t.id
                FROM tracks t
                WHERE t.name = g.item_name
                ORDER BY t.created_at DESC
                LIMIT 1
            ),
            gen_random_uuid()
        ) AS item_id,
        g.item_name,
        g.client_name,
        g.allow_download,
        g.expires_at,
        COALESCE(
            (
                SELECT p.cover_image_url
                FROM playlists p
                WHERE p.name = g.item_name
                ORDER BY p.updated_at DESC, p.created_at DESC
                LIMIT 1
            ),
            (
                SELECT t.image_url
                FROM tracks t
                WHERE t.name = g.item_name
                ORDER BY t.created_at DESC
                LIMIT 1
            )
        ) AS cover_image_url,
        g.created_at
    FROM legacy_share_groups g
    WHERE g.item_type IS NOT NULL
)
INSERT INTO share_links (
    token,
    share_token,
    item_type,
    item_id,
    item_name,
    client_name,
    allow_download,
    expires_at,
    cover_image_url,
    created_at
)
SELECT
    r.share_token,
    r.share_token,
    r.item_type,
    r.item_id,
    r.item_name,
    r.client_name,
    r.allow_download,
    r.expires_at,
    r.cover_image_url,
    r.created_at
FROM legacy_share_resolved r
WHERE NOT EXISTS (
    SELECT 1
    FROM share_links s
    WHERE s.share_token = r.share_token
);

UPDATE activities a
SET
    item_type = COALESCE(a.item_type, s.item_type),
    item_id = COALESCE(a.item_id, s.item_id),
    item_name = COALESCE(a.item_name, s.item_name),
    allow_download = COALESCE(a.allow_download, s.allow_download),
    expires_at = COALESCE(a.expires_at, s.expires_at),
    cover_image_url = COALESCE(a.cover_image_url, s.cover_image_url)
FROM share_links s
WHERE a.type = 'share'
  AND a.share_token = COALESCE(s.share_token, s.token)
  AND (a.item_type IS NULL OR a.item_id IS NULL OR a.item_name IS NULL OR a.allow_download IS NULL OR a.expires_at IS NULL OR a.cover_image_url IS NULL);

-- 9. FEEDBACK
CREATE TABLE IF NOT EXISTS feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    feedback_type TEXT CHECK (feedback_type IN ('like', 'dislike', 'none')) DEFAULT 'none',
    comment TEXT,
    timestamp_seconds INTEGER, -- Optional: feedback at a specific time in the track
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS feedback DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE feedback IS 'Client reactions and notes on specific tracks within a playlist.';

-- 10. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID, -- Optional: sender ID
    recipient_id TEXT NOT NULL, -- Client ID or Email
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id);
COMMENT ON TABLE messages IS 'Direct messaging within the app.';

-- 11. ACTIVITY_LOG
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'playlist_viewed', 'track_liked', 'comment_added'
    entity_id UUID, -- ID of the related playlist/track/etc.
    metadata JSONB, -- Additional context (IP, browser, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS activity_log DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE activity_log IS 'Audit trail of all interactions for real-time tracking and analytics.';

-- ===============================================================
-- SAMPLE SEED DATA (REMOVED)
-- ===============================================================
-- Manual inserts into profiles will fail unless the user exists in auth.users.
-- Use the trigger below to handle profile creation automatically.

-- 12. AUTOMATIC PROFILE CREATION TRIGGER
-- This function creates a profile entry whenever a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
