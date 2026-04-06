
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/dnd-site/.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function importCharacters() {
  const campaignId = 1
  const data = JSON.parse(fs.readFileSync('/Users/zaccharie/Documents/narvalou/dnd-site/src/data/campaign.json', 'utf8'))
  
  console.log(`👤 Importation des personnages pour la Campagne #${campaignId}...`)
  
  const charsToInsert = data.characters.map(char => ({
    id: `${campaignId}_${char.id}`,
    campaign_id: campaignId,
    name: char.name,
    race: char.race,
    class: char.class,
    level: char.level || 1,
    hp_current: char.hp?.current || 10,
    hp_max: char.hp?.max || 10,
    xp_current: char.xp?.current || 0,
    xp_next: char.xp?.next || 300,
    stats: char.stats || {},
    inventory: char.inventory || [],
    grimoire: char.grimoire || [],
    features: char.features || [],
    spell_slots: char.spellSlots || {},
    ideals: char.ideals || "",
    bonds: char.bonds || "",
    image: char.image || "",
    description: char.description || ""
  }))

  const { error } = await supabase.from('characters').upsert(charsToInsert)
  
  if (error) {
    console.error("❌ Erreur lors de l'importation:", error.message)
  } else {
    console.log(`✅ ${charsToInsert.length} personnages importés avec succès dans la table SQL !`)
    charsToInsert.forEach(c => console.log(` - ${c.name} (${c.class})`))
  }
}

importCharacters()
