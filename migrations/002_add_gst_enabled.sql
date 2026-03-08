-- ═══════════════════════════════════════════════════════════════════════════════
-- Add GST Toggle Feature to Profiles
-- Enables users to control whether GST is applied to their invoices
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add gst_enabled column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gst_enabled BOOLEAN DEFAULT FALSE;

-- Create index on gst_enabled for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_gst_enabled ON profiles(gst_enabled);

-- Comment for documentation
COMMENT ON COLUMN profiles.gst_enabled IS 'Toggle to control whether GST is calculated and displayed on user invoices';
