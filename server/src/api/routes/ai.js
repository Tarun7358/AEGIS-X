const express = require('express');
const router = express.Router();
const { db, shouldMock } = require('../../services/supabase');
const ai = require('../../services/openai');
const { authorizeRole } = require('../middleware/auth');

// POST /api/ai/:guildId/audit
router.post('/:guildId/audit', authorizeRole(['Owner', 'Admin', 'Security Director']), async (req, res) => {
  try {
    const settings = await db.getSettings(req.params.guildId);
    const auditLogs = await db.getAuditLogs(req.params.guildId);

    const auditReport = await ai.auditServer(auditLogs, settings);
    
    // Log the security report in DB
    const config = require('../../config');
    if (shouldMock(req.params.guildId)) {
      db.mockDb.security_reports.push({
        id: `sr-${Math.random().toString(36).substr(2, 9)}`,
        guild_id: req.params.guildId,
        report_type: 'INCIDENT_SUMMARY',
        summary: auditReport.recommendations,
        stats: { score: auditReport.score, rating: auditReport.rating, issues: auditReport.issues },
        created_at: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      report: auditReport
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
