/**
 * AEGIS X v2.0 — Member Join Screening Pipeline
 * Every new member flows through a 4-step evaluation before gaining access.
 */

const riskEngine = require('./risk');
const altDetection = require('./altDetection');
const { db, shouldMock, client: supabaseClient } = require('./supabase');
const socketService = require('./socket');

const joinScreening = {
  /**
   * Full screening pipeline for a newly joined member.
   * 
   * Pipeline steps:
   *   1. Risk Engine   → threat score + level
   *   2. Alt Detection → alt likelihood
   *   3. Settings check→ what is required (verification, age gate, etc.)
   *   4. Decision      → VERIFIED | PENDING | QUARANTINED | REJECTED
   * 
   * @param {string} guildId
   * @param {object} member - { id, username, createdAt, avatarUrl }
   * @param {Array}  recentJoins - other recently joined members for wave analysis
   * @param {object} botClient - Discord.js Client (optional, for bot actions)
   */
  async screenMember(guildId, member, recentJoins = [], botClient = null) {
    const pipelineLog = [];
    let decision = 'PENDING';

    // ── Step 1: Risk Engine ────────────────────────────────────────────────────
    let riskResult = { score: 10, level: 'GREEN', details: 'No risk indicators detected.' };
    try {
      riskResult = await riskEngine.evaluateMember(guildId, member);
      pipelineLog.push({
        step: 'RISK_ENGINE',
        result: `score:${riskResult.score} level:${riskResult.level}`,
        detail: riskResult.details
      });
      console.log(`[Join Screening] ${member.username} — Risk: ${riskResult.level} (${riskResult.score})`);
    } catch (err) {
      pipelineLog.push({ step: 'RISK_ENGINE', result: 'ERROR', detail: err.message });
      console.error('[Join Screening] Risk engine error:', err.message);
    }

    // ── Step 2: Alt Detection ─────────────────────────────────────────────────
    let altResult = { riskLevel: 'SAFE', score: 0, factors: [], action: 'NONE' };
    try {
      altResult = await altDetection.processNewMember(guildId, member, recentJoins);
      pipelineLog.push({
        step: 'ALT_DETECTION',
        result: altResult.riskLevel,
        detail: altResult.factors.join(', ') || 'No alt indicators'
      });
      console.log(`[Join Screening] ${member.username} — Alt: ${altResult.riskLevel}`);
    } catch (err) {
      pipelineLog.push({ step: 'ALT_DETECTION', result: 'ERROR', detail: err.message });
      console.error('[Join Screening] Alt detection error:', err.message);
    }

    // ── Step 3: Guild Settings ────────────────────────────────────────────────
    let settings = null;
    try {
      settings = await db.getSettings(guildId);
    } catch (err) {
      console.error('[Join Screening] Settings fetch error:', err.message);
    }

    // Account age gate
    const ageDays = member.createdAt
      ? Math.floor((Date.now() - new Date(member.createdAt).getTime()) / 86400000)
      : 0;
    const minAccountAge = settings?.min_account_age_days || 0;
    if (minAccountAge > 0 && ageDays < minAccountAge) {
      pipelineLog.push({
        step: 'AGE_GATE',
        result: 'FAILED',
        detail: `Account is ${ageDays} days old, minimum required: ${minAccountAge}`
      });
    } else if (minAccountAge > 0) {
      pipelineLog.push({ step: 'AGE_GATE', result: 'PASSED', detail: `Account age: ${ageDays} days` });
    }

    // ── Step 4: Decision Engine ───────────────────────────────────────────────
    if (riskResult.level === 'RED' || altResult.riskLevel === 'CONFIRMED_ALT' || altResult.riskLevel === 'HIGH_RISK') {
      decision = 'QUARANTINED';
    } else if (riskResult.level === 'ORANGE' || altResult.riskLevel === 'SUSPICIOUS') {
      decision = 'PENDING';
    } else if (settings?.verification_enabled) {
      decision = 'PENDING';
    } else {
      decision = 'VERIFIED';
    }

    pipelineLog.push({ step: 'DECISION', result: decision });

    // ── Execute Decision via Bot ───────────────────────────────────────────────
    await this._applyDecision(guildId, member, decision, settings, botClient);

    // ── Log Screening Record ──────────────────────────────────────────────────
    try {
      await db.logJoinScreening(
        guildId, member.id, member.username,
        riskResult.score, altResult.riskLevel, decision, pipelineLog
      );
    } catch (err) {
      console.error('[Join Screening] Log error:', err.message);
    }

    // ── Update Metrics ────────────────────────────────────────────────────────
    const metricsUpdate = { verifications_processed: 1 };
    if (decision === 'QUARANTINED') metricsUpdate.members_quarantined = 1;
    if (decision === 'REJECTED') metricsUpdate.members_kicked = 1;
    await db.upsertSecurityMetrics(guildId, metricsUpdate).catch(() => {});

    // ── Broadcast Result ──────────────────────────────────────────────────────
    socketService.broadcast(guildId, 'join_screening_result', {
      userId: member.id,
      username: member.username,
      decision,
      riskScore: riskResult.score,
      riskLevel: riskResult.level,
      altRisk: altResult.riskLevel,
      pipelineLog,
      message: `👤 Join Screening: ${member.username} → ${decision}`
    });

    console.log(`[Join Screening] Final decision for ${member.username}: ${decision}`);
    return { decision, riskResult, altResult, pipelineLog };
  },

  /**
   * Apply the screening decision via bot or database.
   */
  async _applyDecision(guildId, member, decision, settings, botClient) {
    if (decision === 'VERIFIED') {
      // Assign verified role + autorole
      if (botClient) {
        try {
          const guild = botClient.guilds?.cache?.get(guildId);
          if (guild) {
            const discordMember = await guild.members.fetch(member.id).catch(() => null);
            if (discordMember) {
              // Assign verification role
              const verifiedRoleName = settings?.role_verified || 'Verified';
              const verifiedRole = guild.roles.cache.find(r => r.name === verifiedRoleName);
              if (verifiedRole) await discordMember.roles.add(verifiedRole).catch(() => {});

              // Autorole
              if (settings?.autorole_enabled && settings?.autorole_roles) {
                const roleNames = settings.autorole_roles.split(',').map(r => r.trim());
                const roles = guild.roles.cache.filter(r => roleNames.includes(r.name) || roleNames.includes(r.id));
                if (roles.size > 0) await discordMember.roles.add(roles).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.error('[Join Screening] Bot role assignment error:', err.message);
        }
      }
      // Mark as verified in DB
      await db.verifyMember(guildId, member.id, '9999', 'AUTO_APPROVED', 'Auto-verified by Join Screening pipeline').catch(() => {});

    } else if (decision === 'QUARANTINED') {
      // Assign quarantine role
      if (botClient) {
        try {
          const guild = botClient.guilds?.cache?.get(guildId);
          const discordMember = await guild?.members?.fetch(member.id).catch(() => null);
          if (discordMember && settings?.role_quarantined) {
            const qRole = guild.roles.cache.find(r => r.name === settings.role_quarantined);
            if (qRole) await discordMember.roles.add(qRole).catch(() => {});
          }
        } catch (err) {
          console.error('[Join Screening] Quarantine role assignment error:', err.message);
        }
      }
      if (shouldMock(guildId)) {
        const { mockDb } = require('./supabase');
        if (mockDb.user_profiles[member.id]) {
          mockDb.user_profiles[member.id].is_quarantined = true;
        }
      } else {
        try {
          await supabaseClient.from('user_profiles').update({ is_quarantined: true }).eq('user_id', member.id).eq('guild_id', guildId);
        } catch (e) {}
      }
      await db.logIncident(guildId, {
        incident_type: 'QUARANTINE',
        severity: 'HIGH',
        offender_id: member.id,
        details: `Quarantined newly joined suspect member: Risk Level RED or ALT detected.`,
        action_taken: 'QUARANTINED'
      });
      await db.verifyMember(guildId, member.id, '9999', 'REJECTED', 'Auto-quarantined by Join Screening pipeline').catch(() => {});

    } else if (decision === 'REJECTED') {
      // Kick the member
      if (botClient) {
        try {
          const guild = botClient.guilds?.cache?.get(guildId);
          const discordMember = await guild?.members?.fetch(member.id).catch(() => null);
          if (discordMember) await discordMember.kick('AEGIS X Join Screening: Auto-rejected').catch(() => {});
        } catch (err) {
          console.error('[Join Screening] Kick error:', err.message);
        }
      }

    } else if (decision === 'PENDING') {
      // Add to verification queue
      const captcha = Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.addToVerificationQueue(guildId, member.id, 0, 'YELLOW', 'TEXT', captcha).catch(() => {});
    }
  },

  /**
   * Get screening history for a guild
   */
  async getScreeningLog(guildId, limit = 50) {
    return db.getJoinScreenings(guildId, limit);
  }
};

module.exports = joinScreening;
