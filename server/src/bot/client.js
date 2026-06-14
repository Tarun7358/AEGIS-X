const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('../config');
const { db, client: supabaseClient, shouldMock } = require('../services/supabase');
const socketService = require('../services/socket');
const riskEngine = require('../services/risk');
const playbookEngine = require('../services/playbooks');
const joinScreening = require('../services/joinScreening');

function formatAnnouncement(template, member, guild, memberCount) {
  if (!template) return '';
  const username = member.username || member.user?.username || '';
  const memberId = member.id || '';
  const guildName = guild.name || '';
  return template
    .replace(/\[user\]/g, `<@${memberId}>`)
    .replace(/\[username\]/g, username)
    .replace(/\[server\]/g, guildName)
    .replace(/\[membercount\]/g, memberCount);
}

function buildDiscordEmbed(embedConfig, member, guild, memberCount) {
  if (!embedConfig || !embedConfig.enabled) return null;
  const embed = {};
  
  if (embedConfig.title) {
    embed.title = formatAnnouncement(embedConfig.title, member, guild, memberCount);
  }
  if (embedConfig.title_url) {
    embed.url = embedConfig.title_url;
  }
  if (embedConfig.description) {
    embed.description = formatAnnouncement(embedConfig.description, member, guild, memberCount);
  }
  if (embedConfig.color) {
    try {
      const hex = embedConfig.color.replace('#', '');
      embed.color = parseInt(hex, 16);
    } catch (e) {
      embed.color = 15102754; // orange
    }
  }
  if (embedConfig.author_name) {
    embed.author = {
      name: formatAnnouncement(embedConfig.author_name, member, guild, memberCount)
    };
    if (embedConfig.author_icon) {
      embed.author.icon_url = embedConfig.author_icon;
    }
  }
  if (embedConfig.thumbnail_url) {
    embed.thumbnail = {
      url: embedConfig.thumbnail_url
    };
  }
  if (embedConfig.image_url) {
    embed.image = {
      url: embedConfig.image_url
    };
  }
  if (embedConfig.footer_text) {
    embed.footer = {
      text: formatAnnouncement(embedConfig.footer_text, member, guild, memberCount)
    };
    if (embedConfig.footer_icon) {
      embed.footer.icon_url = embedConfig.footer_icon;
    }
  }
  if (embedConfig.fields && Array.isArray(embedConfig.fields)) {
    embed.fields = embedConfig.fields.map(f => ({
      name: formatAnnouncement(f.name || '', member, guild, memberCount),
      value: formatAnnouncement(f.value || '', member, guild, memberCount),
      inline: !!f.inline
    }));
  }
  return embed;
}

let botClient = null;

// Mock Client for Local Development
class MockDiscordClient {
  constructor() {
    this.user = { id: '99999999999999999', username: 'AEGIS X Bot', discriminator: '0000', tag: 'AEGIS X Bot#0000' };
    this.guilds = {
      cache: new Collection([
        ['123456789012345678', { id: '123456789012345678', name: 'AEGIS X HQ', memberCount: 1245 }]
      ])
    };
    this.commands = new Collection();
  }

  async login(token) {
    console.log('🤖 [Mock Bot] Successfully simulated login.');
    this.startSimulation();
    return token;
  }

  // Helper to trigger simulated events from REST API or Dashboard
  async simulateMemberJoin(guildId, username, ageDays = 5) {
    console.log(`🤖 [Mock Bot] Simulating join of user ${username} on guild ${guildId}...`);
    
    // Create a mock user object
    const mockUserId = `mock-${Math.random().toString(36).substr(2, 9)}`;
    const mockUser = {
      id: mockUserId,
      username,
      createdAt: Date.now() - (ageDays * 24 * 60 * 60 * 1000),
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
    };

    if (shouldMock(guildId)) {
      // Store in mock db
      db.mockDb.users.push({
        id: mockUserId,
        username,
        discriminator: '1234',
        avatar_url: mockUser.avatarUrl,
        bot: false
      });

      db.mockDb.user_profiles[mockUserId] = {
        user_id: mockUserId,
        guild_id: guildId,
        nickname: username,
        joined_at: new Date().toISOString(),
        is_verified: false,
        is_quarantined: false
      };
    } else {
      // Production Mode: Write to Supabase
      try {
        await supabaseClient.from('users').upsert({
          id: mockUserId,
          username,
          discriminator: '1234',
          avatar_url: mockUser.avatarUrl,
          bot: false
        });
        await supabaseClient.from('user_profiles').upsert({
          user_id: mockUserId,
          guild_id: guildId,
          nickname: username,
          joined_at: new Date().toISOString(),
          is_verified: false,
          is_quarantined: false
        });
      } catch (err) {
        console.error('Failed to write mock user to Supabase:', err.message);
      }
    }

    // Process through the Join Screening Pipeline
    const recentScreenings = shouldMock(guildId)
      ? (db.mockDb.join_screenings || []).filter(s => s.guild_id === guildId).map(s => ({ id: s.user_id, username: s.username }))
      : await db.getJoinScreenings(guildId, 20).then(list => list.map(s => ({ id: s.user_id, username: s.username }))).catch(() => []);

    const screeningResult = await joinScreening.screenMember(guildId, mockUser, recentScreenings, this);
    const action = screeningResult.decision;

    // Koya-inspired Welcome & Auto-Role Simulation
    const settings = await db.getSettings(guildId);
    let welcomeText = '';
    let welcomeDmText = '';
    if (settings) {
      if (settings.autorole_enabled && settings.autorole_roles) {
        const rolesList = settings.autorole_roles.split(',').map(r => r.trim());
        if (shouldMock(guildId)) {
          db.mockDb.user_profiles[mockUserId].roles = rolesList;
        }
      }
      const client = botClient;
      const botGuild = client && client.guilds ? client.guilds.cache.get(guildId) : null;
      const memberCount = botGuild ? botGuild.memberCount : (shouldMock(guildId) ? (db.mockDb.guilds.find(g => g.id === guildId)?.member_count || 1245) : 1245);
      const guildName = botGuild ? botGuild.name : (shouldMock(guildId) ? (db.mockDb.guilds.find(g => g.id === guildId)?.name || 'Server') : 'Server');
      
      if (settings.welcome_enabled) {
        welcomeText = formatAnnouncement(settings.welcome_message, mockUser, { name: guildName }, memberCount);
        const embed = buildDiscordEmbed(settings.welcome_embed, mockUser, { name: guildName }, memberCount);
        socketService.broadcast(guildId, 'security_alert', {
          type: 'WELCOME_ANNOUNCEMENT',
          userId: mockUserId,
          username: mockUser.username,
          message: `📢 Welcome (Channel #${settings.welcome_channel}): ${welcomeText}`,
          embed: embed
        });
      }
      if (settings.welcome_dm_enabled) {
        welcomeDmText = formatAnnouncement(settings.welcome_dm_message, mockUser, { name: guildName }, memberCount);
        const embed = buildDiscordEmbed(settings.welcome_dm_embed, mockUser, { name: guildName }, memberCount);
        socketService.broadcast(guildId, 'security_alert', {
          type: 'WELCOME_DM',
          userId: mockUserId,
          username: mockUser.username,
          message: `💬 Welcome (Direct Message): ${welcomeDmText}`,
          embed: embed
        });
      }
    }

    // Update daily analytics joins
    if (shouldMock(guildId)) {
      const today = new Date().toISOString().split('T')[0];
      const statIdx = db.mockDb.server_analytics.findIndex(s => s.date === today);
      if (statIdx !== -1) {
        db.mockDb.server_analytics[statIdx].joins += 1;
      }
    } else {
      // Production Mode: Increment joins in server_analytics
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabaseClient
          .from('server_analytics')
          .select('*')
          .eq('guild_id', guildId)
          .eq('date', today)
          .single();
        
        if (existing) {
          await supabaseClient
            .from('server_analytics')
            .update({ joins: (existing.joins || 0) + 1 })
            .eq('id', existing.id);
        } else {
          await supabaseClient
            .from('server_analytics')
            .insert({ guild_id: guildId, date: today, joins: 1, leaves: 0, messages_sent: 0, voice_minutes: 0, tickets_created: 0, security_alerts_triggered: 0 });
        }
      } catch (err) {
        console.error('Failed to update joins in Supabase:', err.message);
      }
    }

    return { userId: mockUserId, risk: riskResult, action, welcomeText, welcomeDmText };
  }

  async simulateMemberLeave(guildId, username) {
    console.log(`🤖 [Mock Bot] Simulating leave of user ${username} from guild ${guildId}...`);
    
    let offendingUser = null;
    if (shouldMock(guildId)) {
      offendingUser = db.mockDb.users.find(u => u.username === username);
    } else {
      try {
        const { data } = await supabaseClient.from('users').select('*').eq('username', username).limit(1);
        if (data && data.length > 0) offendingUser = data[0];
      } catch (e) {}
    }
    
    if (!offendingUser) {
      offendingUser = { id: `mock-${Math.random().toString(36).substr(2, 9)}`, username: username || 'Member' };
    }
    
    if (shouldMock(guildId)) {
      db.mockDb.users = db.mockDb.users.filter(u => u.id !== offendingUser.id);
      if (db.mockDb.user_profiles[offendingUser.id]) {
        delete db.mockDb.user_profiles[offendingUser.id];
      }
    }

    const settings = await db.getSettings(guildId);
    let leaveText = '';
    const client = botClient;
    const botGuild = client && client.guilds ? client.guilds.cache.get(guildId) : null;
    const memberCount = botGuild ? botGuild.memberCount : (shouldMock(guildId) ? (db.mockDb.guilds.find(g => g.id === guildId)?.member_count || 1245) : 1245);
    const guildName = botGuild ? botGuild.name : (shouldMock(guildId) ? (db.mockDb.guilds.find(g => g.id === guildId)?.name || 'Server') : 'Server');
    
    if (settings && settings.leave_enabled) {
      leaveText = formatAnnouncement(settings.leave_message, offendingUser, { name: guildName }, memberCount - 1);
      const embed = buildDiscordEmbed(settings.leave_embed, offendingUser, { name: guildName }, memberCount - 1);
      socketService.broadcast(guildId, 'security_alert', {
        type: 'LEAVE_ANNOUNCEMENT',
        userId: offendingUser.id,
        username: offendingUser.username,
        message: `📢 Farewell (Channel #${settings.leave_channel}): ${leaveText}`,
        embed: embed
      });
    }

    // Update daily analytics leaves
    if (shouldMock(guildId)) {
      const today = new Date().toISOString().split('T')[0];
      const statIdx = db.mockDb.server_analytics.findIndex(s => s.date === today);
      if (statIdx !== -1) {
        db.mockDb.server_analytics[statIdx].leaves = (db.mockDb.server_analytics[statIdx].leaves || 0) + 1;
      }
    } else {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabaseClient
          .from('server_analytics')
          .select('*')
          .eq('guild_id', guildId)
          .eq('date', today)
          .single();
        
        if (existing) {
          await supabaseClient
            .from('server_analytics')
            .update({ leaves: (existing.leaves || 0) + 1 })
            .eq('id', existing.id);
        } else {
          await supabaseClient
            .from('server_analytics')
            .insert({ guild_id: guildId, date: today, joins: 0, leaves: 1, messages_sent: 0, voice_minutes: 0, tickets_created: 0, security_alerts_triggered: 0 });
        }
      } catch (err) {
        console.error('Failed to update leaves in Supabase:', err.message);
      }
    }

    return { userId: offendingUser.id, leaveText };
  }

  async simulateSpamAttack(guildId, username) {
    console.log(`🤖 [Mock Bot] Simulating anti-spam detection on user ${username} for guild ${guildId}...`);
    
    let offendingUser = null;
    if (shouldMock(guildId)) {
      offendingUser = db.mockDb.users.find(u => u.username === username);
    } else {
      try {
        const { data } = await supabaseClient.from('users').select('*').eq('username', username).limit(1);
        if (data && data.length > 0) offendingUser = data[0];
      } catch (e) {}
    }
    
    if (!offendingUser) {
      offendingUser = { id: `mock-${Math.random().toString(36).substr(2, 9)}`, username: username || 'VoidSpammer' };
    }
    
    // Execute anti-spam playbook
    await playbookEngine.executePlaybook(guildId, 'ANTI_SPAM', {
      offenderId: offendingUser.id,
      offenderUsername: offendingUser.username,
      severity: 'HIGH',
      details: `User sent 8 identical invite links within 1.5 seconds.`
    }, this);

    // Update analytics
    if (shouldMock(guildId)) {
      const today = new Date().toISOString().split('T')[0];
      const statIdx = db.mockDb.server_analytics.findIndex(s => s.date === today);
      if (statIdx !== -1) {
        db.mockDb.server_analytics[statIdx].security_alerts_triggered += 1;
      }
    } else {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabaseClient
          .from('server_analytics')
          .select('*')
          .eq('guild_id', guildId)
          .eq('date', today)
          .single();
        
        if (existing) {
          await supabaseClient
            .from('server_analytics')
            .update({ security_alerts_triggered: (existing.security_alerts_triggered || 0) + 1 })
            .eq('id', existing.id);
        } else {
          await supabaseClient
            .from('server_analytics')
            .insert({ guild_id: guildId, date: today, joins: 0, leaves: 0, messages_sent: 0, voice_minutes: 0, tickets_created: 0, security_alerts_triggered: 1 });
        }
      } catch (err) {
        console.error('Failed to update alerts in Supabase:', err.message);
      }
    }

    return incident;
  }

  async simulateAntiNukeAttack(guildId, username) {
    console.log(`🤖 [Mock Bot] Simulating anti-nuke detection on user ${username} for guild ${guildId}...`);
    
    let offendingUser = null;
    if (shouldMock(guildId)) {
      offendingUser = db.mockDb.users.find(u => u.username === username);
    } else {
      try {
        const { data } = await supabaseClient.from('users').select('*').eq('username', username).limit(1);
        if (data && data.length > 0) offendingUser = data[0];
      } catch (e) {}
    }
    
    if (!offendingUser) {
      offendingUser = { id: `mock-${Math.random().toString(36).substr(2, 9)}`, username: username || 'ShadowBlade' };
    }

    // Revoke roles / quarantine from user
    if (shouldMock(guildId)) {
      if (db.mockDb.user_profiles[offendingUser.id]) {
        db.mockDb.user_profiles[offendingUser.id].is_quarantined = true;
      }
    } else {
      try {
        await supabaseClient.from('user_profiles').update({ is_quarantined: true }).eq('user_id', offendingUser.id).eq('guild_id', guildId);
      } catch (e) {}
    }

    // Execute anti-nuke playbook
    const playbooksRun = await playbookEngine.executePlaybook(guildId, 'ANTI_NUKE', {
      offenderId: offendingUser.id,
      offenderUsername: offendingUser.username,
      severity: 'CRITICAL',
      details: `Mass deletion detected: User deleted 6 channels in under 3 seconds.`
    }, this);

    return { success: true };
  }

  startSimulation() {
    // Generate organic messages, joins, and traffic every 30 seconds to make the charts beautiful
    setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      const analyticsIdx = db.mockDb.server_analytics.findIndex(s => s.date === today);
      if (analyticsIdx !== -1) {
        // Randomly increment stats
        db.mockDb.server_analytics[analyticsIdx].messages_sent += Math.floor(Math.random() * 10) + 1;
        db.mockDb.server_analytics[analyticsIdx].voice_minutes += Math.floor(Math.random() * 5);
        
        // Push realtime chart updates via socket
        socketService.broadcast('123456789012345678', 'analytics_realtime', {
          date: today,
          messages: db.mockDb.server_analytics[analyticsIdx].messages_sent,
          voice: db.mockDb.server_analytics[analyticsIdx].voice_minutes
        });
      }
    }, 10000);
  }
}

// Initializer Function
function initBot() {
  if (config.isMockMode) {
    botClient = new MockDiscordClient();
    botClient.login(config.discordToken);
    return botClient;
  }

  // Real Discord.js Initialization
  botClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildInvites
    ]
  });

  botClient.commands = new Collection();

  // Load event handlers
  botClient.once('ready', () => {
    console.log(`🤖 Bot logged in as ${botClient.user.tag}`);
  });

  botClient.on('guildMemberAdd', async (member) => {
    console.log(`👤 Member joined: ${member.user.tag}`);
    const settings = await db.getSettings(member.guild.id);
    if (!settings) return;

    // Koya-inspired Auto-Role assignment
    if (settings.autorole_enabled && settings.autorole_roles) {
      try {
        const roleNames = settings.autorole_roles.split(',').map(r => r.trim());
        const guildRoles = await member.guild.roles.fetch();
        const targetRoles = guildRoles.filter(r => roleNames.includes(r.name) || roleNames.includes(r.id));
        if (targetRoles.size > 0) {
          await member.roles.add(targetRoles);
          console.log(`🤖 Auto-role applied: Added roles [${targetRoles.map(r => r.name).join(', ')}] to ${member.user.tag}`);
        }
      } catch (err) {
        console.error(`❌ Failed to apply auto-role:`, err.message);
      }
    }

    // Welcome Announcement
    if (settings.welcome_enabled && settings.welcome_channel) {
      try {
        const channel = member.guild.channels.cache.find(
          c => c.id === settings.welcome_channel || c.name === settings.welcome_channel
        );
        if (channel && channel.isTextBased()) {
          const welcomeMsg = formatAnnouncement(settings.welcome_message, member.user, member.guild, member.guild.memberCount);
          const embed = buildDiscordEmbed(settings.welcome_embed, member.user, member.guild, member.guild.memberCount);
          if (embed) {
            await channel.send({ content: welcomeMsg, embeds: [embed] });
          } else {
            await channel.send(welcomeMsg);
          }
        }
      } catch (err) {
        console.error(`❌ Welcome announcement dispatch failed:`, err.message);
      }
    }

    // Welcome DM
    if (settings.welcome_dm_enabled && settings.welcome_dm_message) {
      try {
        const dmMsg = formatAnnouncement(settings.welcome_dm_message, member.user, member.guild, member.guild.memberCount);
        const embed = buildDiscordEmbed(settings.welcome_dm_embed, member.user, member.guild, member.guild.memberCount);
        if (embed) {
          await member.send({ content: dmMsg, embeds: [embed] });
        } else {
          await member.send(dmMsg);
        }
      } catch (err) {
        console.error(`❌ Welcome DM dispatch failed:`, err.message);
      }
    }

    // Evaluate risk
    if (settings.verification_enabled) {
      const riskResult = await riskEngine.evaluateMember(member.guild.id, member.user);
      await riskEngine.executeRiskMitigation(member.guild, member.user, riskResult);
    }
  });

  botClient.on('guildMemberRemove', async (member) => {
    console.log(`👤 Member left: ${member.user.tag}`);
    const settings = await db.getSettings(member.guild.id);
    if (!settings) return;

    // Leave Announcement
    if (settings.leave_enabled && settings.leave_channel) {
      try {
        const channel = member.guild.channels.cache.find(
          c => c.id === settings.leave_channel || c.name === settings.leave_channel
        );
        if (channel && channel.isTextBased()) {
          const leaveMsg = formatAnnouncement(settings.leave_message, member.user, member.guild, member.guild.memberCount);
          const embed = buildDiscordEmbed(settings.leave_embed, member.user, member.guild, member.guild.memberCount);
          if (embed) {
            await channel.send({ content: leaveMsg, embeds: [embed] });
          } else {
            await channel.send(leaveMsg);
          }
        }
      } catch (err) {
        console.error(`❌ Leave announcement dispatch failed:`, err.message);
      }
    }
  });

  // Load message logger for anti-spam & leveling
  botClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Simple leveling increase, anti-spam, and command parsing logic goes here
    // In production, anti-spam parses links, caps, and message rate.
  });

  botClient.login(config.discordToken).catch(err => {
    console.error('❌ Failed to login to Discord Discord.js client:', err.message);
    console.log('Bot will fall back to simulation mode.');
    config.isMockMode = true;
    botClient = new MockDiscordClient();
    botClient.login('mock_token');
  });

  return botClient;
}

module.exports = {
  initBot,
  getBotClient: () => botClient,
  MockDiscordClient
};
