const express = require('express');
const router = express.Router();
const { db } = require('../../services/supabase');
const socketService = require('../../services/socket');
const { authorizeRole } = require('../middleware/auth');

// GET /api/moderation/:guildId/cases
router.get('/:guildId/cases', authorizeRole(['Owner', 'Admin', 'Moderator']), async (req, res) => {
  try {
    const cases = await db.getModerationCases(req.params.guildId);
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/moderation/:guildId/cases
router.post('/:guildId/cases', authorizeRole(['Owner', 'Admin', 'Moderator']), async (req, res) => {
  const { userId, moderatorId, actionType, reason, notes, evidenceUrl } = req.body;
  try {
    const newCase = await db.logModerationCase(req.params.guildId, {
      user_id: userId,
      moderator_id: moderatorId || req.userId || '1002',
      action_type: actionType,
      reason,
      notes,
      evidence_url: evidenceUrl
    });

    // Broadcast case event
    socketService.broadcast(req.params.guildId, 'moderation_action', {
      action: actionType,
      userId,
      moderatorId: moderatorId || req.userId || '1002',
      reason
    });

    res.json({ success: true, case: newCase });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
