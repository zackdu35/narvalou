
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

// Load .env (absolute project root)
dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/dnd-site/.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("ERREUR: Credentials Supabase absents.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function listCampaigns() {
  console.log("\n--- 📜 REGISTRE DES CAMPAGNES DANS LA BDD ---")
  const { data, error } = await supabase
    .from('live_game')
    .select('id, data, updated_at')
    .order('id', { ascending: true })

  if (error) {
    console.error("Erreur de récupération:", error.message)
    return
  }

  // Header
  console.log(`${"ID".padEnd(4)} | ${"NOM".padEnd(30)} | ${"UNIVERS".padEnd(20)} | ${"SESSION".padEnd(7)} | ${"MIS À JOUR"}`)
  console.log("-".repeat(90))

  data.forEach(c => {
    const s = c.data
    const id = String(c.id).padEnd(4)
    const nom = (s.campaignName || "Inconnu").substring(0, 28).padEnd(30)
    const universe = (s.universe || "D&D 5e").substring(0, 18).padEnd(20)
    const session = String(s.sessionNumber || "??").padEnd(7)
    const date = new Date(c.updated_at).toLocaleString()
    console.log(`${id} | ${nom} | ${universe} | ${session} | ${date}`)
  })
  console.log("\n💡 Utilisez l'ID pour vos synchronisations (ex: node dm-sync.js log.json image.png [ID])")
}

listCampaigns()
