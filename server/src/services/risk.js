const { db } = require('./supabase');
const socketService = require('./socket');

const riskEngine = {
  // Evaluates a user and returns their risk score and level
  async evaluateMember(guildId, member) {
    let score = 10; // Default base score
    const details = [];

    // 1. Account Age Risk
    const accountAgeDays = Math.floor((Date.now() - member.createdAt) / (1000 * 60 * 60 * 24));
    if (accountAgeDays < 1) {
      score += 50;
      details.push('Extremely New Account (less than 24 hours)');
    } else if (accountAgeDays < 7) {
      score += 30;
      details.push('New Account (less than 7 days)');
    } else if (accountAgeDays < 30) {
      score += 15;
      details.push('Recent Account (less than 30 days)');
    }

    // 2. Suspicious Username Check
    const username = member.username.toLowerCase();
    const suspiciousPatterns = ['nitro', 'free', 'gift', 'airdrop', 'claim', 'steam', 'discord', 'mod', 'admin', 'hacks', 'leak'];
    const matchedPatterns = suspiciousPatterns.filter(pattern => username.includes(pattern));
    if (matchedPatterns.length > 0) {
      score += 25 * matchedPatterns.length;
      details.push(`Suspicious Username Keywords matched: ${matchedPatterns.join(', ')}`);
    }

    // 3. Avatar Check
    if (!member.avatarUrl && !member.avatar) {
      score += 10;
      details.push('Default Avatar');
    }

    // 4. Previous Threat History / Violations
    try {
      const historicalProfile = await db.getThreatScore(guildId, member.id);
      if (historicalProfile && historicalProfile.score > 0) {
        score += Math.floor(historicalProfile.score * 0.3); // Add 30% of their highest threat score
        details.push(`Historical risk multiplier: +${Math.floor(historicalProfile.score * 0.3)}`);
      }
    } catch (err) {
      console.warn('Could not check historical threat score:', err.message);
    }

    // Cap the risk score at 100
    score = Math.min(score, 100);

    // Determine Threat Level
    let level = 'GREEN';
    if (score >= 80) level = 'RED';
    else if (score >= 60) level = 'ORANGE';
    else if (score >= 30) level = 'YELLOW';

    // Log the Threat Score
    await db.updateThreatScore(guildId, member.id, score, level, details.join('; '));

    return {
      score,
      level,
      details: details.join(', ') || 'No risk indicators detected.'
    };
  },

  // Perform automated action based on risk level
  async executeRiskMitigation(guild, member, riskResult) {
    const guildId = guild.id;
    const { score, level, details } = riskResult;

    console.log(`[Risk Engine] Mitigating threat level ${level} (score: ${score}) for member ${member.username} (${member.id})`);

    // Log the join
    await db.logAudit(guildId, '9999', 'MEMBER_RISK_EVALUATION', 'USER', member.id, {
      username: member.username,
      score,
      level,
      details
    });

    if (level === 'RED') {
      // 🚨 RED ALERT: Auto-Quarantine and Notify
      await db.logIncident(guildId, {
        incident_type: 'ANTI_RAID',
        severity: 'CRITICAL',
        offender_id: member.id,
        details: `Auto-Quarantined member. Reason: ${details}`,
        action_taken: 'QUARANTINE_ROLE_ASSIGNMENT'
      });

      // Assign Quarantine role in database
      await db.verifyMember(guildId, member.id, '9999', 'REJECTED', `Auto-Quarantined. Risk Score: ${score}. Details: ${details}`);
      
      // Send WebSocket Alert to dashboard
      socketService.broadcast(guildId, 'security_alert', {
        type: 'AUTO_QUARANTINE',
        userId: member.id,
        username: member.username,
        score,
        level,
        details,
        message: `🚨 Critical Risk Member Quarantined: ${member.username} (Score: ${score})`
      });

      return 'QUARANTINED';
    } 
    
    if (level === 'ORANGE') {
      // ⚠️ ORANGE: Route to Verification queue with Manual Review status
      await db.addToVerificationQueue(guildId, member.id, score, level, 'IMAGE', 'verification_captcha');
      await db.verifyMember(guildId, member.id, '9999', 'MANUAL_REVIEW', `Flagged for Staff Audit. Risk Score: ${score}. Reason: ${details}`);
      
      socketService.broadcast(guildId, 'verification_update', {
        type: 'MANUAL_REVIEW',
        userId: member.id,
        username: member.username,
        score,
        level,
        details
      });

      return 'MANUAL_REVIEW';
    }

    // GREEN / YELLOW: Standard Verification CAPTCHA
    const captchaText = Math.random().toString(36).substring(2, 8).toUpperCase();
    await db.addToVerificationQueue(guildId, member.id, score, level, 'TEXT', captchaText);
    
    socketService.broadcast(guildId, 'verification_update', {
      type: 'PENDING_CAPTCHA',
      userId: member.id,
      username: member.username,
      score,
      level,
      captchaType: 'TEXT'
    });

    return 'PENDING_CAPTCHA';
  }
};

module.exports = riskEngine;
