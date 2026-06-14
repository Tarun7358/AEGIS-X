const express = require('express');
const router = express.Router();
const { db, client: supabaseClient, shouldMock } = require('../../services/supabase');
const ai = require('../../services/openai');
const socketService = require('../../services/socket');
const config = require('../../config');
const { authorizeRole, getUserId } = require('../middleware/auth');

// Helper to check role for a ticket
const verifyTicketAccess = async (req, res, allowedRoles) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized.' });
    return null;
  }

  // Get ticket to find guildId
  let guildId = null;
  if (shouldMock(req.params.ticketId)) {
    const ticket = db.mockDb.tickets.find(t => t.id === req.params.ticketId);
    if (ticket) guildId = ticket.guild_id;
  } else if (supabaseClient) {
    const { data } = await supabaseClient.from('tickets').select('guild_id').eq('id', req.params.ticketId).maybeSingle();
    if (data) guildId = data.guild_id;
  }

  if (!guildId) {
    res.status(404).json({ error: 'Ticket or Guild not found.' });
    return null;
  }

  // Perform role authorization
  let role = 'Member';
  if (shouldMock(guildId)) {
    const guild = db.mockDb.guilds.find(g => g.id === guildId);
    if (guild && guild.owner_id === userId) {
      role = 'Owner';
    } else {
      const membership = db.mockDb.memberships.find(m => m.user_id === userId && m.guild_id === guildId);
      if (membership) role = membership.role;
    }
  } else {
    // In production mode, perform live Discord permission checks
    try {
      const { getBotClient } = require('../../bot/client');
      const { PermissionFlagsBits } = require('discord.js');
      const botClient = getBotClient();
      if (botClient) {
        const guild = botClient.guilds.cache.get(guildId);
        if (guild) {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (member) {
            const isOwner = guild.ownerId === userId;
            const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
            if (isOwner) {
              role = 'Owner';
            } else if (isAdmin) {
              role = 'Admin';
            } else {
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
          }
        }
      }
    } catch (err) {
      console.error('Error resolving role for ticket access check:', err.message);
    }
  }

  if (role === 'Owner' || allowedRoles.includes(role)) {
    return { userId, guildId, role };
  }

  res.status(403).json({ error: `Forbidden: Access denied. Current role: ${role}. Required: [${allowedRoles.join(', ')}]` });
  return null;
};

// GET /api/tickets/guild/:guildId
router.get('/guild/:guildId', authorizeRole(['Owner', 'Admin', 'Security Director', 'Moderator', 'Support']), async (req, res) => {
  try {
    const tickets = await db.getTickets(req.params.guildId);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tickets/:ticketId/messages
router.get('/:ticketId/messages', async (req, res) => {
  try {
    const access = await verifyTicketAccess(req, res, ['Owner', 'Admin', 'Security Director', 'Moderator', 'Support']);
    if (!access) return;

    const messages = await db.getTicketMessages(req.params.ticketId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tickets/:ticketId/messages
router.post('/:ticketId/messages', async (req, res) => {
  const { senderId, content } = req.body;
  try {
    const access = await verifyTicketAccess(req, res, ['Owner', 'Admin', 'Security Director', 'Moderator', 'Support']);
    if (!access) return;

    const message = await db.logTicketMessage(req.params.ticketId, senderId || access.userId, content);
    
    // Broadcast message to dashboard socket room
    socketService.broadcast(access.guildId, 'ticket_message', {
      ticketId: req.params.ticketId,
      message: {
        ...message,
        sender: { id: senderId || access.userId, username: senderId === '1002' ? 'ShadowBlade' : 'User' }
      }
    });

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tickets/:ticketId/close
router.post('/:ticketId/close', async (req, res) => {
  try {
    const access = await verifyTicketAccess(req, res, ['Owner', 'Admin', 'Security Director', 'Moderator', 'Support']);
    if (!access) return;

    const ticket = await db.closeTicket(req.params.ticketId);
    
    // Get messages for AI summary
    const messages = await db.getTicketMessages(req.params.ticketId);
    const summary = await ai.summarizeTicket(messages);

    // Save summary into ticket notes/transcripts
    if (shouldMock(req.params.ticketId)) {
      const idx = db.mockDb.tickets.findIndex(t => t.id === req.params.ticketId);
      if (idx !== -1) {
        db.mockDb.tickets[idx].transcript_url = summary;
      }
    }

    socketService.broadcast(access.guildId, 'ticket_update', {
      ticketId: req.params.ticketId,
      status: 'CLOSED',
      summary
    });

    res.json({ success: true, ticket, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
