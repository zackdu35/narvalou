import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function deleteCampaign(id) {
  console.log(`🧨 Suppression totale de la campagne ${id}...`)

  // Cascade delete logic (if not set in DB)
  await supabase.from('messages').delete().eq('campaign_id', id)
  await supabase.from('quests').delete().eq('campaign_id', id)
  await supabase.from('characters').delete().eq('campaign_id', id)
  await supabase.from('sessions').delete().eq('campaign_id', id)
  
  const { error } = await supabase.from('campaigns').delete().eq('id', id)

  if (error) {
    console.error("❌ Erreur pendant la suppression:", error)
  } else {
    console.log("✅ Campagne supprimée avec succès.")
  }
}

const idToDelete = process.argv[2]
if (!idToDelete) {
    console.error("Usage: node delete-campaign.js <id>")
    process.exit(1)
}

deleteCampaign(idToDelete)
