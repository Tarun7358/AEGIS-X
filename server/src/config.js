const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkeyaegisx',
  discordToken: process.env.DISCORD_TOKEN,
  discordClientId: process.env.DISCORD_CLIENT_ID,
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
  discordRedirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:5173/auth/callback',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Auto-detect Mock Mode
  isMockMode: false
};

// Check if variables are missing or use default "mock_" placeholders
if (
  !config.discordToken || config.discordToken.includes('mock') ||
  !config.supabaseUrl || config.supabaseUrl.includes('mock') ||
  !config.supabaseServiceKey || config.supabaseServiceKey.includes('mock')
) {
  config.isMockMode = true;
  console.log('\n==================================================');
  console.log('⚠️  RUNNING BACKEND IN MOCK MODE ⚠️');
  console.log('Reason: Discord Token or Supabase keys are missing or invalid.');
  console.log('The backend will emulate Discord bot events and database calls.');
  console.log('==================================================\n');
}

module.exports = config;
