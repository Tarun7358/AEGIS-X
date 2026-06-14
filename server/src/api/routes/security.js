const express = require('express');
const router = express.Router();
const { db, shouldMock } = require('../../services/supabase');
const { getBotClient, MockDiscordClient } = require('../../bot/client');
const socketService = require('../../services/socket');
const config = require('../../config');
const { authorizeRole } = require('../middleware/auth');

// GET /api/security/:guildId/incidents
router.get('/:guildId/incidents', authorizeRole(['Owner', 'Security Director', 'Admin', 'Moderator']), async (req, res) => {
  try {
    const incidents = await db.getIncidents(req.params.guildId);
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/security/:guildId/threat-scores
router.get('/:guildId/threat-scores', authorizeRole(['Owner', 'Security Director', 'Admin', 'Moderator']), async (req, res) => {
  try {
    const list = await db.getAllThreatScores(req.params.guildId);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/security/:guildId/verification-queue
router.get('/:guildId/verification-queue', authorizeRole(['Owner', 'Security Director', 'Admin', 'Moderator']), async (req, res) => {
  try {
    const queue = await db.getVerificationQueue(req.params.guildId);
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/security/:guildId/verification/:userId/approve
router.post('/:guildId/verification/:userId/approve', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { moderatorId, details } = req.body;
  const { guildId, userId } = req.params;

  try {
    const log = await db.verifyMember(guildId, userId, moderatorId || req.userId || '1002', 'APPROVED', details || 'Approved manually via admin dashboard.');

    // ── Bot Action: Assign verified role in production ──
    if (!shouldMock(guildId)) {
      try {
        const client = getBotClient();
        if (client && client.guilds) {
          const guild = client.guilds.cache.get(guildId);
          if (guild) {
            const settings = await db.getSettings(guildId);
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member && settings) {
              // Assign the configured verified role
              const verifiedRoleName = settings.verification_role || 'Verified';
              const verifiedRole = guild.roles.cache.find(r => r.name === verifiedRoleName || r.id === verifiedRoleName);
              if (verifiedRole) {
                await member.roles.add(verifiedRole);
                console.log(`✅ Bot: Assigned verified role to member ${userId} in guild ${guildId}`);
              }
              // Remove any quarantine role if present
              const quarantineRole = guild.roles.cache.find(r => r.name === 'Quarantine' || r.id === (settings.quarantine_role || ''));
              if (quarantineRole && member.roles.cache.has(quarantineRole.id)) {
                await member.roles.remove(quarantineRole);
              }
            }
          }
        }
      } catch (botErr) {
        console.error('❌ Bot: Failed to assign verified role:', botErr.message);
      }
    }

    // Broadcast update
    socketService.broadcast(guildId, 'verification_approved', {
      userId,
      moderatorId: moderatorId || req.userId || '1002'
    });

    res.json({ success: true, log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/security/:guildId/verification/:userId/reject
router.post('/:guildId/verification/:userId/reject', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { moderatorId, details } = req.body;
  const { guildId, userId } = req.params;

  try {
    const log = await db.verifyMember(guildId, userId, moderatorId || req.userId || '1002', 'REJECTED', details || 'Rejected manually via admin dashboard.');

    // ── Bot Action: Kick the member in production ──
    if (!shouldMock(guildId)) {
      try {
        const client = getBotClient();
        if (client && client.guilds) {
          const guild = client.guilds.cache.get(guildId);
          if (guild) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
              await member.kick('Verification rejected via AEGIS X dashboard.');
              console.log(`✅ Bot: Kicked member ${userId} from guild ${guildId} (verification rejected)`);
            }
          }
        }
      } catch (botErr) {
        console.error('❌ Bot: Failed to kick member:', botErr.message);
      }
    }

    // Broadcast update
    socketService.broadcast(guildId, 'verification_rejected', {
      userId,
      moderatorId: moderatorId || req.userId || '1002'
    });

    res.json({ success: true, log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/security/:guildId/lockdown
// Triggers a full server lockdown via the real Discord bot
router.post('/:guildId/lockdown', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { enabled } = req.body;
  const { guildId } = req.params;

  try {
    // Persist lockdown state to settings
    await db.updateSettings(guildId, {
      verification_enabled: enabled
    });

    // ── Bot Action: Actually lock/unlock Discord channels ──
    if (!shouldMock(guildId)) {
      try {
        const client = getBotClient();
        if (client && client.guilds) {
          const guild = client.guilds.cache.get(guildId);
          if (guild) {
            const channels = await guild.channels.fetch();
            const textChannels = channels.filter(c => c && c.isTextBased && c.isTextBased() && c.type === 0);
            const everyoneRole = guild.roles.everyone;

            const lockPromises = textChannels.map(async (channel) => {
              try {
                if (enabled) {
                  // LOCKDOWN: Deny SEND_MESSAGES and ADD_REACTIONS for @everyone
                  await channel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: false,
                    AddReactions: false
                  });
                } else {
                  // UNLOCK: Restore permissions to null (inherit from role)
                  await channel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: null,
                    AddReactions: null
                  });
                }
              } catch (chErr) {
                // Some channels may lack manage perms – log and skip
                console.warn(`⚠️ Could not set perms on channel ${channel.name}: ${chErr.message}`);
              }
            });

            await Promise.allSettled(lockPromises);
            console.log(`✅ Bot: ${enabled ? 'LOCKED DOWN' : 'UNLOCKED'} ${textChannels.size} channels in guild ${guildId}`);
          }
        }
      } catch (botErr) {
        console.error('❌ Bot: Lockdown channel perms failed:', botErr.message);
      }
    } else {
      // Mock mode: simulate lockdown in mockDb
      if (!db.mockDb.guild_settings[guildId]) {
        db.mockDb.guild_settings[guildId] = {};
      }
      db.mockDb.guild_settings[guildId].lockdown_active = enabled;
      console.log(`🤖 [Mock Bot] Server ${guildId} lockdown set to: ${enabled}`);
    }

    // Broadcast lockdown event to dashboard
    socketService.broadcast(guildId, 'server_lockdown', {
      enabled,
      timestamp: new Date().toISOString()
    });

    // Log the audit action
    await db.logAudit(guildId, req.userId || '1002', enabled ? 'LOCKDOWN_ACTIVATE' : 'LOCKDOWN_DEACTIVATE', 'GUILD', guildId, {
      action_by: req.userId
    });

    res.json({ success: true, lockdown: enabled });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// EMULATION / SIMULATION ROUTES (Active for both Mock & Production)
// ==========================================

router.post('/:guildId/simulate/join', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { username, ageDays } = req.body;
  const { guildId } = req.params;
  try {
    let client = getBotClient();
    if (shouldMock(guildId) || !client || !client.simulateMemberJoin) {
      client = new MockDiscordClient();
    }
    const result = await client.simulateMemberJoin(guildId, username || 'SuspectBot', parseInt(ageDays) || 0);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:guildId/simulate/spam', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { username } = req.body;
  const { guildId } = req.params;
  try {
    let client = getBotClient();
    if (shouldMock(guildId) || !client || !client.simulateSpamAttack) {
      client = new MockDiscordClient();
    }
    const incident = await client.simulateSpamAttack(guildId, username || 'VoidSpammer');
    res.json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:guildId/simulate/nuke', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { username } = req.body;
  const { guildId } = req.params;
  try {
    let client = getBotClient();
    if (shouldMock(guildId) || !client || !client.simulateAntiNukeAttack) {
      client = new MockDiscordClient();
    }
    const incident = await client.simulateAntiNukeAttack(guildId, username || 'ShadowBlade');
    res.json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:guildId/simulate/leave', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { username } = req.body;
  const { guildId } = req.params;
  try {
    let client = getBotClient();
    if (shouldMock(guildId) || !client || !client.simulateMemberLeave) {
      client = new MockDiscordClient();
    }
    const result = await client.simulateMemberLeave(guildId, username || 'SuspectBot');
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
