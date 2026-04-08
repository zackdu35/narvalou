import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Credentials missing from .env")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetCampaign(campaignId) {
  console.log(`🧹 Reset de la campagne ${campaignId}...`)

  // 1. Clear Messages
  const { error: msgErr } = await supabase.from('messages').delete().eq('campaign_id', campaignId)
  if (msgErr) console.error("Error messages:", msgErr)
  else console.log("✅ Messages supprimés.")

  // 2. Clear Quests
  const { error: questErr } = await supabase.from('quests').delete().eq('campaign_id', campaignId)
  if (questErr) console.error("Error quests:", questErr)
  else console.log("✅ Quêtes supprimées.")

  // 3. Reset Characters
  const { data: chars } = await supabase.from('characters').select('*').eq('campaign_id', campaignId)
  if (chars) {
    for (const char of chars) {
      await supabase.from('characters').update({ hp_current: char.hp_max, xp_current: 0 }).eq('id', char.id)
    }
    console.log("✅ Personnages soignés et XP réinitialisée.")
  }

  // 4. Update Campaign State
  const { error: campErr } = await supabase.from('campaigns').update({
    current_location: "District de Trost - Mur Extérieur",
    current_time_of_day: "Matin Calme",
    scene_description: "Le soleil se lève sur le District de Trost. Vous êtes de jeunes recrues de la 104ème Brigade d'Entraînement, affectées à l'entretien des canons sur le haut du mur. La paix dure depuis cent ans, mais l'air semble lourd aujourd'hui.",
    summary: "Début de l'aventure dans l'univers de l'Attaque des Titans. Les recrues sont en garnison à Trost.",
    scene_image: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/trost_start.png" 
  }).eq('id', campaignId)

  if (campErr) console.error("Error campaign update:", campErr)
  else console.log("✅ État de la campagne réinitialisé.")

  // 5. Signal Refresh
  await supabase.from('messages').insert([{
    sender_id: 'SYSTEM',
    receiver_id: 'global',
    content: '[TURN_RESOLVED]',
    campaign_id: campaignId
  }])
  
  console.log("✨ Reset complet ! Prêt pour le début d'aventure.")
}

// Target Campaign 6
resetCampaign(6)
