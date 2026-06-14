const { getBotClient } = require('./src/bot/client');
const { initBot } = require('./src/bot/client');
const { db } = require('./src/services/supabase');
const backupService = require('./src/services/backup');
const { PermissionFlagsBits } = require('discord.js');

async function runTest() {
  console.log('Initializing Bot Client...');
  await initBot();

  // Wait a few seconds for bot to log in
  await new Promise(resolve => setTimeout(resolve, 5000));

  const client = getBotClient();
  const guildId = '1266048940101599293'; // Aura Xtremez
  const userId = '1140892126402596905'; // rbzclasher

  console.log(`Checking guild ${guildId} in bot cache...`);
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.error('Guild not found in bot cache!');
    process.exit(1);
  }
  console.log('Guild found:', guild.name);

  try {
    console.log('1. Simulating authorizeRole logic...');
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      console.error('Member not found in guild!');
      process.exit(1);
    }
    const isOwner = guild.ownerId === userId;
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    console.log('isOwner:', isOwner, 'isAdmin:', isAdmin);

    console.log('2. Simulating db.getBackups...');
    const backups = await db.getBackups(guildId);
    console.log('Backups:', backups);

    console.log('3. Simulating backup compilation (createServerBackup)...');
    const backup = await backupService.createServerBackup(guild, userId);
    console.log('Backup generated successfully:', backup.id, 'Size:', backup.size_bytes);
  } catch (err) {
    console.error('CRITICAL ERROR DURING BACKUP:', err);
  }
  process.exit(0);
}

runTest();
