const express = require('express');
const router = express.Router();
const { db } = require('../../services/supabase');
const socketService = require('../../services/socket');
const { authorizeRole } = require('../middleware/auth');

// GET /api/team/:guildId/members
router.get('/:guildId/members', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  try {
    const members = await db.getTeamMembers(req.params.guildId);
    res.json(Array.isArray(members) ? members : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/team/:guildId/members
router.post('/:guildId/members', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { userId, role, permissions } = req.body;
  if (!userId || !role) return res.status(400).json({ error: 'userId and role are required.' });

  const validRoles = ['Owner', 'Security Director', 'Admin', 'Moderator', 'Support', 'Analyst', 'Viewer'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });

  try {
    const member = await db.addTeamMember(req.params.guildId, userId, role, req.userId || '1002', permissions || {});
    await db.logAudit(req.params.guildId, req.userId || '1002', 'TEAM_MEMBER_ADDED', 'USER', userId, { role });
    socketService.broadcast(req.params.guildId, 'team_roster_updated', { action: 'added', userId, role });
    res.json({ success: true, member });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/team/:guildId/members/:userId
router.put('/:guildId/members/:userId', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { role, permissions } = req.body;
  try {
    const member = await db.addTeamMember(req.params.guildId, req.params.userId, role, req.userId || '1002', permissions || {});
    await db.logAudit(req.params.guildId, req.userId || '1002', 'TEAM_MEMBER_UPDATED', 'USER', req.params.userId, { role });
    socketService.broadcast(req.params.guildId, 'team_roster_updated', { action: 'updated', userId: req.params.userId, role });
    res.json({ success: true, member });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/team/:guildId/members/:userId
router.delete('/:guildId/members/:userId', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  try {
    await db.removeTeamMember(req.params.guildId, req.params.userId);
    await db.logAudit(req.params.guildId, req.userId || '1002', 'TEAM_MEMBER_REMOVED', 'USER', req.params.userId, {});
    socketService.broadcast(req.params.guildId, 'team_roster_updated', { action: 'removed', userId: req.params.userId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/team/:guildId/activity  — returns audit log filtered to team members
router.get('/:guildId/activity', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  try {
    const logs = await db.getAuditLogs(req.params.guildId);
    res.json(Array.isArray(logs) ? logs.slice(0, 50) : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
