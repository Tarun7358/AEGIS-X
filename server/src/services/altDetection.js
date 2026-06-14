/**
 * AEGIS X v2.0 — Alt Detection Engine
 * Detects alt accounts using 4 weighted detection factors.
 */

const { db } = require('./supabase');
const socketService = require('./socket');

// Levenshtein distance for username similarity
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => j === 0 ? i : 0));
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function similarityScore(a, b) {
  if (!a || !b) return 0;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return 1 - dist / Math.max(a.length, b.length);
}

// Extract numeric suffix pattern (e.g. RaidUser01, RaidUser02)
function hasNumericSuffixPattern(names) {
  const base = names.map(n => n.replace(/\d+$/, '').toLowerCase());
  const freq = {};
  base.forEach(b => { freq[b] = (freq[b] || 0) + 1; });
  return Object.values(freq).some(count => count >= 3);
}

const altDetection = {
  /**
   * Evaluate a single member for alt likelihood.
   * @param {string} guildId
   * @param {object} member - { id, username, createdAt, avatarUrl }
   * @param {Array}  recentJoins - last N members who joined this guild
   * @returns {{ riskLevel, score, factors }}
   */
  async detectAlt(guildId, member, recentJoins = []) {
    let score = 0;
    const factors = [];

    // ── Factor 1: Account Age ─────────────────────────────────────────────────
    const ageDays = member.createdAt
      ? Math.floor((Date.now() - new Date(member.createdAt).getTime()) / 86400000)
      : 0;

    if (ageDays < 1) {
      score += 40; factors.push(`account_age_${ageDays}_hours_old`);
    } else if (ageDays < 7) {
      score += 30; factors.push(`account_age_${ageDays}_days`);
    } else if (ageDays < 30) {
      score += 15; factors.push(`account_age_${ageDays}_days`);
    }

    // ── Factor 2: Join Wave Analysis ──────────────────────────────────────────
    // Count members who joined within the last 60 seconds
    const now = Date.now();
    const waveJoins = recentJoins.filter(j =>
      j.id !== member.id && j.joinedAt && (now - new Date(j.joinedAt).getTime()) < 60000
    );
    if (waveJoins.length >= 5) {
      score += 30; factors.push(`joined_wave_of_${waveJoins.length}`);
    } else if (waveJoins.length >= 3) {
      score += 15; factors.push(`joined_wave_of_${waveJoins.length}`);
    }

    // ── Factor 3: Username Similarity ─────────────────────────────────────────
    const recentNames = recentJoins.map(j => j.username).filter(Boolean);

    // Check for numeric suffix pattern
    if (hasNumericSuffixPattern([member.username, ...recentNames])) {
      score += 35; factors.push('numeric_suffix_pattern_detected');
    }

    // Check pairwise similarity against recent joiners
    let maxSimilarity = 0;
    for (const name of recentNames) {
      const sim = similarityScore(member.username, name);
      if (sim > maxSimilarity) maxSimilarity = sim;
    }
    if (maxSimilarity >= 0.85) {
      score += 25; factors.push(`username_similarity_score_${maxSimilarity.toFixed(2)}`);
    } else if (maxSimilarity >= 0.70) {
      score += 12; factors.push(`username_similarity_score_${maxSimilarity.toFixed(2)}`);
    }

    // ── Factor 4: Default / No Avatar ────────────────────────────────────────
    if (!member.avatarUrl && !member.avatar) {
      score += 10; factors.push('default_avatar');
    }

    // ── Determine Risk Level ──────────────────────────────────────────────────
    score = Math.min(score, 100);
    let riskLevel = 'SAFE';
    if (score >= 85)      riskLevel = 'CONFIRMED_ALT';
    else if (score >= 60) riskLevel = 'HIGH_RISK';
    else if (score >= 30) riskLevel = 'SUSPICIOUS';

    console.log(`[Alt Detection] ${member.username}: score=${score} level=${riskLevel} factors=[${factors.join(', ')}]`);

    return { riskLevel, score, factors };
  },

  /**
   * Full pipeline: detect → log → act → broadcast
   */
  async processNewMember(guildId, member, recentJoins = []) {
    const { riskLevel, score, factors } = await this.detectAlt(guildId, member, recentJoins);

    // Only log if suspicious or above
    if (riskLevel === 'SAFE') return { riskLevel, score, factors, action: 'NONE' };

    // Determine auto-action
    let action = 'FLAGGED';
    if (riskLevel === 'CONFIRMED_ALT' || riskLevel === 'HIGH_RISK') {
      action = 'QUARANTINED';
    }

    // Log detection
    await db.logAltDetection(guildId, member.id, member.username, riskLevel, factors, action);

    // Update security metrics
    await db.upsertSecurityMetrics(guildId, { alts_detected: 1 });

    // Broadcast to dashboard
    socketService.broadcast(guildId, 'alt_detected', {
      userId: member.id,
      username: member.username,
      riskLevel,
      score,
      factors,
      action,
      message: `🔍 Alt Detection: ${member.username} flagged as ${riskLevel} (score: ${score})`
    });

    return { riskLevel, score, factors, action };
  },

  /**
   * Manual scan of an existing user against recent guild joiners
   */
  async manualScan(guildId, userId, username, createdAt, avatarUrl, recentJoins) {
    return this.processNewMember(guildId,
      { id: userId, username, createdAt, avatarUrl },
      recentJoins
    );
  }
};

module.exports = altDetection;
