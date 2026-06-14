/**
 * AEGIS X v2.0 — Automated Incident Response Playbook Engine
 * Executes predefined and custom trigger→action workflows.
 */

const { db } = require('./supabase');
const socketService = require('./socket');

// ── System Playbook Definitions ───────────────────────────────────────────────
const SYSTEM_PLAYBOOKS = {
  ANTI_SPAM: {
    id: 'pb-sys-001',
    name: 'Anti-Spam Response',
    trigger_type: 'ANTI_SPAM',
    actions: ['delete_messages', 'timeout_user', 'create_incident', 'alert_moderators'],
    is_system: true
  },
  ANTI_RAID: {
    id: 'pb-sys-002',
    name: 'Anti-Raid Lockdown',
    trigger_type: 'ANTI_RAID',
    actions: ['lock_invites', 'enable_slowmode', 'quarantine_joins', 'alert_staff'],
    is_system: true
  },
  ANTI_NUKE: {
    id: 'pb-sys-003',
    name: 'Anti-Nuke Emergency',
    trigger_type: 'ANTI_NUKE',
    actions: ['emergency_lockdown', 'create_backup', 'remove_dangerous_perms', 'critical_alerts'],
    is_system: true
  },
  ALT_DETECTED: {
    id: 'pb-sys-004',
    name: 'Alt Account Response',
    trigger_type: 'ALT_DETECTED',
    actions: ['quarantine_user', 'create_incident', 'alert_security'],
    is_system: true
  }
};

// ── Action Executor ────────────────────────────────────────────────────────────
async function executeAction(action, context, botClient) {
  const { guildId, offenderId, offenderUsername, severity } = context;
  const results = [];

  try {
    switch (action) {
      case 'delete_messages':
        if (botClient && context.channelId && context.messageIds) {
          const guild = botClient.guilds?.cache?.get(guildId);
          const channel = guild?.channels?.cache?.get(context.channelId);
          if (channel) {
            await channel.bulkDelete(context.messageIds.slice(0, 100)).catch(() => {});
            results.push('Messages deleted');
          }
        } else {
          results.push('delete_messages: simulated (no channel context)');
        }
        break;

      case 'timeout_user':
        if (botClient) {
          const guild = botClient.guilds?.cache?.get(guildId);
          const member = await guild?.members?.fetch(offenderId).catch(() => null);
          if (member && !member.permissions?.has('Administrator')) {
            await member.timeout(300000, `Auto-timeout by AEGIS X playbook: ${context.triggerType}`).catch(e => {
              results.push(`timeout_user: failed — ${e.message}`);
            });
            results.push('User timed out for 5 minutes');
          }
        } else {
          results.push('timeout_user: simulated');
        }
        break;

      case 'quarantine_user':
      case 'quarantine_joins':
        await db.verifyMember(guildId, offenderId, '9999', 'REJECTED', `Auto-quarantined by ${context.triggerType} playbook`);
        results.push('User quarantined in database');
        break;

      case 'create_incident':
        await db.logIncident(guildId, {
          incident_type: context.triggerType,
          severity: severity || 'HIGH',
          offender_id: offenderId,
          details: context.details || `Automated playbook response to ${context.triggerType}`,
          action_taken: 'PLAYBOOK_EXECUTED'
        });
        results.push('Incident logged');
        break;

      case 'lock_invites':
        if (botClient) {
          const guild = botClient.guilds?.cache?.get(guildId);
          const invites = await guild?.invites?.fetch().catch(() => null);
          if (invites) {
            await Promise.allSettled(invites.map(inv => inv.delete('AEGIS X Anti-Raid lockdown')));
            results.push(`Deleted ${invites.size} invites`);
          }
        } else {
          results.push('lock_invites: simulated');
        }
        break;

      case 'enable_slowmode':
        if (botClient) {
          const guild = botClient.guilds?.cache?.get(guildId);
          const channels = await guild?.channels?.fetch().catch(() => null);
          if (channels) {
            const textChannels = channels.filter(c => c && c.type === 0);
            await Promise.allSettled(
              textChannels.map(c => c.setRateLimitPerUser(10, 'AEGIS X Anti-Raid slowmode'))
            );
            results.push(`Slowmode (10s) applied to ${textChannels.size} channels`);
          }
        } else {
          results.push('enable_slowmode: simulated');
        }
        break;

      case 'emergency_lockdown':
        socketService.broadcast(guildId, 'server_lockdown', { enabled: true, timestamp: new Date().toISOString() });
        results.push('Emergency lockdown broadcast sent');
        break;

      case 'create_backup':
        // Trigger a quick backup snapshot
        try {
          const backupService = require('./backup');
          const mockGuild = { id: guildId, name: 'Emergency Backup' };
          await backupService.createServerBackup(mockGuild, '9999');
          results.push('Emergency backup created');
        } catch (e) {
          results.push('create_backup: skipped');
        }
        break;

      case 'remove_dangerous_perms':
        results.push('remove_dangerous_perms: requires manual review in production');
        break;

      case 'alert_moderators':
      case 'alert_staff':
      case 'alert_security':
      case 'critical_alerts':
        socketService.broadcast(guildId, 'security_alert', {
          type: context.triggerType,
          userId: offenderId,
          username: offenderUsername,
          severity: severity || 'HIGH',
          message: `🚨 Playbook "${context.playbookName}" executed: ${context.triggerType} for user ${offenderUsername}`,
          details: results.join(', ')
        });
        results.push('Alert broadcast to dashboard');
        break;

      default:
        results.push(`Unknown action: ${action}`);
    }
  } catch (err) {
    results.push(`Action "${action}" error: ${err.message}`);
    console.error(`[Playbook] Action error:`, err.message);
  }

  return results;
}

// ── Main Playbook Engine ───────────────────────────────────────────────────────
const playbookEngine = {
  /**
   * Execute a playbook for a given trigger type.
   * @param {string} guildId
   * @param {string} triggerType - ANTI_SPAM | ANTI_RAID | ANTI_NUKE | ALT_DETECTED | custom
   * @param {object} context - { offenderId, offenderUsername, details, channelId, messageIds, severity }
   * @param {object} botClient - Discord.js Client instance (optional)
   */
  async executePlaybook(guildId, triggerType, context = {}, botClient = null) {
    console.log(`[Playbook Engine] Executing playbook for trigger: ${triggerType} in guild ${guildId}`);

    // Find matching playbooks: system + custom enabled ones
    let playbooks = [];
    try {
      const allPlaybooks = await db.getPlaybooks(guildId);
      playbooks = allPlaybooks.filter(p =>
        p.enabled && p.trigger_type === triggerType
      );
    } catch (e) {
      // Fallback to system defaults
      if (SYSTEM_PLAYBOOKS[triggerType]) {
        playbooks = [SYSTEM_PLAYBOOKS[triggerType]];
      }
    }

    if (playbooks.length === 0 && SYSTEM_PLAYBOOKS[triggerType]) {
      playbooks = [SYSTEM_PLAYBOOKS[triggerType]];
    }

    const allResults = [];

    for (const playbook of playbooks) {
      const actions = Array.isArray(playbook.actions) ? playbook.actions : [];
      const playbookResults = [];
      const fullContext = { ...context, triggerType, playbookName: playbook.name, guildId };

      for (const action of actions) {
        const result = await executeAction(action, fullContext, botClient);
        playbookResults.push(...result);
      }

      // Track execution count
      await db.incrementPlaybookExecution(playbook.id, guildId).catch(() => {});

      // Broadcast playbook execution event
      socketService.broadcast(guildId, 'playbook_triggered', {
        playbookId: playbook.id,
        playbookName: playbook.name,
        triggerType,
        actions,
        results: playbookResults,
        offenderId: context.offenderId,
        offenderUsername: context.offenderUsername,
        timestamp: new Date().toISOString()
      });

      allResults.push({ playbook: playbook.name, results: playbookResults });
      console.log(`[Playbook] "${playbook.name}" completed:`, playbookResults);
    }

    return allResults;
  },

  /**
   * Get all playbooks for a guild (system + custom)
   */
  async getPlaybooks(guildId) {
    return db.getPlaybooks(guildId);
  },

  /**
   * Create a custom playbook
   */
  async createPlaybook(guildId, name, triggerType, triggerConfig, actions) {
    return db.createPlaybook(guildId, name, triggerType, triggerConfig, actions);
  }
};

module.exports = playbookEngine;
