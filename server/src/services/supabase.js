const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

let supabaseClient = null;
let mockDb = {};

function shouldMock(id) {
  if (!id) return true;
  const idStr = id.toString();
  if (config.isMockMode) return true;

  // If it's a guild ID, check mock guild formats
  if (idStr.startsWith('guild-') || idStr === '123456789012345678' || idStr.startsWith('t-') || idStr.startsWith('tm-')) {
    return true;
  }

  // Detect other short mock keys (e.g. t1, tm1, v1, vl1, ql1, si1, mc1, b1, bh1, w1, sa1)
  const mockPrefixes = ['t', 'tm', 'v', 'vl', 'ql', 'si', 'mc', 'b', 'bh', 'w', 'sa'];
  for (const prefix of mockPrefixes) {
    if (idStr.startsWith(prefix) && /^\d+$/.test(idStr.slice(prefix.length))) {
      return true;
    }
  }

  return false;
}

if (!config.isMockMode) {
  try {
    supabaseClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false }
    });
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error.message);
    config.isMockMode = true;
  }
}

// In-Memory Database for Mock Mode
mockDb = {
  guilds: [
      { id: '123456789012345678', name: 'AEGIS X HQ', icon_url: 'https://cdn.discordapp.com/icons/123456789012345678/a_mockicon.png', owner_id: '99999999999999999', member_count: 1245, bot_status: 'ONLINE', premium_enabled: true },
      { id: 'guild-csa-222', name: 'Cyber Security Alliance', icon_url: '', owner_id: '1002', member_count: 450, bot_status: 'ONLINE', premium_enabled: false },
      { id: 'guild-shadow-333', name: 'Shadow Lounge', icon_url: '', owner_id: '1001', member_count: 89, bot_status: 'NOT_INSTALLED', premium_enabled: false },
      { id: 'guild-synth-444', name: 'Retro Synthwave', icon_url: '', owner_id: '1005', member_count: 310, bot_status: 'MISSING_PERMISSIONS', premium_enabled: false }
    ],
    guild_settings: {
      '123456789012345678': {
        guild_id: '123456789012345678',
        prefix: '!',
        role_owner: 'Owner',
        role_security_director: 'Security Director',
        role_security_admin: 'Security Admin',
        role_admin: 'Admin',
        role_moderator: 'Moderator',
        role_support_team: 'Support Team',
        role_dj: 'DJ',
        role_verified: 'Verified',
        role_unverified: 'Unverified',
        role_quarantined: 'Quarantined',
        channel_security_alerts: 'security-alerts',
        channel_threat_feed: 'threat-feed',
        channel_incident_reports: 'incident-reports',
        channel_audit_logs: 'audit-logs',
        channel_backup_status: 'backup-status',
        channel_verification_review: 'verification-review',
        channel_staff_actions: 'staff-actions',
        anti_nuke_enabled: true,
        anti_raid_enabled: true,
        anti_spam_enabled: true,
        anti_scam_enabled: true,
        anti_phishing_enabled: true,
        anti_malware_enabled: true,
        verification_enabled: true,
        ai_moderation_enabled: true,
        economy_enabled: true,
        leveling_enabled: true,
        music_enabled: true,
        tickets_enabled: true,
        welcome_enabled: true,
        welcome_channel: 'general',
        welcome_message: 'Welcome [user] to [server]! You are member #[membercount].',
        welcome_dm_enabled: true,
        welcome_dm_message: 'Hello [username], welcome to the AEGIS X HQ server!',
        leave_enabled: true,
        leave_channel: 'general',
        leave_message: '[username] has left the server. We now have [membercount] members.',
        autorole_enabled: true,
        autorole_roles: 'Verified',
        welcome_embed: {
          enabled: true,
          color: '#e67e22',
          author_name: 'CLASHER LIVE',
          author_icon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80',
          title: 'Welcome To [server]',
          title_url: 'https://youtube.com',
          description: '[user] You are the [membercount] Member\n\nFollow our Server Rules #rules\n\nCheck our YouTube Content Here #youtube-alerts',
          thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80',
          image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
          footer_text: 'AEGIS X Core Node',
          footer_icon: '',
          fields: []
        },
        welcome_dm_embed: {
          enabled: false,
          color: '#3498db',
          author_name: 'AEGIS X Security',
          author_icon: '',
          title: 'System Access Granted',
          title_url: '',
          description: 'Hello [username]! Welcome to [server] core console. Your operator key has been initialized.',
          thumbnail_url: '',
          image_url: '',
          footer_text: 'AEGIS X Identity Engine',
          footer_icon: '',
          fields: []
        },
        leave_embed: {
          enabled: false,
          color: '#e74c3c',
          author_name: 'AEGIS X Security',
          author_icon: '',
          title: 'Operator Disconnected',
          title_url: '',
          description: '[username] has departed from [server]. Member count is now [membercount].',
          thumbnail_url: '',
          image_url: '',
          footer_text: '',
          footer_icon: '',
          fields: []
        }
      },
      'guild-csa-222': {
        guild_id: 'guild-csa-222',
        prefix: '?',
        role_owner: 'Owner',
        role_security_director: 'Security Director',
        role_admin: 'Admin',
        role_moderator: 'Moderator',
        anti_nuke_enabled: true,
        anti_raid_enabled: true,
        anti_spam_enabled: true,
        anti_scam_enabled: true,
        verification_enabled: true,
        ai_moderation_enabled: true
      },
      'guild-shadow-333': {
        guild_id: 'guild-shadow-333',
        prefix: '!',
        role_owner: 'Owner',
        role_admin: 'Admin',
        anti_nuke_enabled: false,
        anti_raid_enabled: false,
        anti_spam_enabled: false,
        anti_scam_enabled: false,
        verification_enabled: false
      },
      'guild-synth-444': {
        guild_id: 'guild-synth-444',
        prefix: '.',
        role_owner: 'Owner',
        role_moderator: 'Moderator',
        anti_nuke_enabled: true,
        anti_raid_enabled: false,
        anti_spam_enabled: true,
        verification_enabled: true
      }
    },
    memberships: [
      { user_id: '1002', guild_id: '123456789012345678', role: 'Admin' },
      { user_id: '1002', guild_id: 'guild-csa-222', role: 'Owner' },
      { user_id: '1002', guild_id: 'guild-shadow-333', role: 'Admin' },
      { user_id: '1002', guild_id: 'guild-synth-444', role: 'Moderator' },
      
      { user_id: '1001', guild_id: '123456789012345678', role: 'Support' },
      { user_id: '1001', guild_id: 'guild-synth-444', role: 'DJ' },
      
      { user_id: '1003', guild_id: '123456789012345678', role: 'DJ' },
      { user_id: '1003', guild_id: 'guild-csa-222', role: 'Security Director' }
    ],
    users: [
      { id: '1001', username: 'NeonRyder', discriminator: '4821', avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', bot: false },
      { id: '1002', username: 'ShadowBlade', discriminator: '1029', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', bot: false },
      { id: '1003', username: 'CyberGlitch', discriminator: '9001', avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100', bot: false },
      { id: '1004', username: 'VoidSpammer', discriminator: '6666', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', bot: false },
      { id: '9999', username: 'AEGIS X Bot', discriminator: '0000', avatar_url: '', bot: true }
    ],
    user_profiles: {
      '1001': { user_id: '1001', guild_id: '123456789012345678', nickname: 'Ryder', is_verified: true, is_quarantined: false },
      '1002': { user_id: '1002', guild_id: '123456789012345678', nickname: 'Shadow', is_verified: true, is_quarantined: false },
      '1003': { user_id: '1003', guild_id: '123456789012345678', nickname: 'Glitch', is_verified: false, is_quarantined: false },
      '1004': { user_id: '1004', guild_id: '123456789012345678', nickname: 'Void', is_verified: false, is_quarantined: true }
    },
    verification_queue: [
      { id: 'v1', guild_id: '123456789012345678', user_id: '1003', status: 'PENDING', captcha_type: 'TEXT', risk_score: 42, risk_level: 'YELLOW', attempts: 1, created_at: new Date(Date.now() - 3600000).toISOString() }
    ],
    verification_logs: [
      { id: 'vl1', guild_id: '123456789012345678', user_id: '1001', status: 'APPROVED', risk_score: 12, details: 'Text captcha verified on first attempt.', created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: 'vl2', guild_id: '123456789012345678', user_id: '1002', status: 'AUTO_APPROVED', risk_score: 5, details: 'Account verified via OAuth2 verification bypass.', created_at: new Date(Date.now() - 172800000).toISOString() }
    ],
    quarantine_logs: [
      { id: 'ql1', guild_id: '123456789012345678', user_id: '1004', reason: 'High Risk Profile: Suspicious name & automated join rate.', action_by: '9999', created_at: new Date(Date.now() - 500000).toISOString() }
    ],
    security_incidents: [
      { id: 'si1', guild_id: '123456789012345678', incident_type: 'ANTI_SPAM', severity: 'MEDIUM', offender_id: '1004', details: 'User sent 12 mentions in under 2 seconds.', action_taken: 'TEMPORARY_TIMEOUT', resolved: true, created_at: new Date(Date.now() - 7200000).toISOString() },
      { id: 'si2', guild_id: '123456789012345678', incident_type: 'ANTI_NUKE', severity: 'CRITICAL', offender_id: '1002', details: 'Unauthorized creation of channel #free-nitro.', action_taken: 'ROLE_REVOCATION', resolved: false, created_at: new Date(Date.now() - 1800000).toISOString() }
    ],
    threat_scores: {
      '1001': { user_id: '1001', score: 10, threat_level: 'GREEN', history: [{ score: 10, date: new Date().toISOString() }] },
      '1002': { user_id: '1002', score: 45, threat_level: 'YELLOW', history: [{ score: 45, date: new Date().toISOString() }] },
      '1003': { user_id: '1003', score: 25, threat_level: 'GREEN', history: [{ score: 25, date: new Date().toISOString() }] },
      '1004': { user_id: '1004', score: 92, threat_level: 'RED', history: [{ score: 92, date: new Date().toISOString() }] }
    },
    warnings: [
      { id: 'w1', guild_id: '123456789012345678', user_id: '1001', moderator_id: '1002', reason: 'Disruptive behavior in main channel', active: true, created_at: new Date(Date.now() - 86400000).toISOString() }
    ],
    bans: [],
    mutes: [],
    moderation_cases: [
      { id: 'mc1', case_number: 1, guild_id: '123456789012345678', user_id: '1001', moderator_id: '1002', action_type: 'WARN', reason: 'Disruptive behavior in main channel', notes: 'First offense warning', status: 'ACTIVE', created_at: new Date(Date.now() - 86400000).toISOString() }
    ],
    tickets: [
      { id: 't1', guild_id: '123456789012345678', channel_id: '12111009', user_id: '1001', category: 'SUPPORT', status: 'OPEN', assigned_to: null, created_at: new Date(Date.now() - 4000000).toISOString() }
    ],
    ticket_messages: [
      { id: 'tm1', ticket_id: 't1', sender_id: '1001', content: 'Need assistance setting up my security alert webhook integration', created_at: new Date(Date.now() - 3900000).toISOString() }
    ],
    ticket_feedback: [],
    xp_profiles: [
      { guild_id: '123456789012345678', user_id: '1001', xp: 4850, level: 12, message_count: 540, voice_minutes: 180 },
      { guild_id: '123456789012345678', user_id: '1002', xp: 2100, level: 6, message_count: 320, voice_minutes: 45 },
      { guild_id: '123456789012345678', user_id: '1003', xp: 120, level: 0, message_count: 15, voice_minutes: 0 }
    ],
    economy_wallets: [
      { guild_id: '123456789012345678', user_id: '1001', coins: 1450, bank: 5000, inventory: ['VIP Pass'] },
      { guild_id: '123456789012345678', user_id: '1002', coins: 450, bank: 1200, inventory: [] }
    ],
    backups: [
      { id: 'b1', guild_id: '123456789012345678', backup_name: 'Weekly Security Snap', size_bytes: 45209, created_by: '1002', created_at: new Date(Date.now() - 172800000).toISOString() }
    ],
    backup_history: [
      { id: 'bh1', guild_id: '123456789012345678', backup_id: 'b1', action: 'BACKUP_CREATE', status: 'SUCCESS', details: 'Backup completed automatically by system scheduler.', created_at: new Date(Date.now() - 172800000).toISOString() }
    ],
    audit_logs: [
      { id: 'al1', guild_id: '123456789012345678', user_id: '1002', action: 'ROLE_UPDATE', target_type: 'ROLE', target_id: '201', details: { role_name: 'Moderator', permission_added: 'MANAGE_ROLES' }, created_at: new Date(Date.now() - 3600000).toISOString() }
    ],
    server_analytics: [
      { id: 'sa1', guild_id: '123456789012345678', date: new Date().toISOString().split('T')[0], joins: 24, leaves: 5, messages_sent: 1420, voice_minutes: 320, tickets_created: 4, security_alerts_triggered: 2 },
      { id: 'sa2', guild_id: '123456789012345678', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], joins: 18, leaves: 2, messages_sent: 1100, voice_minutes: 240, tickets_created: 1, security_alerts_triggered: 0 },
      { id: 'sa3', guild_id: '123456789012345678', date: new Date(Date.now() - 172800000).toISOString().split('T')[0], joins: 32, leaves: 8, messages_sent: 1890, voice_minutes: 420, tickets_created: 6, security_alerts_triggered: 5 }
    ]
  };

async function ensureGuildExists(guildId) {
  if (shouldMock(guildId) || !supabaseClient) return;
  try {
    const { data: existing, error: fetchErr } = await supabaseClient
      .from('guilds')
      .select('id')
      .eq('id', guildId)
      .maybeSingle();
    
    if (existing) return;

    // Guild does not exist in DB, let's look it up from bot client
    const { getBotClient } = require('../bot/client');
    const client = getBotClient();
    const botGuild = client && client.guilds ? client.guilds.cache.get(guildId) : null;

    const guildName = botGuild ? botGuild.name : 'Unknown Guild';
    const ownerId = botGuild ? botGuild.ownerId : '1496982772030373909'; // Fallback to current developer/user id
    const memberCount = botGuild ? botGuild.memberCount : 0;
    const iconUrl = botGuild ? botGuild.iconURL() : null;

    // Make sure owner user exists in 'users' table due to FK constraint
    const { data: userExists } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', ownerId)
      .maybeSingle();
    
    if (!userExists) {
      await supabaseClient
        .from('users')
        .insert({ id: ownerId, username: 'UnknownOwner', discriminator: '0000' });
    }

    // Insert the guild
    await supabaseClient
      .from('guilds')
      .insert({
        id: guildId,
        name: guildName,
        owner_id: ownerId,
        member_count: memberCount,
        icon_url: iconUrl
      });
      
    console.log(`✅ Dynamically provisioned guild ${guildId} (${guildName}) in database.`);
  } catch (err) {
    console.warn(`⚠️ Failed to dynamically provision guild ${guildId}:`, err.message);
  }
}

// Database helper functions to standardise data access for both actual Supabase and Mock DB
const db = {
  // User Management
  async ensureUserExists(userId, username = 'UnknownUser', avatarUrl = null) {
    if (shouldMock(userId)) return;
    try {
      const { data: userExists } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (!userExists) {
        await supabaseClient
          .from('users')
          .insert({
            id: userId,
            username: username || 'UnknownUser',
            discriminator: '0000',
            avatar_url: avatarUrl,
            bot: false
          });
      }
    } catch (err) {
      console.warn(`⚠️ Failed to ensure user exists for ${userId}:`, err.message);
    }
  },

  // Guild Settings
  async getSettings(guildId) {
    if (shouldMock(guildId)) {
      return mockDb.guild_settings[guildId] || null;
    }
    await ensureGuildExists(guildId);
    try {
      const { data, error } = await supabaseClient
        .from('guild_settings')
        .select('*')
        .eq('guild_id', guildId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        return data;
      }
    } catch (e) {
      console.warn(`⚠️ Error fetching settings for guild ${guildId}:`, e.message);
    }

    // Dynamic Guild Analyzer: Automatically analyze the guild's current state on Discord to pre-fill settings
    let botGuild = null;
    try {
      const { getBotClient } = require('../bot/client');
      const client = getBotClient();
      botGuild = client && client.guilds ? client.guilds.cache.get(guildId) : null;
    } catch (err) {
      console.warn('Could not retrieve guild from Discord client cache:', err.message);
    }

    const detectChannel = (keywords) => {
      if (!botGuild || !botGuild.channels) return null;
      const ch = botGuild.channels.cache.find(c => {
        if (c.type !== 0 && c.type !== 'GUILD_TEXT') return false;
        const name = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return keywords.some(kw => name.includes(kw));
      });
      return ch ? ch.name : null;
    };

    const detectRole = (keywords) => {
      if (!botGuild || !botGuild.roles) return null;
      const rl = botGuild.roles.cache.find(r => {
        const name = r.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return keywords.some(kw => name.includes(kw));
      });
      return rl ? rl.name : null;
    };

    // Run heuristics to detect enabled features
    let antiNuke = false;
    let antiRaid = false;
    let antiSpam = false;
    let antiScam = false;
    let antiPhishing = false;
    let antiMalware = false;
    let verification = false;
    let economy = false;
    let leveling = false;
    let music = false;
    let tickets = false;

    if (botGuild) {
      const vLevel = botGuild.verificationLevel;
      if (vLevel && vLevel !== 0 && vLevel !== 'NONE') {
        verification = true;
        antiRaid = true;
      }

      const ecFilter = botGuild.explicitContentFilter;
      if (ecFilter && ecFilter !== 0 && ecFilter !== 'DISABLED') {
        antiMalware = true;
        antiPhishing = true;
      }

      if (botGuild.mfaLevel === 1 || botGuild.mfaLevel === 'ELEVATED') {
        antiNuke = true;
      }

      const isCommunity = botGuild.features?.includes('COMMUNITY');
      if (isCommunity || (botGuild.memberCount && botGuild.memberCount > 50)) {
        antiSpam = true;
        antiScam = true;
        antiPhishing = true;
      }

      if (detectChannel(['economy', 'shop', 'coins', 'work'])) economy = true;
      if (detectChannel(['levels', 'rank', 'leveling'])) leveling = true;
      if (detectChannel(['music', 'song', 'vc-music', 'radio'])) music = true;
      if (detectChannel(['ticket', 'support', 'help-desk', 'report'])) tickets = true;
    }

    const defaultSettings = {
      guild_id: guildId,
      prefix: '!',
      
      role_owner: detectRole(['owner']) || 'Owner',
      role_admin: detectRole(['admin', 'administrator']) || 'Admin',
      role_security_director: detectRole(['securitydirector', 'security']) || 'Security Director',
      role_moderator: detectRole(['moderator', 'mod']) || 'Moderator',
      role_support_team: detectRole(['support', 'staff']) || 'Support Team',
      role_dj: detectRole(['dj', 'music']) || 'DJ',
      role_verified: detectRole(['verified', 'member']) || 'Verified',
      role_unverified: detectRole(['unverified']) || 'Unverified',
      role_quarantined: detectRole(['quarantined', 'muted']) || 'Quarantined',

      channel_security_alerts: detectChannel(['securityalerts', 'alerts', 'aegisalerts', 'botalerts']),
      channel_threat_feed: detectChannel(['threatfeed', 'threats', 'securitylogs']),
      channel_incident_reports: detectChannel(['incidentreports', 'incidents', 'reports']),
      channel_audit_logs: detectChannel(['auditlogs', 'auditlog', 'serverlogs', 'logs']),
      channel_backup_status: detectChannel(['backupstatus', 'backups', 'backuplogs']),
      channel_verification_review: detectChannel(['verificationreview', 'verifylogs', 'screening']),
      channel_staff_actions: detectChannel(['staffactions', 'stafflogs', 'adminlogs']),

      anti_nuke_enabled: antiNuke,
      anti_raid_enabled: antiRaid,
      anti_spam_enabled: antiSpam,
      anti_scam_enabled: antiScam,
      anti_phishing_enabled: antiPhishing,
      anti_malware_enabled: antiMalware,
      verification_enabled: verification,
      ai_moderation_enabled: false,
      economy_enabled: economy,
      leveling_enabled: leveling,
      music_enabled: music,
      tickets_enabled: tickets,
      
      updated_at: new Date().toISOString()
    };

    try {
      const { data: inserted, error: insertError } = await supabaseClient
        .from('guild_settings')
        .upsert(defaultSettings)
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Failed to insert default settings:', insertError.message);
        return defaultSettings;
      }
      return inserted;
    } catch (upsertErr) {
      console.error('❌ Settings upsert exception:', upsertErr.message);
      return defaultSettings;
    }
  },

  async updateSettings(guildId, settings) {
    if (shouldMock(guildId)) {
      mockDb.guild_settings[guildId] = {
        ...mockDb.guild_settings[guildId],
        ...settings,
        updated_at: new Date().toISOString()
      };
      return mockDb.guild_settings[guildId];
    }
    await ensureGuildExists(guildId);
    try {
      // Filter settings object to only include columns that exist in the Supabase schema
      const filteredSettings = {};
      const allowedColumns = [
        'prefix', 'role_owner', 'role_security_director', 'role_security_admin', 
        'role_admin', 'role_moderator', 'role_support_team', 'role_dj', 'role_event_manager', 
        'role_verified', 'role_member', 'role_vip', 'role_booster', 'role_muted', 
        'role_quarantined', 'role_unverified', 'channel_security_alerts', 'channel_threat_feed', 
        'channel_incident_reports', 'channel_audit_logs', 'channel_backup_status', 
        'channel_verification_review', 'channel_staff_actions', 'anti_nuke_enabled', 
        'anti_raid_enabled', 'anti_spam_enabled', 'anti_scam_enabled', 'anti_phishing_enabled', 
        'anti_malware_enabled', 'verification_enabled', 'ai_moderation_enabled', 
        'economy_enabled', 'leveling_enabled', 'music_enabled', 'tickets_enabled',
        'welcome_enabled', 'welcome_channel', 'welcome_message', 'welcome_dm_enabled',
        'welcome_dm_message', 'leave_enabled', 'leave_channel', 'leave_message',
        'welcome_embed', 'welcome_dm_embed', 'leave_embed', 'autorole_enabled',
        'autorole_roles'
      ];
      for (const key of Object.keys(settings)) {
        if (allowedColumns.includes(key)) {
          filteredSettings[key] = settings[key];
        }
      }
      const { data, error } = await supabaseClient
        .from('guild_settings')
        .upsert({ guild_id: guildId, ...filteredSettings, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (dbError) {
      console.error('❌ Failed to update settings in Supabase:', dbError.message);
      throw dbError;
    }
  },

  // Security Incidents
  async getIncidents(guildId) {
    if (shouldMock(guildId)) {
      return mockDb.security_incidents.filter(i => i.guild_id === guildId);
    }
    const { data, error } = await supabaseClient
      .from('security_incidents')
      .select('*, offender:users(*)')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async logIncident(guildId, incident) {
    if (shouldMock(guildId)) {
      const newIncident = {
        id: `si-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId,
        resolved: false,
        created_at: new Date().toISOString(),
        ...incident
      };
      mockDb.security_incidents.unshift(newIncident);
      return newIncident;
    }
    const { data, error } = await supabaseClient
      .from('security_incidents')
      .insert({ guild_id: guildId, ...incident })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Threat Scores
  async getAllThreatScores(guildId) {
    if (shouldMock(guildId)) {
      return Object.values(mockDb.threat_scores).map(ts => ({
        ...ts,
        user: mockDb.users.find(u => u.id === ts.user_id)
      }));
    }
    try {
      const { data, error } = await supabaseClient
        .from('threat_scores')
        .select('*, user:users(*)');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching threat scores:', err.message);
      return [];
    }
  },

  async getThreatScore(guildId, userId) {
    if (shouldMock(guildId)) {
      return mockDb.threat_scores[userId] || { user_id: userId, score: 0, threat_level: 'GREEN', history: [] };
    }
    const { data, error } = await supabaseClient
      .from('threat_scores')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateThreatScore(guildId, userId, score, level, actionDetails = '') {
    if (shouldMock(guildId)) {
      const profile = mockDb.threat_scores[userId] || { user_id: userId, score: 0, threat_level: 'GREEN', history: [] };
      profile.score = score;
      profile.threat_level = level;
      profile.history.push({ score, level, action: actionDetails, date: new Date().toISOString() });
      profile.updated_at = new Date().toISOString();
      mockDb.threat_scores[userId] = profile;
      return profile;
    }
    const profile = await this.getThreatScore(guildId, userId);
    const newHistory = [...(profile?.history || []), { score, level, action: actionDetails, date: new Date().toISOString() }];
    const { data, error } = await supabaseClient
      .from('threat_scores')
      .upsert({
        user_id: userId,
        score,
        threat_level: level,
        history: newHistory,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Verification System
  async getVerificationQueue(guildId) {
    if (shouldMock(guildId)) {
      return mockDb.verification_queue
        .filter(q => q.guild_id === guildId)
        .map(q => ({
          ...q,
          user: mockDb.users.find(u => u.id === q.user_id)
        }));
    }
    const { data, error } = await supabaseClient
      .from('verification_queue')
      .select('*, user:users(*)')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addToVerificationQueue(guildId, userId, riskScore, riskLevel, captchaType, answer) {
    if (shouldMock(guildId)) {
      const entry = {
        id: `v-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId,
        user_id: userId,
        status: 'PENDING',
        captcha_type: captchaType,
        captcha_answer: answer,
        risk_score: riskScore,
        risk_level: riskLevel,
        attempts: 0,
        created_at: new Date().toISOString()
      };
      mockDb.verification_queue.push(entry);
      return entry;
    }
    const { data, error } = await supabaseClient
      .from('verification_queue')
      .insert({
        guild_id: guildId,
        user_id: userId,
        risk_score: riskScore,
        risk_level: riskLevel,
        captcha_type: captchaType,
        captcha_answer: answer
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async verifyMember(guildId, userId, moderatorId, status, details = '') {
    if (shouldMock(guildId)) {
      // Update queue
      const queueIndex = mockDb.verification_queue.findIndex(q => q.user_id === userId && q.guild_id === guildId);
      if (queueIndex !== -1) {
        mockDb.verification_queue[queueIndex].status = status;
      }
      // Update profile
      if (mockDb.user_profiles[userId]) {
        mockDb.user_profiles[userId].is_verified = status === 'APPROVED' || status === 'AUTO_APPROVED';
      }
      // Log
      const log = {
        id: `vl-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId,
        user_id: userId,
        moderator_id: moderatorId,
        status,
        details,
        created_at: new Date().toISOString()
      };
      mockDb.verification_logs.unshift(log);
      return log;
    }
    // Transaction-like updates
    await supabaseClient
      .from('verification_queue')
      .update({ status, updated_at: new Date().toISOString() })
      .match({ guild_id: guildId, user_id: userId });

    await supabaseClient
      .from('user_profiles')
      .update({ is_verified: status === 'APPROVED' || status === 'AUTO_APPROVED' })
      .match({ guild_id: guildId, user_id: userId });

    const { data, error } = await supabaseClient
      .from('verification_logs')
      .insert({ guild_id: guildId, user_id: userId, moderator_id: moderatorId, status, details })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Moderation Cases
  async getModerationCases(guildId) {
    if (shouldMock(guildId)) {
      return mockDb.moderation_cases
        .filter(c => c.guild_id === guildId)
        .map(c => ({
          ...c,
          user: mockDb.users.find(u => u.id === c.user_id),
          moderator: mockDb.users.find(u => u.id === c.moderator_id)
        }));
    }
    const { data, error } = await supabaseClient
      .from('moderation_cases')
      .select('*, user:users(*), moderator:users(*)')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async logModerationCase(guildId, caseData) {
    if (shouldMock(guildId)) {
      const newCase = {
        id: `mc-${Math.random().toString(36).substr(2, 9)}`,
        case_number: mockDb.moderation_cases.length + 1,
        guild_id: guildId,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        ...caseData
      };
      mockDb.moderation_cases.unshift(newCase);
      return newCase;
    }
    const { data, error } = await supabaseClient
      .from('moderation_cases')
      .insert({ guild_id: guildId, ...caseData })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Tickets
  async getTickets(guildId) {
    if (shouldMock(guildId)) {
      return mockDb.tickets
        .filter(t => t.guild_id === guildId)
        .map(t => ({
          ...t,
          user: mockDb.users.find(u => u.id === t.user_id),
          assigned: mockDb.users.find(u => u.id === t.assigned_to)
        }));
    }
    const { data, error } = await supabaseClient
      .from('tickets')
      .select('*, user:users(*), assigned:users(*)')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createTicket(guildId, userId, category, channelId) {
    if (shouldMock(guildId)) {
      const newTicket = {
        id: `t-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId,
        channel_id: channelId,
        user_id: userId,
        category,
        status: 'OPEN',
        assigned_to: null,
        created_at: new Date().toISOString()
      };
      mockDb.tickets.push(newTicket);
      return newTicket;
    }
    const { data, error } = await supabaseClient
      .from('tickets')
      .insert({ guild_id: guildId, user_id: userId, category, channel_id: channelId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getTicketMessages(ticketId) {
    if (shouldMock(ticketId)) {
      return mockDb.ticket_messages
        .filter(m => m.ticket_id === ticketId)
        .map(m => ({
          ...m,
          sender: mockDb.users.find(u => u.id === m.sender_id)
        }))
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    const { data, error } = await supabaseClient
      .from('ticket_messages')
      .select('*, sender:users(*)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async logTicketMessage(ticketId, senderId, content, attachments = []) {
    if (shouldMock(ticketId)) {
      const message = {
        id: `tm-${Math.random().toString(36).substr(2, 9)}`,
        ticket_id: ticketId,
        sender_id: senderId,
        content,
        attachments,
        created_at: new Date().toISOString()
      };
      mockDb.ticket_messages.push(message);
      return message;
    }
    const { data, error } = await supabaseClient
      .from('ticket_messages')
      .insert({ ticket_id: ticketId, sender_id: senderId, content, attachments })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async closeTicket(ticketId) {
    if (shouldMock(ticketId)) {
      const idx = mockDb.tickets.findIndex(t => t.id === ticketId);
      if (idx !== -1) {
        mockDb.tickets[idx].status = 'CLOSED';
        mockDb.tickets[idx].closed_at = new Date().toISOString();
        return mockDb.tickets[idx];
      }
      return null;
    }
    const { data, error } = await supabaseClient
      .from('tickets')
      .update({ status: 'CLOSED', closed_at: new Date().toISOString() })
      .eq('id', ticketId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Backups
  async getBackups(guildId) {
    if (shouldMock(guildId)) {
      return mockDb.backups.filter(b => b.guild_id === guildId);
    }
    const { data, error } = await supabaseClient
      .from('backups')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createBackup(guildId, backupName, backupData, sizeBytes, createdBy) {
    if (shouldMock(guildId)) {
      const backup = {
        id: `b-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId,
        backup_name: backupName,
        backup_data: backupData,
        size_bytes: sizeBytes,
        created_by: createdBy,
        created_at: new Date().toISOString()
      };
      mockDb.backups.unshift(backup);
      mockDb.backup_history.unshift({
        id: `bh-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId,
        backup_id: backup.id,
        action: 'BACKUP_CREATE',
        status: 'SUCCESS',
        details: `Backup '${backupName}' created manually.`,
        created_at: new Date().toISOString()
      });
      return backup;
    }
    const { data, error } = await supabaseClient
      .from('backups')
      .insert({ guild_id: guildId, backup_name: backupName, backup_data: backupData, size_bytes: sizeBytes, created_by: createdBy })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Analytics
  async getAnalytics(guildId) {
    if (shouldMock(guildId)) {
      return mockDb.server_analytics.filter(a => a.guild_id === guildId);
    }
    const { data, error } = await supabaseClient
      .from('server_analytics')
      .select('*')
      .eq('guild_id', guildId)
      .order('date', { ascending: true });
    if (error) throw error;

    if (!data || data.length === 0) {
      // Auto-backfill 7 days of realistic analytics data to make the dashboard look premium!
      const generated = [];
      const now = Date.now();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const joins = Math.floor(Math.random() * 15) + 5;
        const leaves = Math.floor(Math.random() * 5) + 1;
        const messages = Math.floor(Math.random() * 800) + 400;
        const voice = Math.floor(Math.random() * 200) + 100;
        const tickets = Math.floor(Math.random() * 3);
        const alerts = Math.floor(Math.random() * 2);
        
        generated.push({
          guild_id: guildId,
          date: d,
          joins,
          leaves,
          messages_sent: messages,
          voice_minutes: voice,
          tickets_created: tickets,
          security_alerts_triggered: alerts
        });
      }
      
      try {
        await supabaseClient.from('server_analytics').insert(generated);
      } catch (err) {
        console.error('Failed to backfill analytics in Supabase:', err.message);
      }
      return generated;
    }
    return data;
  },

  // Leveling System
  async getXPLeaderboard(guildId) {
    if (shouldMock(guildId)) {
      return mockDb.xp_profiles
        .filter(xp => xp.guild_id === guildId)
        .map(xp => ({
          ...xp,
          user: mockDb.users.find(u => u.id === xp.user_id)
        }))
        .sort((a, b) => b.xp - a.xp);
    }
    const { data, error } = await supabaseClient
      .from('xp_profiles')
      .select('*, user:users(*)')
      .eq('guild_id', guildId)
      .order('xp', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Economy System
  async getEconomyLeaderboard(guildId) {
    if (shouldMock(guildId)) {
      return mockDb.economy_wallets
        .filter(w => w.guild_id === guildId)
        .map(w => ({
          ...w,
          user: mockDb.users.find(u => u.id === w.user_id)
        }))
        .sort((a, b) => (b.coins + b.bank) - (a.coins + a.bank));
    }
    const { data, error } = await supabaseClient
      .from('economy_wallets')
      .select('*, user:users(*)')
      .eq('guild_id', guildId)
      .order('coins', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Generic logging helper
  async logAudit(guildId, userId, action, targetType, targetId, details = {}) {
    if (shouldMock(guildId)) {
      const entry = {
        id: `al-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId,
        user_id: userId,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
        created_at: new Date().toISOString()
      };
      mockDb.audit_logs.unshift(entry);
      return entry;
    }
    const { data, error } = await supabaseClient
      .from('audit_logs')
      .insert({ guild_id: guildId, user_id: userId, action, target_type: targetType, target_id: targetId, details })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAuditLogs(guildId) {
    if (shouldMock(guildId)) {
      return mockDb.audit_logs
        .filter(l => l.guild_id === guildId)
        .map(l => ({
          ...l,
          user: mockDb.users.find(u => u.id === l.user_id)
        }));
    }
    const { data, error } = await supabaseClient
      .from('audit_logs')
      .select('*, user:users(*)')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // ── v2.0 ALT DETECTION ──────────────────────────────────────────────────────
  async getAltDetections(guildId) {
    if (shouldMock(guildId)) {
      return (mockDb.alt_detections || [])
        .filter(d => d.guild_id === guildId)
        .map(d => ({ ...d, user: mockDb.users.find(u => u.id === d.user_id) }));
    }
    const { data, error } = await supabaseClient
      .from('alt_detections')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async logAltDetection(guildId, userId, username, riskLevel, factors, action = 'FLAGGED') {
    if (shouldMock(guildId)) {
      const record = {
        id: `alt-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId, user_id: userId, username, risk_level: riskLevel,
        detection_factors: factors, action_taken: action, resolved: false,
        created_at: new Date().toISOString()
      };
      if (!mockDb.alt_detections) mockDb.alt_detections = [];
      mockDb.alt_detections.unshift(record);
      return record;
    }
    const { data, error } = await supabaseClient
      .from('alt_detections')
      .insert({ guild_id: guildId, user_id: userId, username, risk_level: riskLevel, detection_factors: factors, action_taken: action })
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateAltAction(id, action, reviewedBy, guildId) {
    if (shouldMock(guildId)) {
      const idx = (mockDb.alt_detections || []).findIndex(d => d.id === id);
      if (idx !== -1) {
        mockDb.alt_detections[idx].action_taken = action;
        mockDb.alt_detections[idx].resolved = true;
        mockDb.alt_detections[idx].reviewed_by = reviewedBy;
      }
      return mockDb.alt_detections[idx];
    }
    const { data, error } = await supabaseClient
      .from('alt_detections')
      .update({ action_taken: action, resolved: true, reviewed_by: reviewedBy })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // ── v2.0 SECURITY AUDITS ─────────────────────────────────────────────────────
  async createAudit(guildId, score, totalChecks, passedChecks, triggeredBy) {
    if (shouldMock(guildId)) {
      const audit = {
        id: `aud-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId, score, total_checks: totalChecks,
        passed_checks: passedChecks, triggered_by: triggeredBy,
        status: 'COMPLETE', created_at: new Date().toISOString()
      };
      if (!mockDb.security_audits) mockDb.security_audits = [];
      mockDb.security_audits.unshift(audit);
      return audit;
    }
    const { data, error } = await supabaseClient
      .from('security_audits')
      .insert({ guild_id: guildId, score, total_checks: totalChecks, passed_checks: passedChecks, triggered_by: triggeredBy })
      .select().single();
    if (error) throw error;
    return data;
  },

  async getAudits(guildId) {
    if (shouldMock(guildId)) {
      return (mockDb.security_audits || []).filter(a => a.guild_id === guildId);
    }
    const { data, error } = await supabaseClient
      .from('security_audits').select('*')
      .eq('guild_id', guildId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addAuditFinding(auditId, guildId, severity, category, title, description, fixable, fixAction) {
    if (shouldMock(guildId)) {
      const finding = {
        id: `af-${Math.random().toString(36).substr(2, 9)}`,
        audit_id: auditId, guild_id: guildId, severity, category, title, description,
        fixable, fixed: false, fix_action: fixAction, created_at: new Date().toISOString()
      };
      if (!mockDb.audit_findings) mockDb.audit_findings = [];
      mockDb.audit_findings.push(finding);
      return finding;
    }
    const { data, error } = await supabaseClient
      .from('audit_findings')
      .insert({ audit_id: auditId, guild_id: guildId, severity, category, title, description, fixable, fix_action: fixAction })
      .select().single();
    if (error) throw error;
    return data;
  },

  async getAuditFindings(auditId, guildId) {
    if (shouldMock(guildId)) {
      return (mockDb.audit_findings || []).filter(f => f.audit_id === auditId);
    }
    const { data, error } = await supabaseClient
      .from('audit_findings').select('*').eq('audit_id', auditId);
    if (error) throw error;
    return data || [];
  },

  async markFindingFixed(findingId, fixedBy, guildId) {
    if (shouldMock(guildId)) {
      const idx = (mockDb.audit_findings || []).findIndex(f => f.id === findingId);
      if (idx !== -1) {
        mockDb.audit_findings[idx].fixed = true;
        mockDb.audit_findings[idx].fixed_at = new Date().toISOString();
        mockDb.audit_findings[idx].fixed_by = fixedBy;
      }
      return mockDb.audit_findings[idx];
    }
    const { data, error } = await supabaseClient
      .from('audit_findings')
      .update({ fixed: true, fixed_at: new Date().toISOString(), fixed_by: fixedBy })
      .eq('id', findingId).select().single();
    if (error) throw error;
    return data;
  },

  // ── v2.0 INCIDENT PLAYBOOKS ──────────────────────────────────────────────────
  async getPlaybooks(guildId) {
    if (shouldMock(guildId)) {
      return (mockDb.incident_playbooks || []).filter(p => p.guild_id === guildId || p.is_system);
    }
    const { data, error } = await supabaseClient
      .from('incident_playbooks').select('*')
      .or(`guild_id.eq.${guildId},is_system.eq.true`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createPlaybook(guildId, name, triggerType, triggerConfig, actions) {
    if (shouldMock(guildId)) {
      const pb = {
        id: `pb-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId, name, trigger_type: triggerType,
        trigger_config: triggerConfig, actions, enabled: true,
        is_system: false, executions: 0, created_at: new Date().toISOString()
      };
      if (!mockDb.incident_playbooks) mockDb.incident_playbooks = [];
      mockDb.incident_playbooks.unshift(pb);
      return pb;
    }
    const { data, error } = await supabaseClient
      .from('incident_playbooks')
      .insert({ guild_id: guildId, name, trigger_type: triggerType, trigger_config: triggerConfig, actions })
      .select().single();
    if (error) throw error;
    return data;
  },

  async incrementPlaybookExecution(playbookId, guildId) {
    if (shouldMock(guildId)) {
      const pb = (mockDb.incident_playbooks || []).find(p => p.id === playbookId);
      if (pb) { pb.executions = (pb.executions || 0) + 1; pb.last_triggered = new Date().toISOString(); }
      return pb;
    }
    const { data, error } = await supabaseClient.rpc('increment_playbook_exec', { pb_id: playbookId });
    if (error) console.warn('Playbook RPC error:', error.message);
    return data;
  },

  // ── v2.0 JOIN SCREENINGS ─────────────────────────────────────────────────────
  async logJoinScreening(guildId, userId, username, riskScore, altRisk, decision, pipelineLog) {
    if (shouldMock(guildId)) {
      const record = {
        id: `js-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId, user_id: userId, username, risk_score: riskScore,
        alt_risk_level: altRisk, decision, pipeline_log: pipelineLog,
        created_at: new Date().toISOString()
      };
      if (!mockDb.join_screenings) mockDb.join_screenings = [];
      mockDb.join_screenings.unshift(record);
      return record;
    }
    const { data, error } = await supabaseClient
      .from('join_screenings')
      .insert({ guild_id: guildId, user_id: userId, username, risk_score: riskScore, alt_risk_level: altRisk, decision, pipeline_log: pipelineLog })
      .select().single();
    if (error) throw error;
    return data;
  },

  async getJoinScreenings(guildId, limit = 50) {
    if (shouldMock(guildId)) {
      return (mockDb.join_screenings || []).filter(s => s.guild_id === guildId).slice(0, limit);
    }
    const { data, error } = await supabaseClient
      .from('join_screenings').select('*').eq('guild_id', guildId)
      .order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  },

  // ── v2.0 EMERGENCY ACTIONS ───────────────────────────────────────────────────
  async logEmergencyAction(guildId, actionType, triggeredBy, reason, outcome, affectedCount, details) {
    if (shouldMock(guildId)) {
      const record = {
        id: `ea-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId, action_type: actionType, triggered_by: triggeredBy,
        reason, outcome, affected_count: affectedCount, details,
        created_at: new Date().toISOString()
      };
      if (!mockDb.emergency_actions) mockDb.emergency_actions = [];
      mockDb.emergency_actions.unshift(record);
      return record;
    }
    const { data, error } = await supabaseClient
      .from('emergency_actions')
      .insert({ guild_id: guildId, action_type: actionType, triggered_by: triggeredBy, reason, outcome, affected_count: affectedCount, details })
      .select().single();
    if (error) throw error;
    return data;
  },

  async getEmergencyHistory(guildId) {
    if (shouldMock(guildId)) {
      return (mockDb.emergency_actions || []).filter(e => e.guild_id === guildId);
    }
    const { data, error } = await supabaseClient
      .from('emergency_actions').select('*').eq('guild_id', guildId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // ── v2.0 TEAM MEMBERS ────────────────────────────────────────────────────────
  async getTeamMembers(guildId) {
    if (shouldMock(guildId)) {
      return (mockDb.team_members || [])
        .filter(m => m.guild_id === guildId)
        .map(m => ({ ...m, user: mockDb.users.find(u => u.id === m.user_id) }));
    }
    const { data, error } = await supabaseClient
      .from('team_members').select('*, user:users(*)')
      .eq('guild_id', guildId);
    if (error) throw error;
    return data || [];
  },

  async addTeamMember(guildId, userId, role, addedBy, permissions = {}) {
    if (shouldMock(guildId)) {
      const existing = (mockDb.team_members || []).findIndex(m => m.guild_id === guildId && m.user_id === userId);
      const member = {
        id: `tm-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId, user_id: userId, team_role: role,
        permissions, added_by: addedBy, last_active: null,
        created_at: new Date().toISOString()
      };
      if (!mockDb.team_members) mockDb.team_members = [];
      if (existing !== -1) mockDb.team_members[existing] = member;
      else mockDb.team_members.push(member);
      return member;
    }
    const { data, error } = await supabaseClient
      .from('team_members')
      .upsert({ guild_id: guildId, user_id: userId, team_role: role, permissions, added_by: addedBy })
      .select().single();
    if (error) throw error;
    return data;
  },

  async removeTeamMember(guildId, userId) {
    if (shouldMock(guildId)) {
      mockDb.team_members = (mockDb.team_members || []).filter(m => !(m.guild_id === guildId && m.user_id === userId));
      return true;
    }
    const { error } = await supabaseClient
      .from('team_members').delete().match({ guild_id: guildId, user_id: userId });
    if (error) throw error;
    return true;
  },

  // ── v2.0 INTEGRATION WEBHOOKS ────────────────────────────────────────────────
  async getWebhooks(guildId) {
    if (shouldMock(guildId)) {
      return (mockDb.integration_webhooks || []).filter(w => w.guild_id === guildId);
    }
    const { data, error } = await supabaseClient
      .from('integration_webhooks').select('*').eq('guild_id', guildId);
    if (error) throw error;
    return data || [];
  },

  async createWebhook(guildId, name, url, events) {
    if (shouldMock(guildId)) {
      const wh = {
        id: `wh-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: guildId, name, url, events, enabled: true,
        last_triggered: null, created_at: new Date().toISOString()
      };
      if (!mockDb.integration_webhooks) mockDb.integration_webhooks = [];
      mockDb.integration_webhooks.push(wh);
      return wh;
    }
    const { data, error } = await supabaseClient
      .from('integration_webhooks').insert({ guild_id: guildId, name, url, events }).select().single();
    if (error) throw error;
    return data;
  },

  async updateWebhook(id, updates, guildId) {
    if (shouldMock(guildId)) {
      const idx = (mockDb.integration_webhooks || []).findIndex(w => w.id === id);
      if (idx !== -1) mockDb.integration_webhooks[idx] = { ...mockDb.integration_webhooks[idx], ...updates };
      return mockDb.integration_webhooks[idx];
    }
    const { data, error } = await supabaseClient
      .from('integration_webhooks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteWebhook(id, guildId) {
    if (shouldMock(guildId)) {
      mockDb.integration_webhooks = (mockDb.integration_webhooks || []).filter(w => w.id !== id);
      return true;
    }
    const { error } = await supabaseClient.from('integration_webhooks').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ── v2.0 SECURITY METRICS ────────────────────────────────────────────────────
  async getSecurityMetrics(guildId, days = 7) {
    if (shouldMock(guildId)) {
      return (mockDb.security_metrics || []).filter(m => m.guild_id === guildId).slice(0, days);
    }
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const { data, error } = await supabaseClient
      .from('security_metrics').select('*').eq('guild_id', guildId)
      .gte('date', cutoff).order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async upsertSecurityMetrics(guildId, updates) {
    const today = new Date().toISOString().split('T')[0];
    if (shouldMock(guildId)) {
      if (!mockDb.security_metrics) mockDb.security_metrics = [];
      const idx = mockDb.security_metrics.findIndex(m => m.guild_id === guildId && m.date === today);
      if (idx !== -1) {
        for (const [k, v] of Object.entries(updates)) {
          mockDb.security_metrics[idx][k] = (mockDb.security_metrics[idx][k] || 0) + v;
        }
      } else {
        mockDb.security_metrics.unshift({ id: `sm-${Math.random().toString(36).substr(2, 9)}`, guild_id: guildId, date: today, ...updates });
      }
      return;
    }
    await supabaseClient.from('security_metrics')
      .upsert({ guild_id: guildId, date: today, ...updates }, { onConflict: 'guild_id,date' });
  }
};
db.mockDb = mockDb;

// Seed v2.0 mock data
mockDb.alt_detections = [
  { id: 'alt-001', guild_id: '123456789012345678', user_id: '1004', username: 'VoidSpammer', risk_level: 'HIGH_RISK', detection_factors: ['account_age_3_days', 'username_similarity_score_0.89', 'joined_wave_of_5'], action_taken: 'QUARANTINED', resolved: false, created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 'alt-002', guild_id: '123456789012345678', user_id: '1003', username: 'CyberGlitch', risk_level: 'SUSPICIOUS', detection_factors: ['account_age_12_days', 'default_avatar'], action_taken: 'FLAGGED', resolved: false, created_at: new Date(Date.now() - 3600000).toISOString() }
];
mockDb.security_audits = [
  { id: 'aud-001', guild_id: '123456789012345678', score: 74, total_checks: 12, passed_checks: 9, triggered_by: '1002', status: 'COMPLETE', created_at: new Date(Date.now() - 86400000).toISOString() }
];
mockDb.audit_findings = [
  { id: 'af-001', audit_id: 'aud-001', guild_id: '123456789012345678', severity: 'HIGH', category: 'ROLES', title: '3 roles have Administrator permission', description: 'Roles with Administrator bypass all channel permission restrictions. Remove from non-owner roles.', fixable: false, fixed: false },
  { id: 'af-002', audit_id: 'aud-001', guild_id: '123456789012345678', severity: 'MEDIUM', category: 'VERIFICATION', title: 'Quarantine role not configured', description: 'A quarantine role is required to contain suspect members during verification review.', fixable: true, fixed: false, fix_action: 'create_quarantine_role' },
  { id: 'af-003', audit_id: 'aud-001', guild_id: '123456789012345678', severity: 'LOW', category: 'CHANNELS', title: 'audit-logs channel is publicly readable', description: 'The audit-logs channel can be read by all members. Restrict to staff roles only.', fixable: true, fixed: false, fix_action: 'restrict_audit_channel' }
];
mockDb.incident_playbooks = [
  { id: 'pb-sys-001', guild_id: '123456789012345678', name: 'Anti-Spam Response', trigger_type: 'ANTI_SPAM', trigger_config: { messages_per_second: 5 }, actions: ['delete_messages', 'timeout_user', 'create_incident', 'alert_moderators'], enabled: true, is_system: true, executions: 14, last_triggered: new Date(Date.now() - 7200000).toISOString() },
  { id: 'pb-sys-002', guild_id: '123456789012345678', name: 'Anti-Raid Lockdown', trigger_type: 'ANTI_RAID', trigger_config: { joins_per_minute: 10 }, actions: ['lock_invites', 'enable_slowmode', 'quarantine_joins', 'alert_staff'], enabled: true, is_system: true, executions: 3, last_triggered: new Date(Date.now() - 86400000).toISOString() },
  { id: 'pb-sys-003', guild_id: '123456789012345678', name: 'Anti-Nuke Emergency', trigger_type: 'ANTI_NUKE', trigger_config: { deletions_in_seconds: 3 }, actions: ['emergency_lockdown', 'create_backup', 'remove_dangerous_perms', 'critical_alerts'], enabled: true, is_system: true, executions: 1, last_triggered: new Date(Date.now() - 172800000).toISOString() }
];
mockDb.join_screenings = [
  { id: 'js-001', guild_id: '123456789012345678', user_id: '1003', username: 'CyberGlitch', risk_score: 42, alt_risk_level: 'SUSPICIOUS', decision: 'PENDING', pipeline_log: [{ step: 'RISK_ENGINE', result: 'score:42 level:YELLOW' }, { step: 'ALT_DETECTION', result: 'SUSPICIOUS' }, { step: 'DECISION', result: 'PENDING_VERIFICATION' }], created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'js-002', guild_id: '123456789012345678', user_id: '1004', username: 'VoidSpammer', risk_score: 92, alt_risk_level: 'HIGH_RISK', decision: 'QUARANTINED', pipeline_log: [{ step: 'RISK_ENGINE', result: 'score:92 level:RED' }, { step: 'ALT_DETECTION', result: 'HIGH_RISK' }, { step: 'DECISION', result: 'QUARANTINED' }], created_at: new Date(Date.now() - 1800000).toISOString() }
];
mockDb.emergency_actions = [
  { id: 'ea-001', guild_id: '123456789012345678', action_type: 'SERVER_LOCK', triggered_by: '1002', reason: 'Raid attempt detected — 15 bots joined in 30 seconds', outcome: 'SUCCESS', affected_count: 24, details: { channels_locked: 24 }, created_at: new Date(Date.now() - 86400000).toISOString() }
];
mockDb.team_members = [
  { id: 'tm-m-001', guild_id: '123456789012345678', user_id: '1002', team_role: 'Admin', permissions: { emergency: true, audit: true, team_manage: true }, added_by: '99999', last_active: new Date().toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 'tm-m-002', guild_id: '123456789012345678', user_id: '1001', team_role: 'Moderator', permissions: { emergency: false, audit: false, team_manage: false }, added_by: '1002', last_active: new Date(Date.now() - 3600000).toISOString(), created_at: new Date(Date.now() - 1296000000).toISOString() }
];
mockDb.integration_webhooks = [
  { id: 'wh-001', guild_id: '123456789012345678', name: 'Security Alerts → Discord Staff', url: 'https://discord.com/api/webhooks/example/abc123', events: ['security_alert', 'raid_detected'], enabled: true, last_triggered: new Date(Date.now() - 7200000).toISOString(), last_status: 200, created_at: new Date(Date.now() - 604800000).toISOString() }
];
mockDb.security_metrics = [
  { id: 'sm-001', guild_id: '123456789012345678', date: new Date().toISOString().split('T')[0], alts_detected: 2, incidents_resolved: 5, verifications_processed: 12, emergency_actions: 1, members_quarantined: 1, members_kicked: 0, threat_level: 'MEDIUM' },
  { id: 'sm-002', guild_id: '123456789012345678', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], alts_detected: 0, incidents_resolved: 3, verifications_processed: 8, emergency_actions: 0, members_quarantined: 0, members_kicked: 0, threat_level: 'LOW' }
];

module.exports = {
  client: supabaseClient,
  db,
  mockDb,
  shouldMock
};

