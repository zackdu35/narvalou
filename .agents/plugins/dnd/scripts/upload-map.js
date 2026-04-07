import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadMap() {
  const imagePath = '/Users/zaccharie/.gemini/antigravity/brain/245a9291-83df-4bfc-9c0a-effbf4e97139/aot_world_map_1775591970386.png';
  const campaignId = 4;
  const fileName = 'aot_world_map.png';

  try {
    console.log(`📤 Uploading map...`);
    const fileData = await fs.readFile(imagePath);
    
    const { error: uploadError } = await supabase.storage
      .from('campaign-assets')
      .upload(`maps/${campaignId}/${fileName}`, fileData, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('campaign-assets')
      .getPublicUrl(`maps/${campaignId}/${fileName}`);
      
    console.log(`✅ Map uploaded: ${publicUrl}`);

    console.log(`🏰 Updating campaign 4 map_image...`);
    const { error: campError } = await supabase
      .from('campaigns')
      .update({ map_image: publicUrl })
      .eq('id', campaignId);

    if (campError) throw campError;
    
    // Also send a sync signal to the chat to trigger update
    await supabase.from('messages').insert([{
      sender_id: 'SYSTEM',
      receiver_id: 'global',
      content: `[SYNC_SCENE:{"location":"Mise à jour de la carte","time":"","description":"","image":""}]`,
      campaign_id: campaignId
    }]);

    console.log(`✅ Campaign updated successfully!`);
  } catch (err) {
    console.error(`❌ Error logic: ${err.message}`);
  }
}

uploadMap();
