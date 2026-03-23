-- Migration: Create user_stats table with auto-update triggers
-- File: 202501_create_user_stats.sql

-- Create user_stats table (single global row for counts)
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_users INTEGER NOT NULL DEFAULT 0,
    active_users INTEGER NOT NULL DEFAULT 0,
    inactive_users INTEGER NOT NULL DEFAULT 0,
    admin_users INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Ensure single row exists (idempotent init)
INSERT INTO user_stats (id) 
SELECT '00000000-0000-0000-0000-000000000001'::uuid 
WHERE NOT EXISTS (SELECT 1 FROM user_stats WHERE id = '00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT DO NOTHING;

-- Function to recalculate and update stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS VOID AS $$
BEGIN
    UPDATE user_stats 
    SET 
        total_users = (SELECT COUNT(*) FROM users),
        active_users = (SELECT COUNT(*) FROM users WHERE is_active = true),
        inactive_users = (SELECT COUNT(*) FROM users WHERE is_active = false),
        admin_users = (SELECT COUNT(*) FROM users WHERE role = 'admin'),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
END;
$$ LANGUAGE plpgsql;

-- Initial calculation
SELECT update_user_stats();

-- Triggers: Call update_user_stats after any change to users table
CREATE OR REPLACE FUNCTION trigger_update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_user_stats();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS users_after_insert ON users;
DROP TRIGGER IF EXISTS users_after_update ON users;
DROP TRIGGER IF EXISTS users_after_delete ON users;

-- Create triggers
CREATE TRIGGER users_after_insert
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_stats();

CREATE TRIGGER users_after_update
    AFTER UPDATE OF is_active, role ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_stats();

CREATE TRIGGER users_after_delete
    AFTER DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_stats();

-- RLS for user_stats: Admin read/write
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_user_stats" ON user_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "admin_update_user_stats" ON user_stats
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Realtime subscription enable
ALTER PUBLICATION supabase_realtime ADD TABLE user_stats;

-- Verification
SELECT 
    'User Stats Migration OK' AS status,
    total_users, active_users, inactive_users, admin_users, updated_at
FROM user_stats 
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

