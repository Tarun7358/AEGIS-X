const express = require('express');
const cors = require('cors');
const http = require('http');
const config = require('./config');
const socketService = require('./services/socket');
const { initBot } = require('./bot/client');

// Import routers
const authRouter = require('./api/routes/auth');
const guildsRouter = require('./api/routes/guilds');
const securityRouter = require('./api/routes/security');
const analyticsRouter = require('./api/routes/analytics');
const ticketsRouter = require('./api/routes/tickets');
const aiRouter = require('./api/routes/ai');
const moderationRouter = require('./api/routes/moderation');
// v2.0 SOC routes
const altDetectionRouter = require('./api/routes/altDetection');
const auditRouter = require('./api/routes/audit');
const emergencyRouter = require('./api/routes/emergency');
const teamRouter = require('./api/routes/team');
const integrationsRouter = require('./api/routes/integrations');

const app = express();
app.use(cors());
app.use(express.json());

// Attach API Routes
app.use('/api/auth', authRouter);
app.use('/api/guilds', guildsRouter);
app.use('/api/security', securityRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/moderation', moderationRouter);
// v2.0 SOC routes
app.use('/api/alt-detection', altDetectionRouter);
app.use('/api/audit', auditRouter);
app.use('/api/emergency', emergencyRouter);
app.use('/api/team', teamRouter);
app.use('/api/integrations', integrationsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: config.isMockMode ? 'mock' : 'production',
    timestamp: new Date().toISOString()
  });
});

const server = http.createServer(app);

// Initialize Services
console.log('🔌 Initializing Realtime Event System (Socket.IO)...');
socketService.init(server);

console.log('🤖 Initializing Discord Bot Client...');
initBot();

server.listen(config.port, () => {
  console.log(`\n🚀 AEGIS X Server is running on port ${config.port}`);
  console.log(`📊 API endpoints base: http://localhost:${config.port}/api`);
  console.log(`🔌 Realtime Socket.IO endpoint: http://localhost:${config.port}\n`);
});
