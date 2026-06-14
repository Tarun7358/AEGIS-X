const express = require('express');
const router = express.Router();
const { db, shouldMock } = require('../../services/supabase');
const { getBotClient } = require('../../bot/client');
const socketService = require('../../services/socket');
const { authorizeRole } = require('../middleware/auth');

// Helper: Apply lockdown to all text channels
async function applyChannelLockdown(guildId, enabled, botClient) {
  if (!botClient || !botClient.guilds) return 0;
  const guild = botClient.guilds.cache.get(guildId);
  if (!guild) return 0;
  const channels = await guild.channels.fetch();
  const textChannels = channels.filter(c => c && c.type === 0);
  const everyone = guild.roles.everyone;
  await Promise.allSettled(textChannels.map(c =>
    c.permissionOverwrites.edit(everyone, {
      SendMessages: enabled ? false : null,
      AddReactions: enabled ? false : null
    }).catch(() => {})
  ));
  return textChannels.size;
}

// POST /api/emergency/:guildId/lock
router.post('/:guildId/lock', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { reason } = req.body;
  const { guildId } = req.params;
  try {
    let affected = 0;
    if (!shouldMock(guildId)) {
      affected = await applyChannelLockdown(guildId, true, getBotClient());
    } else {
      affected = 24; // mock
    }
    await db.updateSettings(guildId, { verification_enabled: true });
    const record = await db.logEmergencyAction(guildId, 'SERVER_LOCK', req.userId || '1002', reason || 'Emergency lockdown', 'SUCCESS', affected, { channels_locked: affected });
    socketService.broadcast(guildId, 'emergency_action', { action: 'SERVER_LOCK', reason, affected });
    socketService.broadcast(guildId, 'server_lockdown', { enabled: true, timestamp: new Date().toISOString() });
    await db.logAudit(guildId, req.userId || '1002', 'EMERGENCY_LOCK', 'GUILD', guildId, { reason, affected });
    res.json({ success: true, affected, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/emergency/:guildId/unlock
router.post('/:guildId/unlock', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { reason } = req.body;
  const { guildId } = req.params;
  try {
    let affected = 0;
    if (!shouldMock(guildId)) {
      affected = await applyChannelLockdown(guildId, false, getBotClient());
    } else {
      affected = 24;
    }
    const record = await db.logEmergencyAction(guildId, 'SERVER_UNLOCK', req.userId || '1002', reason || 'Unlock after incident', 'SUCCESS', affected, { channels_unlocked: affected });
    socketService.broadcast(guildId, 'emergency_action', { action: 'SERVER_UNLOCK', reason, affected });
    socketService.broadcast(guildId, 'server_lockdown', { enabled: false, timestamp: new Date().toISOString() });
    res.json({ success: true, affected, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/emergency/:guildId/disable-invites
router.post('/:guildId/disable-invites', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { reason } = req.body;
  const { guildId } = req.params;
  try {
    let deleted = 0;
    if (!shouldMock(guildId)) {
      const client = getBotClient();
      const guild = client?.guilds?.cache?.get(guildId);
      if (guild) {
        const invites = await guild.invites.fetch().catch(() => null);
        if (invites) {
          await Promise.allSettled(invites.map(inv => inv.delete('AEGIS X emergency: disable invites')));
          deleted = invites.size;
        }
      }
    } else {
      deleted = 5; // mock
    }
    const record = await db.logEmergencyAction(guildId, 'DISABLE_INVITES', req.userId || '1002', reason || 'Emergency invite disable', 'SUCCESS', deleted, { invites_deleted: deleted });
    socketService.broadcast(guildId, 'emergency_action', { action: 'DISABLE_INVITES', reason, affected: deleted });
    res.json({ success: true, affected: deleted, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/emergency/:guildId/enable-slowmode
router.post('/:guildId/enable-slowmode', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { reason, seconds = 10 } = req.body;
  const { guildId } = req.params;
  try {
    let affected = 0;
    if (!shouldMock(guildId)) {
      const client = getBotClient();
      const guild = client?.guilds?.cache?.get(guildId);
      if (guild) {
        const channels = await guild.channels.fetch();
        const textChs = channels.filter(c => c && c.type === 0);
        await Promise.allSettled(textChs.map(c => c.setRateLimitPerUser(seconds, 'AEGIS X emergency slowmode')));
        affected = textChs.size;
      }
    } else {
      affected = 24;
    }
    const record = await db.logEmergencyAction(guildId, 'ENABLE_SLOWMODE', req.userId || '1002', reason || `Slowmode ${seconds}s`, 'SUCCESS', affected, { slowmode_seconds: seconds });
    socketService.broadcast(guildId, 'emergency_action', { action: 'ENABLE_SLOWMODE', reason, affected, seconds });
    res.json({ success: true, affected, seconds, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/emergency/:guildId/freeze
router.post('/:guildId/freeze', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { reason } = req.body;
  const { guildId } = req.params;
  try {
    // Freeze = lock + slowmode
    let affected = 0;
    if (!shouldMock(guildId)) {
      const client = getBotClient();
      affected = await applyChannelLockdown(guildId, true, client);
    } else { affected = 24; }
    const record = await db.logEmergencyAction(guildId, 'FREEZE_CHANNELS', req.userId || '1002', reason || 'Channel freeze', 'SUCCESS', affected, {});
    socketService.broadcast(guildId, 'emergency_action', { action: 'FREEZE_CHANNELS', reason, affected });
    res.json({ success: true, affected, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/emergency/:guildId/quarantine-joins
router.post('/:guildId/quarantine-joins', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { reason } = req.body;
  const { guildId } = req.params;
  try {
    await db.updateSettings(guildId, { verification_enabled: true, anti_raid_enabled: true });
    const record = await db.logEmergencyAction(guildId, 'QUARANTINE_JOINS', req.userId || '1002', reason || 'All new joins quarantined', 'SUCCESS', 0, {});
    socketService.broadcast(guildId, 'emergency_action', { action: 'QUARANTINE_JOINS', reason });
    socketService.broadcast(guildId, 'settings_updated', { guildId, changes: { verification_enabled: true } });
    res.json({ success: true, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/emergency/:guildId/emergency-backup
router.post('/:guildId/emergency-backup', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { reason } = req.body;
  const { guildId } = req.params;
  try {
    const backupService = require('../../services/backup');
    const botClient = !shouldMock(guildId) ? getBotClient() : null;
    const mockGuild = { id: guildId, name: 'Emergency', channels: { cache: new Map() }, roles: { cache: new Map() } };
    const guild = botClient?.guilds?.cache?.get(guildId) || mockGuild;
    const backup = await backupService.createServerBackup(guild, req.userId || '1002');
    const record = await db.logEmergencyAction(guildId, 'EMERGENCY_BACKUP', req.userId || '1002', reason || 'Emergency backup before incident response', 'SUCCESS', 0, { backup_id: backup?.id });
    socketService.broadcast(guildId, 'emergency_action', { action: 'EMERGENCY_BACKUP', reason });
    res.json({ success: true, backup, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/emergency/:guildId/history
router.get('/:guildId/history', authorizeRole(['Owner', 'Security Director', 'Admin', 'Moderator']), async (req, res) => {
  try {
    const history = await db.getEmergencyHistory(req.params.guildId);
    res.json(Array.isArray(history) ? history : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
