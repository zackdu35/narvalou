import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('=')))

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const resetData = {
  "active": true,
  "lastUpdate": new Date().toISOString(),
  "currentLocation": "Auberge de Stonehill, Phandaline",
  "currentTimeOfDay": "Matin",
  "currentScene": {
    "image": "https://pydpkyjixmshvjxyxixy.supabase.co/storage/v1/object/public/campaign-assets/sessions/2/07_tavern_night.png",
    "description": "Le soleil se lève sur Phandaline. Session 3 commence ! Vous vous réveillez à l'auberge, prêts pour une nouvelle journée d'aventure.",
    "isGenerating": false
  },
  "partyStatus": [
    { "id": "diaz", "hp": 11, "status": "Reposé" },
    { "id": "valmir", "hp": 7, "status": "Réveillé" },
    { "id": "gandhi", "hp": 10, "status": "Prêt" }
  ],
  "activeQuests": [
    { "title": "Retrouver Gundren Rockseeker", "description": "Il a été emmené au Château de Cragmaw par les gobelins.", "priority": "high" },
    { "title": "Phandalin la Belle", "description": "Explorez Phandalin et découvrez ses secrets.", "priority": "low" }
  ],
  "recentEvents": [
    "Début de la Session 3",
    "Repos long à l'Auberge de Stonehill"
  ]
}

async function reset() {
  console.log("🧹 Clearing chat history...")
  const { error: msgError } = await supabase.from('messages').delete().neq('sender_id', 'system')
  if (msgError) console.error("Error clearing messages:", msgError.message)
  else console.log("✅ Chat history cleared!")

  console.log("🔄 Resetting live board state...")
  const { error: liveError } = await supabase
    .from('live_game')
    .update({ data: resetData })
    .eq('id', 1)

  if (liveError) console.error("Error resetting live state:", liveError.message)
  else console.log("✅ Session 3 reset successfully!")
}

reset()
