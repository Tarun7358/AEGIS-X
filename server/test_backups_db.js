const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Querying backups table for guild 1266048940101599293...');
    const { data: backups, error: backupsError } = await supabase
      .from('backups')
      .select('*')
      .eq('guild_id', '1266048940101599293')
      .order('created_at', { ascending: false });

    if (backupsError) {
      console.error('Supabase backups query error:', backupsError);
    } else {
      console.log('Backups query successful. Count:', backups.length, 'Data:', backups);
    }
  } catch (err) {
    console.error('Database connection threw exception:', err.message);
  }
}

testConnection();
