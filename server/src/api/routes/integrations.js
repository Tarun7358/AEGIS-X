const express = require('express');
const router = express.Router();
const { db } = require('../../services/supabase');
const { authorizeRole } = require('../middleware/auth');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const socketService = require('../../services/socket');

// Helper: send webhook payload
async function sendWebhookPayload(url, payload) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const body = JSON.stringify(payload);
      const req = lib.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'User-Agent': 'AEGIS-X-Bot/2.0' }
      }, (res) => resolve({ status: res.statusCode }));
      req.on('error', () => resolve({ status: 0 }));
      req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0 }); });
      req.write(body);
      req.end();
    } catch (err) {
      resolve({ status: 0 });
    }
  });
}

// GET /api/integrations/:guildId/webhooks
router.get('/:guildId/webhooks', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  try {
    const webhooks = await db.getWebhooks(req.params.guildId);
    res.json(Array.isArray(webhooks) ? webhooks : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/integrations/:guildId/webhooks
router.post('/:guildId/webhooks', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { name, url, events } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url are required.' });

  const validEvents = ['security_alert', 'raid_detected', 'verification_event', 'backup_complete', 'ticket_created', 'alt_detected', 'emergency_action', 'audit_complete'];
  const filteredEvents = Array.isArray(events) ? events.filter(e => validEvents.includes(e)) : [];

  try {
    const webhook = await db.createWebhook(req.params.guildId, name, url, filteredEvents);
    socketService.broadcast(req.params.guildId, 'webhooks_updated', { action: 'created', id: webhook.id });
    res.json({ success: true, webhook });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/integrations/:guildId/webhooks/:id
router.put('/:guildId/webhooks/:id', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { name, url, events, enabled } = req.body;
  try {
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (events !== undefined) updates.events = events;
    if (enabled !== undefined) updates.enabled = enabled;
    const updated = await db.updateWebhook(req.params.id, updates, req.params.guildId);
    socketService.broadcast(req.params.guildId, 'webhooks_updated', { action: 'updated', id: req.params.id });
    res.json({ success: true, updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/integrations/:guildId/webhooks/:id
router.delete('/:guildId/webhooks/:id', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  try {
    await db.deleteWebhook(req.params.id, req.params.guildId);
    socketService.broadcast(req.params.guildId, 'webhooks_updated', { action: 'deleted', id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/integrations/:guildId/webhooks/:id/test
router.post('/:guildId/webhooks/:id/test', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  try {
    const webhooks = await db.getWebhooks(req.params.guildId);
    const wh = (Array.isArray(webhooks) ? webhooks : []).find(w => w.id === req.params.id);
    if (!wh) return res.status(404).json({ error: 'Webhook not found' });

    const testPayload = {
      source: 'AEGIS_X',
      event: 'webhook_test',
      guild_id: req.params.guildId,
      timestamp: new Date().toISOString(),
      message: '✅ AEGIS X webhook test — connection confirmed!'
    };

    const result = await sendWebhookPayload(wh.url, testPayload);
    await db.updateWebhook(req.params.id, { last_triggered: new Date().toISOString(), last_status: result.status }, req.params.guildId);
    socketService.broadcast(req.params.guildId, 'webhooks_updated', { action: 'tested', id: req.params.id, status: result.status });

    res.json({ success: result.status >= 200 && result.status < 300, status: result.status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Internal: dispatch event to all matching webhooks
async function dispatchWebhookEvent(guildId, eventType, payload) {
  try {
    const webhooks = await db.getWebhooks(guildId);
    const matching = (Array.isArray(webhooks) ? webhooks : []).filter(w => w.enabled && w.events?.includes(eventType));
    for (const wh of matching) {
      const result = await sendWebhookPayload(wh.url, { source: 'AEGIS_X', event: eventType, guild_id: guildId, timestamp: new Date().toISOString(), ...payload });
      await db.updateWebhook(wh.id, { last_triggered: new Date().toISOString(), last_status: result.status }, guildId).catch(() => {});
    }
  } catch (err) {
    console.error('[Webhooks] Dispatch error:', err.message);
  }
}

module.exports = router;
module.exports.dispatchWebhookEvent = dispatchWebhookEvent;
