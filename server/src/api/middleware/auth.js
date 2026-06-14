const jwt = require('jsonwebtoken');
const config = require('../../config');
const { db, shouldMock } = require('../../services/supabase');

// Extract user ID from authorization header
const getUserId = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    return decoded.userId;
  } catch {
    return null;
  }
};

const getAccessToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    return decoded.accessToken;
  } catch {
    return null;
  }
};

// Middleware to verify user is authenticated
const requireAuth = (req, res, next) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
  }
  req.userId = userId;
  next();
};

// Middleware to verify user role on target guild
const authorizeRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const guildId = req.params.guildId || req.params.id;
      const userId = getUserId(req) || req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
      }

      req.userId = userId;

      if (shouldMock(guildId)) {
        let guild = db.mockDb.guilds.find(g => g.id === guildId);
        if (!guild) {
          guild = { id: guildId, name: 'Active Console Workspace', owner_id: userId, member_count: 5, bot_status: 'ONLINE', premium_enabled: false };
          db.mockDb.guilds.push(guild);
          if (!db.mockDb.guild_settings[guildId]) {
            db.mockDb.guild_settings[guildId] = {
              guild_id: guildId,
              prefix: '!',
              role_owner: 'Owner',
              role_admin: 'Admin',
              role_security_director: 'Security Director',
              role_moderator: 'Moderator',
              anti_nuke_enabled: true,
              anti_raid_enabled: true,
              anti_spam_enabled: true,
              anti_scam_enabled: true,
              verification_enabled: true
            };
          }
        }

        // Determine user's role on this guild
        let role = 'Owner';
        if (guild.owner_id !== userId) {
          const membership = db.mockDb.memberships.find(m => m.user_id === userId && m.guild_id === guildId);
          if (membership) {
            role = membership.role;
          } else {
            role = 'Admin';
          }
        }

        req.userRole = role;

        // Owner bypasses all restrictions, otherwise check allowedRoles
        if (role === 'Owner' || allowedRoles.includes(role)) {
          return next();
        }

        return res.status(403).json({ 
          error: `Forbidden: Access denied. Current role: ${role}. Required: [${allowedRoles.join(', ')}]` 
        });
      }

      // Real Mode: check user roles in Supabase user_profiles/Discord guild membership
      const { getBotClient } = require('../../bot/client');
      const { PermissionFlagsBits } = require('discord.js');
      const botClient = getBotClient();
      if (!botClient) {
        return res.status(500).json({ error: 'Discord bot client is not initialized.' });
      }

      const guild = botClient.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Guild not found or bot not in guild.' });
      }

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return res.status(403).json({ error: 'Forbidden: You are not a member of this guild.' });
      }

      const isOwner = guild.ownerId === userId;
      const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

      let role = 'Member';
      if (isOwner) {
        role = 'Owner';
      } else if (isAdmin) {
        role = 'Admin';
      } else {
        // Fetch guild settings from DB to check custom moderator/security roles
        const settings = await db.getSettings(guildId).catch(() => null);
        if (settings) {
          const hasRole = (roleConfig) => {
            if (!roleConfig) return false;
            const namesOrIds = roleConfig.split(',').map(r => r.trim());
            return member.roles.cache.some(r => namesOrIds.includes(r.id) || namesOrIds.includes(r.name));
          };
          if (hasRole(settings.security_role)) {
            role = 'Security Director';
          } else if (hasRole(settings.moderator_role)) {
            role = 'Moderator';
          }
        }
      }

      req.userRole = role;

      if (role === 'Owner' || allowedRoles.includes(role)) {
        return next();
      }

      return res.status(403).json({ 
        error: `Forbidden: Access denied. Current role: ${role}. Required: [${allowedRoles.join(', ')}]` 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};

module.exports = {
  getUserId,
  getAccessToken,
  requireAuth,
  authorizeRole
};
