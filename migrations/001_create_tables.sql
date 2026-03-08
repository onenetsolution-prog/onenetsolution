-- ═══════════════════════════════════════════════════════════════════════════════
-- One Net Solution - Database Migration
-- Creates all required tables for CSC Center Manager application
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Profiles extension (add missing columns if needed)
-- ─────────────────────────────────────────────────────────────────────────────
-- Run this query if you need to add GST and PAN columns:
-- ALTER TABLE profiles ADD COLUMN gst_number TEXT DEFAULT '' NOT NULL;
-- ALTER TABLE profiles ADD COLUMN pan_number TEXT DEFAULT '' NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Admin Audit Log Table
-- ─────────────────────────────────────────────────────────────────────────────
-- This table tracks all administrative actions for compliance and debugging
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Payment Logs Table
-- ─────────────────────────────────────────────────────────────────────────────
-- This table records all payments made by users
CREATE TABLE IF NOT EXISTS payment_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL, -- 'upi', 'bank', 'cash', 'online'
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    recorded_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_payment_date ON payment_logs(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Admin Messages Table (for private messages to users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_messages_user_id ON admin_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_expires_at ON admin_messages(expires_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Archived Entries (for soft deletes)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS archived_entries (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    original_table TEXT NOT NULL,
    entry_data JSONB NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_archived_entries_user_id ON archived_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_archived_entries_archived_at ON archived_entries(archived_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS (Row Level Security) if needed
-- ─────────────────────────────────────────────────────────────────────────────

-- For admin_audit_log: Only admin can view/insert
-- ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY admin_audit_log_admin_only ON admin_audit_log
--     FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- For payment_logs: Users can view their own, admin can view all
-- ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY payment_logs_user_view ON payment_logs
--     FOR SELECT USING (user_id = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
-- CREATE POLICY payment_logs_admin_write ON payment_logs
--     FOR INSERT USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- For admin_messages: Users can view their own, admin can insert
-- ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY admin_messages_user_view ON admin_messages
--     FOR SELECT USING (user_id = auth.uid());
-- CREATE POLICY admin_messages_admin_write ON admin_messages
--     FOR INSERT USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

