const express = require('express');
const router = express.Router();
const { db } = require('../../services/supabase');
const altDetection = require('../../services/altDetection');
const socketService = require('../../services/socket');
const { authorizeRole } = require('../middleware/auth');

// GET /api/alt-detection/:guildId/detections
router.get('/:guildId/detections', authorizeRole(['Owner', 'Security Director', 'Admin', 'Moderator']), async (req, res) => {
  try {
    const detections = await db.getAltDetections(req.params.guildId);
    res.json(Array.isArray(detections) ? detections : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/alt-detection/:guildId/scan — manually scan a user
router.post('/:guildId/scan', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { userId, username, createdAt, avatarUrl } = req.body;
  try {
    const { mockDb } = require('../../services/supabase');
    const recentJoins = (mockDb.join_screenings || [])
      .filter(s => s.guild_id === req.params.guildId)
      .slice(0, 20)
      .map(s => ({ id: s.user_id, username: s.username }));

    const result = await altDetection.manualScan(
      req.params.guildId, userId, username, createdAt, avatarUrl, recentJoins
    );
    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/alt-detection/:guildId/detections/:id/action
router.post('/:guildId/detections/:id/action', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { action } = req.body;
  const { guildId, id } = req.params;
  const validActions = ['FLAGGED', 'QUARANTINED', 'KICKED', 'DISMISSED'];

  if (!validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
  }

  try {
    const updated = await db.updateAltAction(id, action, req.userId || '1002', guildId);
    socketService.broadcast(guildId, 'alt_action_taken', { detectionId: id, action, by: req.userId });
    res.json({ success: true, updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/alt-detection/:guildId/stats
router.get('/:guildId/stats', authorizeRole(['Owner', 'Security Director', 'Admin', 'Moderator']), async (req, res) => {
  try {
    const detections = await db.getAltDetections(req.params.guildId);
    const list = Array.isArray(detections) ? detections : [];
    res.json({
      total: list.length,
      confirmed: list.filter(d => d.risk_level === 'CONFIRMED_ALT').length,
      highRisk: list.filter(d => d.risk_level === 'HIGH_RISK').length,
      suspicious: list.filter(d => d.risk_level === 'SUSPICIOUS').length,
      quarantined: list.filter(d => d.action_taken === 'QUARANTINED').length,
      kicked: list.filter(d => d.action_taken === 'KICKED').length,
      unresolved: list.filter(d => !d.resolved).length
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/alt-detection/:guildId/screenings
router.get('/:guildId/screenings', authorizeRole(['Owner', 'Security Director', 'Admin', 'Moderator']), async (req, res) => {
  try {
    const screenings = await db.getJoinScreenings(req.params.guildId);
    res.json(Array.isArray(screenings) ? screenings : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
