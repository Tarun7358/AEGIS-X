const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { db, client: supabaseClient } = require('../../services/supabase');

// GET /api/auth/discord-url
// Generates Discord OAuth2 redirect URL
router.get('/discord-url', (req, res) => {
  const clientRedirectUri = req.query.redirect_uri || config.discordRedirectUri;
  if (config.isMockMode) {
    // In Mock Mode, direct callback simulation is triggered
    return res.json({ url: `${clientRedirectUri}?code=mock_code_shadowblade` });
  }
  
  const scopes = ['identify', 'guilds', 'guilds.members.read', 'email'];
  const url = `https://discord.com/api/oauth2/authorize?client_id=${config.discordClientId}&redirect_uri=${encodeURIComponent(clientRedirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}`;
  res.json({ url });
});

// POST /api/auth/login
// Emulates or processes user login, generating a JWT
router.post('/login', async (req, res) => {
  const { code, username, isMock } = req.body;
  console.log('🔑 POST /api/auth/login called with code:', code, 'username:', username, 'isMock:', isMock);

  try {
    // Handle Mock Authentication Flow
    if (config.isMockMode || isMock || (code && code.startsWith('mock_'))) {
      console.log('🤖 Handling mock authentication...');
      let mockUser = db.mockDb.users.find(u => u.id === '1002'); // Default ShadowBlade
      
      if (code === 'mock_code_neonryder') {
        mockUser = db.mockDb.users.find(u => u.id === '1001');
      } else if (code === 'mock_code_cyberglitch') {
        mockUser = db.mockDb.users.find(u => u.id === '1003');
      } else if (username) {
        mockUser = db.mockDb.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || mockUser;
      }

      const token = jwt.sign({ userId: mockUser.id }, config.jwtSecret, { expiresIn: '7d' });
      console.log('✅ Mock token generated successfully for user:', mockUser.username);
      return res.json({ token, user: mockUser });
    }

    // Real Discord OAuth2 Login Flow
    if (!code) {
      console.log('❌ Auth login request missing code.');
      return res.status(400).json({ error: 'Auth code is required for Discord OAuth.' });
    }

    const clientRedirectUri = req.body.redirect_uri || config.discordRedirectUri;
    const tokenParams = new URLSearchParams({
      client_id: config.discordClientId,
      client_secret: config.discordClientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: clientRedirectUri
    });

    console.log('📡 Exchanging authorization code with Discord...');
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`❌ Discord OAuth token exchange failed: Status ${tokenResponse.status} - ${errorText}`);
      return res.status(400).json({ error: `Discord OAuth exchange failed: ${errorText}` });
    }

    const oauthData = await tokenResponse.json();
    const accessToken = oauthData.access_token;
    console.log('✅ Access token received successfully.');

    // Retrieve user details from Discord API
    console.log('📡 Retrieving user details from Discord users API...');
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(`❌ Failed to fetch user profile from Discord: Status ${userResponse.status} - ${errorText}`);
      return res.status(400).json({ error: 'Failed to fetch user profile from Discord.' });
    }

    const discordUser = await userResponse.json();
    console.log(`✅ Fetched Discord user profile: ${discordUser.username} (${discordUser.id})`);

    // Sign session token
    const token = jwt.sign({ userId: discordUser.id, accessToken }, config.jwtSecret, { expiresIn: '7d' });
    
    const userProfile = {
      id: discordUser.id,
      username: discordUser.username,
      avatar_url: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : '',
      discriminator: discordUser.discriminator || '0000',
      bot: false
    };

    // Save profile to Supabase in production mode
    if (!config.isMockMode && supabaseClient) {
      try {
        const { error: upsertErr } = await supabaseClient
          .from('users')
          .upsert(userProfile);
        if (upsertErr) {
          console.error('❌ Failed to upsert user to Supabase:', upsertErr.message);
        } else {
          console.log(`✅ Persisted user ${discordUser.username} to database.`);
        }
      } catch (err) {
        console.error('❌ Error during user database persistence:', err.message);
      }
    }

    console.log('✅ Session generated successfully. Returning user profile.');
    return res.json({
      token,
      user: userProfile
    });

  } catch (error) {
    console.error('❌ Auth Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/auth/me
// Returns current user details based on JWT
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    const isMockUser = config.isMockMode || 
                       decoded.userId === '1001' || 
                       decoded.userId === '1002' || 
                       decoded.userId === '1003' || 
                       decoded.userId.toString().startsWith('mock-');
    if (isMockUser) {
      const mockUser = db.mockDb.users.find(u => u.id === decoded.userId) || { id: '1002', username: 'ShadowBlade', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' };
      return res.json({ user: mockUser });
    }

    // In production mode, fetch live details from database
    let profile = { id: decoded.userId, username: 'DiscordAdmin' };
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('users')
          .select('*')
          .eq('id', decoded.userId)
          .maybeSingle();
        
        if (data) {
          profile = {
            id: data.id,
            username: data.username,
            avatar_url: data.avatar_url,
            discriminator: data.discriminator,
            bot: data.bot
          };
        }
      } catch (err) {
        console.error('❌ Error fetching user from database in /me:', err.message);
      }
    }

    return res.json({ user: profile });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
