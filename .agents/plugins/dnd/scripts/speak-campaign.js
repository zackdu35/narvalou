import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERREUR: Supabase credentials missing.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function speak(text, campaignId, npcName = 'DM') {
  console.log(`💬 Sending message to campaign ${campaignId}: "${text}"...`);
  
  const { error } = await supabase
    .from('messages')
    .insert([{
      sender_id: npcName,
      receiver_id: 'global',
      content: text,
      campaign_id: parseInt(campaignId)
    }]);

  if (error) {
    console.error(`❌ Message insert failed: ${error.message}`);
    process.exit(1);
  }

  console.log(`✅ Success!`);
}

const text = process.argv[2];
const campaignId = process.argv[3] || 1;
const npcName = process.argv[4] || 'DM';

if (!text) {
  console.error("Usage: node scripts/speak-campaign.js <text> [campaign_id] [npc_name]");
  process.exit(1);
}

speak(text, campaignId, npcName);
