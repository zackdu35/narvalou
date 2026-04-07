import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function reset() {
  const campaignId = 3; // Harry Potter
  console.log(`🧹 Nettoyage de la campagne ${campaignId}...`)

  // 1. Vider les messages
  const { error: msgErr } = await supabase.from('messages').delete().eq('campaign_id', campaignId)
  if (msgErr) console.error("Erreur messages:", msgErr)
  else console.log("✅ Chat vidé.")

  // 2. Vider les quêtes
  const { error: questErr } = await supabase.from('quests').delete().eq('campaign_id', campaignId)
  if (questErr) console.error("Erreur quêtes:", questErr)
  else console.log("✅ Quêtes vidées.")

  // 3. Reset des personnages
  const { error: charErr } = await supabase.from('characters').update({ hp_current: 10 }).eq('campaign_id', campaignId)
  if (charErr) console.error("Erreur persos:", charErr)
  else console.log("✅ Personnages soignés.")

  console.log("✨ Reset terminé !")
}

reset()
