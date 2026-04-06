import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from skill dir
dotenv.config({ path: path.join(__dirname, '..', '.env') });
// Also try to load from site dir for Supabase keys if needed
dotenv.config({ path: path.join(__dirname, '../../../../dnd-site/.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const VOICE_PRESETS = {
  'default': 'JBFqnCBsd6RMkjVDRZzb',
  'narrator': 'pNInz6obpgDQGcFmaJgB',
  'goblin': 'EXAVITQu4vr4xnSDxMaL',
  'dwarf': 'VR6AewLTigWG4xSOukaG',
  'elf': 'ThT5KcBeYPX3keUQqHPh',
  'wizard': 'pNInz6obpgDQGcFmaJgB',
  'warrior': 'VR6AewLTigWG4xSOukaG',
  'rogue': 'EXAVITQu4vr4xnSDxMaL',
  'cleric': 'ThT5KcBeYPX3keUQqHPh',
  'merchant': 'JBFqnCBsd6RMkjVDRZzb',
  'guard': 'VR6AewLTigWG4xSOukaG',
  'noble': 'pNInz6obpgDQGcFmaJgB',
  'villain': 'EXAVITQu4vr4xnSDxMaL',
};

async function main() {
  const args = process.argv.slice(2);
  let text = '';
  let voiceKey = 'narrator';
  let npcName = 'DM';
  let campaignId = 3; // Default to campaign 3 for Potter

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--text') text = args[++i];
    if (args[i] === '--voice') voiceKey = args[++i];
    if (args[i] === '--npc') npcName = args[++i];
    if (args[i] === '--campaign') campaignId = parseInt(args[++i]);
  }

  if (!text) {
    console.error('Usage: node scripts/speak-on-site.js --text "Hello" [--voice narrator] [--npc DM] [--campaign 1]');
    process.exit(1);
  }

  const voiceId = VOICE_PRESETS[voiceKey] || voiceKey;
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const elevenlabs = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });

  console.log(`🎙️ Generating audio for: "${text}"...`);
  
  try {
    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text: text,
      model_id: 'eleven_flash_v2_5',
      output_format: 'mp3_44100_128'
    });

    const tempFileName = `voice_${Date.now()}.mp3`;
    const tempFilePath = path.join(__dirname, tempFileName);
    const writeStream = createWriteStream(tempFilePath);

    if (audioStream[Symbol.asyncIterator]) {
      for await (const chunk of audioStream) {
        writeStream.write(chunk);
      }
    } else {
      writeStream.write(audioStream);
    }

    await new Promise((resolve, reject) => {
      writeStream.end();
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log(`📤 Uploading to Supabase...`);
    const fileBuffer = await fs.readFile(tempFilePath);
    const bucketName = 'campaign-assets';
    const storagePath = `audio/${tempFileName}`;

    // Ensure bucket exists
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName);
    if (bucketError) {
      console.log(`Bucket ${bucketName} not found, trying to create it...`);
      await supabase.storage.createBucket(bucketName, { public: true });
    }

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    console.log(`💬 Sending message with audio...`);
    const finalContent = `${text} [AUDIO:${publicUrl}]`;
    
    const { error: msgError } = await supabase
      .from('messages')
      .insert([{
        sender_id: npcName,
        receiver_id: 'global',
        content: finalContent,
        campaign_id: campaignId
      }]);

    if (msgError) throw new Error(`Message insert failed: ${msgError.message}`);

    console.log(`✅ Success! Audio available at: ${publicUrl}`);
    
    // Cleanup
    await fs.unlink(tempFilePath);
    
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
