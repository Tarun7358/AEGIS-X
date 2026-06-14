-- AEGIS X Database Schema
-- Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. GUILDS & SETTINGS
-- ==========================================

CREATE TABLE IF NOT EXISTS guilds (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon_url VARCHAR(512),
    owner_id VARCHAR(64) NOT NULL,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id VARCHAR(64) PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
    prefix VARCHAR(10) DEFAULT '!',
    
    -- Roles
    role_owner VARCHAR(64),
    role_security_director VARCHAR(64),
    role_security_admin VARCHAR(64),
    role_admin VARCHAR(64),
    role_moderator VARCHAR(64),
    role_support_team VARCHAR(64),
    role_dj VARCHAR(64),
    role_event_manager VARCHAR(64),
    role_verified VARCHAR(64),
    role_member VARCHAR(64),
    role_vip VARCHAR(64),
    role_booster VARCHAR(64),
    role_muted VARCHAR(64),
    role_quarantined VARCHAR(64),
    role_unverified VARCHAR(64),

    -- Channels
    channel_security_alerts VARCHAR(64),
    channel_threat_feed VARCHAR(64),
    channel_incident_reports VARCHAR(64),
    channel_audit_logs VARCHAR(64),
    channel_backup_status VARCHAR(64),
    channel_verification_review VARCHAR(64),
    channel_staff_actions VARCHAR(64),

    -- Features toggles
    anti_nuke_enabled BOOLEAN DEFAULT FALSE,
    anti_raid_enabled BOOLEAN DEFAULT FALSE,
    anti_spam_enabled BOOLEAN DEFAULT FALSE,
    anti_scam_enabled BOOLEAN DEFAULT FALSE,
    anti_phishing_enabled BOOLEAN DEFAULT FALSE,
    anti_malware_enabled BOOLEAN DEFAULT FALSE,
    verification_enabled BOOLEAN DEFAULT FALSE,
    ai_moderation_enabled BOOLEAN DEFAULT FALSE,
    economy_enabled BOOLEAN DEFAULT FALSE,
    leveling_enabled BOOLEAN DEFAULT FALSE,
    music_enabled BOOLEAN DEFAULT FALSE,
    tickets_enabled BOOLEAN DEFAULT FALSE,

    -- Welcome & Farewell Announcements (Koya inspired)
    welcome_enabled BOOLEAN DEFAULT FALSE,
    welcome_channel VARCHAR(64),
    welcome_message TEXT DEFAULT 'Welcome [user] to [server]! You are member #[membercount].',
    welcome_dm_enabled BOOLEAN DEFAULT FALSE,
    welcome_dm_message TEXT DEFAULT 'Hello [username], welcome to [server]!',
    leave_enabled BOOLEAN DEFAULT FALSE,
    leave_channel VARCHAR(64),
    leave_message TEXT DEFAULT '[username] has left the server. We now have [membercount] members.',
    autorole_enabled BOOLEAN DEFAULT FALSE,
    autorole_roles VARCHAR(512) DEFAULT '',

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. USERS & PROFILES
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    discriminator VARCHAR(4) DEFAULT '0000',
    avatar_url VARCHAR(512),
    bot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    nickname VARCHAR(100),
    joined_at TIMESTAMP WITH TIME ZONE,
    roles VARCHAR(64)[] DEFAULT '{}',
    is_quarantined BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. VERIFICATION SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS verification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, MANUAL_REVIEW, APPROVED, REJECTED
    captcha_type VARCHAR(50) DEFAULT 'TEXT', -- TEXT, IMAGE, BUTTON
    captcha_answer VARCHAR(100),
    risk_score INTEGER DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'GREEN', -- GREEN, YELLOW, ORANGE, RED
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    moderator_id VARCHAR(64) REFERENCES users(id),
    status VARCHAR(50) NOT NULL, -- APPROVED, REJECTED, AUTO_APPROVED
    risk_score INTEGER DEFAULT 0,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quarantine_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    action_by VARCHAR(64) REFERENCES users(id),
    released_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS join_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    account_age_days INTEGER,
    invite_code VARCHAR(50),
    suspicious_username BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invite_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    inviter_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    uses INTEGER DEFAULT 0,
    max_uses INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. MODERATION SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    moderator_id VARCHAR(64) REFERENCES users(id),
    reason TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    moderator_id VARCHAR(64) REFERENCES users(id),
    reason TEXT,
    temp_ban_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    moderator_id VARCHAR(64) REFERENCES users(id),
    reason TEXT,
    mute_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS moderation_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number SERIAL,
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    moderator_id VARCHAR(64) REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL, -- WARN, MUTE, TIMEOUT, KICK, BAN, UNBAN, QUARANTINE
    reason TEXT NOT NULL,
    evidence_url VARCHAR(512),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, REVOKED, EXPIRED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. TICKETS SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    channel_id VARCHAR(64) UNIQUE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- SUPPORT, BUG, PURCHASE, APPLY
    status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, CLAIMED, CLOSED
    assigned_to VARCHAR(64) REFERENCES users(id),
    transcript_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id VARCHAR(64) REFERENCES users(id),
    content TEXT,
    attachments VARCHAR(512)[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. SECURITY & THREAT INTELLIGENCE
-- ==========================================

CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    incident_type VARCHAR(100) NOT NULL, -- ANTI_NUKE, ANTI_RAID, ANTI_SPAM, ANTI_SCAM, PHISHING
    severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    offender_id VARCHAR(64) REFERENCES users(id),
    details TEXT,
    action_taken VARCHAR(100),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS threat_scores (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    threat_level VARCHAR(20) DEFAULT 'GREEN', -- GREEN, YELLOW, ORANGE, RED
    history JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- DAILY, WEEKLY, INCIDENT_SUMMARY
    summary TEXT,
    stats JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id),
    action TEXT NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(64),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. BACKUP SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    backup_name VARCHAR(100) NOT NULL,
    backup_data JSONB NOT NULL, -- Contains roles, channels, permission overrides
    size_bytes INTEGER NOT NULL,
    created_by VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    backup_id UUID REFERENCES backups(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- BACKUP_CREATE, BACKUP_RESTORE, BACKUP_DELETE
    status VARCHAR(50) NOT NULL, -- SUCCESS, FAILED
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 8. LEVELING SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS xp_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    voice_minutes INTEGER DEFAULT 0,
    last_xp_gain TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, user_id)
);

-- ==========================================
-- 9. ECONOMY SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS economy_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    coins INTEGER DEFAULT 100,
    bank INTEGER DEFAULT 0,
    inventory JSONB DEFAULT '[]'::jsonb,
    last_daily TIMESTAMP WITH TIME ZONE,
    last_work TIMESTAMP WITH TIME ZONE,
    UNIQUE(guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS economy_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    sender_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    receiver_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- DAILY, WORK, TRANSFER, STORE_BUY
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 10. MUSIC & VOICE SYSTEMS
-- ==========================================

CREATE TABLE IF NOT EXISTS music_playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    creator_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    tracks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    channel_id VARCHAR(64) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 11. GIVEAWAYS, SUGGESTIONS & POLLS
-- ==========================================

CREATE TABLE IF NOT EXISTS giveaways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    message_id VARCHAR(64) UNIQUE NOT NULL,
    channel_id VARCHAR(64) NOT NULL,
    prize VARCHAR(255) NOT NULL,
    winner_count INTEGER DEFAULT 1,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    participants VARCHAR(64)[] DEFAULT '{}',
    winners VARCHAR(64)[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, ENDED, REROLLED
    role_requirement VARCHAR(64),
    invite_requirement VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    message_id VARCHAR(64) UNIQUE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    staff_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    message_id VARCHAR(64) UNIQUE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- e.g. [{"id": 1, "text": "Yes", "votes": []}]
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 12. STAFF ACTIVITY & AI CONVERSATIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS staff_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    staff_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- KICK, BAN, TICKET_CLOSE, LOCKDOWN
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    channel_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]'::jsonb, -- Store list of message history
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 13. ANALYTICS & LOGS
-- ==========================================

CREATE TABLE IF NOT EXISTS server_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    joins INTEGER DEFAULT 0,
    leaves INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    voice_minutes INTEGER DEFAULT 0,
    tickets_created INTEGER DEFAULT 0,
    security_alerts_triggered INTEGER DEFAULT 0,
    UNIQUE(guild_id, date)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_guild ON audit_logs(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_incidents_guild ON security_incidents(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_queue_guild ON verification_queue(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_guild_user ON moderation_cases(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_xp_profiles_guild_xp ON xp_profiles(guild_id, xp DESC);
CREATE INDEX IF NOT EXISTS idx_economy_wallets_guild_coins ON economy_wallets(guild_id, coins DESC);
CREATE INDEX IF NOT EXISTS idx_server_analytics_guild_date ON server_analytics(guild_id, date);

-- Alter Table additions for Welcome/Farewell Embed Builder
ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS welcome_embed JSONB DEFAULT NULL;
ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS welcome_dm_embed JSONB DEFAULT NULL;
ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS leave_embed JSONB DEFAULT NULL;

-- ==========================================
-- v2.0 SOC EXPANSION TABLES
-- ==========================================

-- 14. ALT DETECTION
CREATE TABLE IF NOT EXISTS alt_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64),
    username VARCHAR(255),
    risk_level VARCHAR(20) DEFAULT 'SUSPICIOUS',
    detection_factors JSONB DEFAULT '[]'::jsonb,
    action_taken VARCHAR(30) DEFAULT 'FLAGGED',
    resolved BOOLEAN DEFAULT FALSE,
    reviewed_by VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_alt_detections_guild ON alt_detections(guild_id, created_at DESC);

-- 15. SECURITY AUDITS
CREATE TABLE IF NOT EXISTS security_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    total_checks INTEGER DEFAULT 0,
    passed_checks INTEGER DEFAULT 0,
    triggered_by VARCHAR(64),
    status VARCHAR(20) DEFAULT 'COMPLETE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID REFERENCES security_audits(id) ON DELETE CASCADE,
    guild_id VARCHAR(64),
    severity VARCHAR(10) DEFAULT 'MEDIUM',
    category VARCHAR(50),
    title TEXT,
    description TEXT,
    fixable BOOLEAN DEFAULT FALSE,
    fixed BOOLEAN DEFAULT FALSE,
    fix_action VARCHAR(100),
    fixed_at TIMESTAMP WITH TIME ZONE,
    fixed_by VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit ON audit_findings(audit_id);

-- 16. INCIDENT PLAYBOOKS
CREATE TABLE IF NOT EXISTS incident_playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    trigger_type VARCHAR(30) NOT NULL,
    trigger_config JSONB DEFAULT '{}'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,
    enabled BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,
    executions INTEGER DEFAULT 0,
    last_triggered TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. JOIN SCREENINGS
CREATE TABLE IF NOT EXISTS join_screenings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64),
    username VARCHAR(255),
    risk_score INTEGER DEFAULT 0,
    alt_risk_level VARCHAR(20) DEFAULT 'SAFE',
    decision VARCHAR(20) DEFAULT 'PENDING',
    pipeline_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_join_screenings_guild ON join_screenings(guild_id, created_at DESC);

-- 18. EMERGENCY ACTIONS
CREATE TABLE IF NOT EXISTS emergency_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    triggered_by VARCHAR(64),
    reason TEXT,
    outcome VARCHAR(30) DEFAULT 'SUCCESS',
    affected_count INTEGER DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_emergency_actions_guild ON emergency_actions(guild_id, created_at DESC);

-- 19. TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    team_role VARCHAR(30) DEFAULT 'Viewer',
    permissions JSONB DEFAULT '{}'::jsonb,
    added_by VARCHAR(64),
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, user_id)
);

-- 20. INTEGRATION WEBHOOKS
CREATE TABLE IF NOT EXISTS integration_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] DEFAULT '{}',
    enabled BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMP WITH TIME ZONE,
    last_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 21. SECURITY METRICS
CREATE TABLE IF NOT EXISTS security_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(64) REFERENCES guilds(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    alts_detected INTEGER DEFAULT 0,
    incidents_resolved INTEGER DEFAULT 0,
    verifications_processed INTEGER DEFAULT 0,
    emergency_actions INTEGER DEFAULT 0,
    members_quarantined INTEGER DEFAULT 0,
    members_kicked INTEGER DEFAULT 0,
    threat_level VARCHAR(10) DEFAULT 'LOW',
    UNIQUE(guild_id, date)
);
CREATE INDEX IF NOT EXISTS idx_security_metrics_guild ON security_metrics(guild_id, date DESC);

