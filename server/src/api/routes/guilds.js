const express = require('express');
const router = express.Router();
const { db, shouldMock } = require('../../services/supabase');
const backupService = require('../../services/backup');
const { getBotClient } = require('../../bot/client');
const config = require('../../config');
const { requireAuth, authorizeRole, getUserId, getAccessToken } = require('../middleware/auth');

const guildsCache = new Map();

// GET /api/guilds
// List guilds the user is allowed to manage
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    if (config.isMockMode || userId === '1001' || userId === '1002' || userId === '1003' || userId.toString().startsWith('mock-')) {
      // Find all memberships for this user
      const memberships = db.mockDb.memberships.filter(m => m.user_id === userId);
      const ownedGuilds = db.mockDb.guilds.filter(g => g.owner_id === userId);

      // Merge user owned and member guilds
      const list = db.mockDb.guilds
        .filter(g => g.owner_id === userId || memberships.some(m => m.guild_id === g.id))
        .map(g => {
          const m = memberships.find(mem => mem.guild_id === g.id);
          const role = g.owner_id === userId ? 'Owner' : (m ? m.role : 'Member');
          return {
            ...g,
            user_role: role
          };
        });

      return res.json(list);
    }

    // Check Cache first
    const cached = guildsCache.get(userId);
    if (cached && cached.expires > Date.now() && req.query.refresh !== 'true') {
      console.log(`⚡ Returning cached guilds list for user ${userId}.`);
      return res.json(cached.list);
    }

    // Production Mode: fetch user's guilds from Discord OAuth using user profile token
    // Compare with discord bot client guilds cache to identify if bot is present
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      console.log('❌ No accessToken found in JWT.');
      return res.status(401).json({ error: 'Missing Discord OAuth access token.' });
    }

    console.log(`📡 Fetching guilds from Discord using accessToken: ${accessToken.substring(0, 10)}...`);
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Discord guilds API returned error: ${response.status} - ${errorText}`);
      throw new Error(`Failed to fetch user guilds from Discord: ${errorText}`);
    }

    const userGuilds = await response.json();
    console.log(`✅ Fetched ${userGuilds.length} guilds from Discord.`);
    const client = getBotClient();

    // Filter to only keep guilds where user is the Owner OR has the Administrator permission (0x8)
    const list = userGuilds
      .filter(g => {
        const isOwner = g.owner;
        const isAdmin = (parseInt(g.permissions) & 0x8) === 0x8;
        const keep = isOwner || isAdmin;
        console.log(`Guild: ${g.name} (${g.id}) | Owner: ${isOwner} | Admin: ${isAdmin} | Keep: ${keep}`);
        return keep;
      })
      .map(g => {
        const botGuild = client.guilds.cache.get(g.id);
        const hasBot = !!botGuild;
        
        return {
          id: g.id,
          name: g.name,
          icon_url: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
          member_count: hasBot ? botGuild.memberCount : 0,
          bot_status: hasBot ? 'ONLINE' : 'NOT_INSTALLED',
          premium_enabled: false,
          user_role: g.owner ? 'Owner' : 'Admin'
        };
      });

    console.log(`📋 Returning ${list.length} managed guilds to frontend.`);

    guildsCache.set(userId, {
      list,
      expires: Date.now() + 60000 // Cache for 60 seconds
    });

    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/guilds/:id/settings
router.get('/:id/settings', authorizeRole(['Owner', 'Admin', 'Security Director']), async (req, res) => {
  try {
    const settings = await db.getSettings(req.params.id);
    if (!settings) return res.status(404).json({ error: 'Settings not found.' });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/guilds/:id/settings
router.post('/:id/settings', authorizeRole(['Owner', 'Admin', 'Security Director']), async (req, res) => {
  try {
    const updated = await db.updateSettings(req.params.id, req.body);

    // Broadcast settings change to dashboard & bot via Socket.IO
    // This allows the bot's in-memory state to stay in sync without restart
    const socketService = require('../../services/socket');
    socketService.broadcast(req.params.id, 'settings_updated', {
      guildId: req.params.id,
      changes: req.body,
      timestamp: new Date().toISOString()
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/guilds/:id/audit-logs
router.get('/:id/audit-logs', authorizeRole(['Owner', 'Admin', 'Security Director', 'Moderator']), async (req, res) => {
  try {
    const logs = await db.getAuditLogs(req.params.id);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/guilds/:id/backups
router.get('/:id/backups', authorizeRole(['Owner', 'Admin', 'Security Director']), async (req, res) => {
  try {
    const backups = await db.getBackups(req.params.id);
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/guilds/:id/backups
router.post('/:id/backups', authorizeRole(['Owner', 'Admin']), async (req, res) => {
  const { createdBy } = req.body;
  try {
    const client = getBotClient();
    const guild = shouldMock(req.params.id) ? { id: req.params.id, name: 'AEGIS X HQ' } : client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found.' });

    const backup = await backupService.createServerBackup(guild, createdBy || req.userId);
    res.json({ success: true, backup });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/guilds/:id/backups/:backupId/restore
router.post('/:id/backups/:backupId/restore', authorizeRole(['Owner', 'Admin']), async (req, res) => {
  try {
    const client = getBotClient();
    const guild = shouldMock(req.params.id) ? { id: req.params.id, name: 'AEGIS X HQ' } : client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found.' });

    const result = await backupService.restoreServerBackup(guild, req.params.backupId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/guilds/:id/roles
router.get('/:id/roles', authorizeRole(['Owner', 'Admin', 'Security Director']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (shouldMock(id)) {
      const mockRoles = [
        { id: 'Verified', name: 'Verified', color: '#2ecc71' },
        { id: 'Member', name: 'Member', color: '#3498db' },
        { id: 'Newbie', name: 'Newbie', color: '#e67e22' },
        { id: 'Moderator', name: 'Moderator', color: '#9b59b6' },
        { id: 'Admin', name: 'Admin', color: '#e74c3c' }
      ];
      return res.json(mockRoles);
    }
    
    const client = getBotClient();
    const guild = client.guilds.cache.get(id);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found or bot not in guild.' });
    }
    
    const roles = await guild.roles.fetch();
    const rolesList = roles.map(r => ({
      id: r.id,
      name: r.name,
      color: r.hexColor,
      managed: r.managed,
      position: r.position
    }))
    .filter(r => r.name !== '@everyone' && !r.managed)
    .sort((a, b) => b.position - a.position);
    
    res.json(rolesList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/guilds/:id/channels
router.get('/:id/channels', authorizeRole(['Owner', 'Admin', 'Security Director']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (shouldMock(id)) {
      const mockChannels = [
        { id: 'general', name: 'general', type: 'text' },
        { id: 'welcome', name: 'welcome', type: 'text' },
        { id: 'rules', name: 'rules', type: 'text' },
        { id: 'announcements', name: 'announcements', type: 'text' },
        { id: 'lounge', name: 'lounge', type: 'text' },
        { id: 'staff-only', name: 'staff-only', type: 'text' }
      ];
      return res.json(mockChannels);
    }
    
    const client = getBotClient();
    const guild = client.guilds.cache.get(id);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found or bot not in guild.' });
    }
    
    const channels = await guild.channels.fetch();
    const channelsList = channels
      .filter(c => c && (c.type === 0 || c.isTextBased()))
      .map(c => ({
        id: c.id,
        name: c.name,
        type: 'text',
        position: c.position
      }))
      .sort((a, b) => a.position - b.position);
      
    res.json(channelsList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
