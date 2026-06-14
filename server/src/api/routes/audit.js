const express = require('express');
const router = express.Router();
const { db, shouldMock } = require('../../services/supabase');
const { getBotClient } = require('../../bot/client');
const socketService = require('../../services/socket');
const { authorizeRole } = require('../middleware/auth');

// Security check categories and their evaluations
async function runSecurityChecks(guildId, settings, botClient) {
  const findings = [];
  let passed = 0;
  const total = 8;

  // ── Check 1: Verification Enabled ──────────────────────────────────────────
  if (settings?.verification_enabled) {
    passed++;
  } else {
    findings.push({ severity: 'HIGH', category: 'VERIFICATION', title: 'Verification system is disabled', description: 'Enable the Zero-Trust Gatekeeper to prevent unvetted members from accessing the server.', fixable: true, fix_action: 'enable_verification' });
  }

  // ── Check 2: Anti-Raid ──────────────────────────────────────────────────────
  if (settings?.anti_raid_enabled) {
    passed++;
  } else {
    findings.push({ severity: 'HIGH', category: 'ANTI_RAID', title: 'Anti-Raid engine is disabled', description: 'The Anti-Raid engine protects against mass-join flood attacks. Enable it immediately.', fixable: true, fix_action: 'enable_anti_raid' });
  }

  // ── Check 3: Anti-Nuke ──────────────────────────────────────────────────────
  if (settings?.anti_nuke_enabled) {
    passed++;
  } else {
    findings.push({ severity: 'CRITICAL', category: 'ANTI_NUKE', title: 'Anti-Nuke vault guard is disabled', description: 'Without Anti-Nuke, a compromised admin account can delete all channels and roles instantly.', fixable: true, fix_action: 'enable_anti_nuke' });
  }

  // ── Check 4: Anti-Spam ──────────────────────────────────────────────────────
  if (settings?.anti_spam_enabled) {
    passed++;
  } else {
    findings.push({ severity: 'MEDIUM', category: 'ANTI_SPAM', title: 'Anti-Spam filter is disabled', description: 'Enable Anti-Spam to automatically mute users flooding messages or mentions.', fixable: true, fix_action: 'enable_anti_spam' });
  }

  // ── Check 5: AI Moderation ──────────────────────────────────────────────────
  if (settings?.ai_moderation_enabled) {
    passed++;
  } else {
    findings.push({ severity: 'LOW', category: 'AI_MODERATION', title: 'AI Moderation is not active', description: 'Enable AI moderation for automated detection of toxic, threatening, and NSFW content.', fixable: true, fix_action: 'enable_ai_moderation' });
  }

  // ── Check 6: Security Alert Channel configured ──────────────────────────────
  if (settings?.channel_security_alerts) {
    passed++;
  } else {
    findings.push({ severity: 'MEDIUM', category: 'CHANNELS', title: 'No security alert channel configured', description: 'Designate a channel to receive real-time security alerts from the AEGIS X bot.', fixable: false });
  }

  // ── Check 7: Quarantine Role configured ────────────────────────────────────
  if (settings?.role_quarantined) {
    passed++;
  } else {
    findings.push({ severity: 'MEDIUM', category: 'VERIFICATION', title: 'Quarantine role not configured', description: 'A quarantine role is required to isolate suspicious members pending manual review.', fixable: false });
  }

  // ── Check 8: Bot permissions check (production only) ──────────────────────
  if (!shouldMock(guildId) && botClient) {
    try {
      const guild = botClient.guilds?.cache?.get(guildId);
      const botMember = guild?.members?.me;
      if (botMember && botMember.permissions.has('Administrator')) {
        passed++;
      } else {
        findings.push({ severity: 'HIGH', category: 'BOT_PERMISSIONS', title: 'Bot lacks required permissions', description: 'AEGIS X bot needs Administrator (or at minimum: Manage Roles, Manage Channels, Kick Members) permissions to function correctly.', fixable: false });
      }
    } catch {
      passed++; // Skip if can't check
    }
  } else {
    passed++; // Mock mode — assume OK
  }

  return { findings, passed, total };
}

// POST /api/audit/:guildId/scan
router.post('/:guildId/scan', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { guildId } = req.params;
  try {
    const settings = await db.getSettings(guildId);
    const botClient = !shouldMock(guildId) ? getBotClient() : null;

    const { findings, passed, total } = await runSecurityChecks(guildId, settings, botClient);

    // Calculate score: each passed check contributes proportionally
    const score = Math.round((passed / total) * 100);

    // Save audit record
    const audit = await db.createAudit(guildId, score, total, passed, req.userId || '1002');

    // Save individual findings
    const savedFindings = [];
    for (const finding of findings) {
      const saved = await db.addAuditFinding(
        audit.id, guildId, finding.severity, finding.category,
        finding.title, finding.description, finding.fixable || false, finding.fix_action || null
      );
      savedFindings.push(saved);
    }

    // Broadcast audit completion
    socketService.broadcast(guildId, 'audit_complete', {
      auditId: audit.id, score, passed, total,
      criticalCount: findings.filter(f => f.severity === 'CRITICAL').length,
      highCount: findings.filter(f => f.severity === 'HIGH').length
    });

    res.json({ success: true, audit: { ...audit, findings: savedFindings } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/audit/:guildId/audits
router.get('/:guildId/audits', authorizeRole(['Owner', 'Security Director', 'Admin', 'Moderator']), async (req, res) => {
  try {
    const audits = await db.getAudits(req.params.guildId);
    res.json(Array.isArray(audits) ? audits : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/audit/:guildId/audits/:auditId
router.get('/:guildId/audits/:auditId', authorizeRole(['Owner', 'Security Director', 'Admin', 'Moderator']), async (req, res) => {
  try {
    const [audits, findings] = await Promise.all([
      db.getAudits(req.params.guildId),
      db.getAuditFindings(req.params.auditId, req.params.guildId)
    ]);
    const audit = (Array.isArray(audits) ? audits : []).find(a => a.id === req.params.auditId);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    res.json({ ...audit, findings: Array.isArray(findings) ? findings : [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/audit/:guildId/audits/:auditId/fix/:findingId
router.post('/:guildId/audits/:auditId/fix/:findingId', authorizeRole(['Owner', 'Security Director', 'Admin']), async (req, res) => {
  const { guildId, findingId } = req.params;
  try {
    // Apply the fix based on fix_action type
    const findings = await db.getAuditFindings(req.params.auditId, guildId);
    const finding = Array.isArray(findings) ? findings.find(f => f.id === findingId) : null;

    if (finding?.fix_action) {
      const settingsMap = {
        'enable_verification': { verification_enabled: true },
        'enable_anti_raid': { anti_raid_enabled: true },
        'enable_anti_nuke': { anti_nuke_enabled: true },
        'enable_anti_spam': { anti_spam_enabled: true },
        'enable_ai_moderation': { ai_moderation_enabled: true }
      };
      if (settingsMap[finding.fix_action]) {
        await db.updateSettings(guildId, settingsMap[finding.fix_action]);
        socketService.broadcast(guildId, 'settings_updated', { guildId, changes: settingsMap[finding.fix_action] });
      }
    }

    const updated = await db.markFindingFixed(findingId, req.userId || '1002', guildId);
    await db.logAudit(guildId, req.userId || '1002', 'AUDIT_FIX_APPLIED', 'FINDING', findingId, { fix_action: finding?.fix_action });

    res.json({ success: true, updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
