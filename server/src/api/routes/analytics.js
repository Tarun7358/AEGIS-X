const express = require('express');
const router = express.Router();
const { db } = require('../../services/supabase');

// GET /api/analytics/:guildId
router.get('/:guildId', async (req, res) => {
  try {
    const analytics = await db.getAnalytics(req.params.guildId);
    
    // Process analytics into rich categories
    const chartData = analytics.map(day => ({
      date: day.date,
      joins: day.joins,
      leaves: day.leaves,
      messages: day.messages_sent,
      voiceMinutes: day.voice_minutes,
      tickets: day.tickets_created,
      securityAlerts: day.security_alerts_triggered
    }));

    // Calculate aggregate totals
    const summary = analytics.reduce((acc, curr) => {
      acc.totalJoins += curr.joins;
      acc.totalLeaves += curr.leaves;
      acc.totalMessages += curr.messages_sent;
      acc.totalVoiceMinutes += curr.voice_minutes;
      acc.totalTickets += curr.tickets_created;
      acc.totalAlerts += curr.security_alerts_triggered;
      return acc;
    }, { totalJoins: 0, totalLeaves: 0, totalMessages: 0, totalVoiceMinutes: 0, totalTickets: 0, totalAlerts: 0 });

    res.json({
      summary,
      chartData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
