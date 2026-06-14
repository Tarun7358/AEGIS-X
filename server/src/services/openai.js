const config = require('../config');

const ai = {
  async askBot(prompt, context = '') {
    // Return a clean local system assistant reply
    return `[AEGIS X Local Auditor]: Understood. Based on server context ${context ? `(${context})` : ''}, I suggest reviewing active roles and permissions. Use the emulators to simulate threats and check settings in the Security Shields dashboard.`;
  },

  async auditServer(auditLogs, guildSettings) {
    // A deterministic rules engine to evaluate server safety score
    const issues = [];
    let score = 0;

    if (guildSettings.anti_nuke_enabled) {
      score += 20;
    } else {
      issues.push({ id: 1, severity: 'CRITICAL', message: 'Anti-Nuke protection is currently disabled. Active channels and roles are unprotected.' });
    }

    if (guildSettings.anti_raid_enabled) {
      score += 20;
    } else {
      issues.push({ id: 2, severity: 'HIGH', message: 'Anti-Raid protections are currently offline. Join floods will not be mitigated.' });
    }

    if (guildSettings.anti_spam_enabled) {
      score += 15;
    } else {
      issues.push({ id: 3, severity: 'YELLOW', message: 'Anti-Spam thresholds are not set. Members can spam messages.' });
    }

    if (guildSettings.anti_scam_enabled) {
      score += 15;
    } else {
      issues.push({ id: 4, severity: 'YELLOW', message: 'Anti-Scam filters are inactive. Direct link protection is disabled.' });
    }

    if (guildSettings.anti_phishing_enabled) {
      score += 15;
    } else {
      issues.push({ id: 5, severity: 'YELLOW', message: 'Anti-Phishing database match is disabled.' });
    }

    if (guildSettings.anti_malware_enabled) {
      score += 15;
    } else {
      issues.push({ id: 6, severity: 'GREEN', message: 'Malware upload scanner is disabled.' });
    }

    if (score < 20) score = 20;

    let rating = 'GOOD';
    if (score < 50) {
      rating = 'CRITICAL';
    } else if (score < 80) {
      rating = 'WARNING';
    }

    const recommendations = issues.length > 0 
      ? `To optimize server integrity, enable the following modules: ${issues.map(i => i.message.split(' ')[0]).join(', ')}.`
      : 'All security shield configurations are fully deployed. Standard operational metrics are normal.';

    return {
      score,
      rating,
      issues,
      recommendations
    };
  },

  async summarizeTicket(messages) {
    if (!messages || messages.length === 0) {
      return 'Empty ticket record. No conversation logs detected.';
    }
    const contentText = messages.map(m => m.content).join(' ').toLowerCase();
    let summary = 'A support ticket was handled by AEGIS X staff.';
    if (contentText.includes('webhook')) {
      summary = 'The member requested help with setting up discord webhook integration. Staff guided them on setting up channel permissions.';
    } else if (contentText.includes('role')) {
      summary = 'The member reported an issue with auto-role assignments. The staff adjusted the bot role hierarchy to fix it.';
    } else {
      const lastMessage = messages[messages.length - 1];
      summary = `The ticket was processed by support staff. Last communication: "${lastMessage ? lastMessage.content.substring(0, 60) : ''}..."`;
    }
    return `${summary} Ticket marked closed.`;
  }
};

module.exports = ai;
