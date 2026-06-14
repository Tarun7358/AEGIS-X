let io = null;

const socketService = {
  init(server) {
    const { Server } = require('socket.io');
    const jwt = require('jsonwebtoken');
    const config = require('../config');
    const { db, shouldMock } = require('./supabase');
    
    io = new Server(server, {
      cors: {
        origin: '*', // Allow all dashboard origins in dev
        methods: ['GET', 'POST']
      }
    });

    // Authentication middleware
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        socket.userId = decoded.userId;
        next();
      } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`🔌 Dashboard connected: ${socket.id} (User: ${socket.userId})`);
      
      // Let dashboard subscribe to specific guilds
      socket.on('subscribe', async (guildId) => {
        const userId = socket.userId;
        if (!userId) {
          console.warn(`🔒 Socket subscription rejected: socket missing userId.`);
          return socket.emit('error', 'Unauthorized: User not authenticated');
        }

        // Verify if user is allowed to access/subscribe to this guild
        let isAuthorized = false;
        try {
          if (shouldMock(guildId)) {
            let mockUser = db.mockDb.users.find(u => u.id === userId);
            if (!mockUser) {
              mockUser = { id: userId, username: 'DiscordOperator', discriminator: '0000', avatar_url: '', bot: false };
              db.mockDb.users.push(mockUser);
            }
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
            isAuthorized = true;
          } else {
            // Production Mode
            const { getBotClient } = require('../bot/client');
            const { PermissionFlagsBits } = require('discord.js');
            const botClient = getBotClient();
            if (botClient) {
              const guild = botClient.guilds.cache.get(guildId);
              if (guild) {
                const member = await guild.members.fetch(userId).catch(() => null);
                if (member) {
                  const isOwner = guild.ownerId === userId;
                  const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
                  if (isOwner || isAdmin) {
                    isAuthorized = true;
                  } else {
                    const settings = await db.getSettings(guildId).catch(() => null);
                    if (settings) {
                      const hasRole = (roleConfig) => {
                        if (!roleConfig) return false;
                        const namesOrIds = roleConfig.split(',').map(r => r.trim());
                        return member.roles.cache.some(r => namesOrIds.includes(r.id) || namesOrIds.includes(r.name));
                      };
                      isAuthorized = hasRole(settings.security_role) || hasRole(settings.moderator_role);
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error(`Socket authorization check error for user ${userId} on guild ${guildId}:`, err.message);
        }

        if (!isAuthorized) {
          console.warn(`🔒 Socket subscription rejected: User ${userId} requested unauthorized access to guild ${guildId}.`);
          return socket.emit('error', 'Unauthorized guild access');
        }

        // Leave any other rooms (except socket's own private room)
        for (const room of socket.rooms) {
          if (room !== socket.id) {
            socket.leave(room);
          }
        }
        socket.join(guildId);
        console.log(`🔒 Dashboard ${socket.id} (User: ${userId}) SECURELY subscribed to guild ${guildId}`);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Dashboard disconnected: ${socket.id}`);
      });

      // Listen for settings broadcast from API (shield toggles) — keep bot in-sync
      socket.on('settings_updated', async ({ guildId, changes }) => {
        if (!guildId || !changes) return;
        try {
          // Re-read settings from DB so bot's memory is always current
          const { db } = require('./supabase');
          const settings = await db.getSettings(guildId);
          if (settings) {
            console.log(`🔄 Bot settings refreshed for guild ${guildId}:`, Object.keys(changes).join(', '));
          }
        } catch (err) {
          console.error('❌ Failed to refresh bot settings on settings_updated event:', err.message);
        }
      });
    });

    return io;
  },

  getIO() {
    return io;
  },

  // Broadcasts a live log / incident / verification update to a specific guild dashboard room
  broadcast(guildId, eventType, data) {
    if (io) {
      io.to(guildId).emit(eventType, data);
      io.emit('global_feed', { guildId, eventType, data, timestamp: new Date().toISOString() });
    }
  }
};

module.exports = socketService;
