import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

// Support .env in root or dnd-site dir
dotenv.config({ path: '../dnd-site/.env' })
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("ERREUR: Clés Supabase manquantes dans le .env !")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateLive() {
  // Read data from stdin or argument
  let dataStr = process.argv[2]
  if (!dataStr) {
    console.error("Usage: node update-live.js '<json_data>'")
    process.exit(1)
  }

  try {
    const liveData = JSON.parse(dataStr)
    
    // On update l'ID 1 qui est notre session active
    const { error } = await supabase
      .from('live_game')
      .update({ 
        data: liveData,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)

    if (error) throw error
    console.log("✅ Live synchronisé avec le Cloud Supabase !")
  } catch (err) {
    console.error("❌ Erreur de synchro Live:", err.message)
    process.exit(1)
  }
}

updateLive()
