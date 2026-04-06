
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/dnd-site/.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function importCharactersDirect() {
  const campaignId = 1
  const data = JSON.parse(fs.readFileSync('/Users/zaccharie/Documents/narvalou/dnd-site/src/data/campaign.json', 'utf8'))
  
  console.log(`👤 Importation FORCE des personnages (SQL Direct)...`)
  
  for (const char of data.characters) {
    const id = `${campaignId}_${char.id}`
    const charData = {
        id,
        campaign_id: campaignId,
        name: char.name,
        race: char.race,
        class: char.class,
        level: char.level || 1,
        hp_current: char.hp?.current || 10,
        hp_max: char.hp?.max || 10,
        xp_current: char.xp?.current || 0,
        xp_next: char.xp?.next || 300,
        stats: JSON.stringify(char.stats || {}),
        inventory: JSON.stringify(char.inventory || []),
        grimoire: JSON.stringify(char.grimoire || []),
        features: JSON.stringify(char.features || []),
        spell_slots: JSON.stringify(char.spellSlots || {}),
        ideals: (char.ideals || "").replace(/'/g, "''"),
        bonds: (char.bonds || "").replace(/'/g, "''"),
        image: char.image || "",
        description: (char.description || "").replace(/'/g, "''")
    }

    const sql = `
        INSERT INTO characters (
            id, campaign_id, name, race, class, level, 
            hp_current, hp_max, xp_current, xp_next, 
            stats, inventory, grimoire, features, 
            spell_slots, ideals, bonds, image, description
        ) VALUES (
            '${charData.id}', ${charData.campaign_id}, '${charData.name}', '${charData.race}', '${charData.class}', ${charData.level},
            ${charData.hp_current}, ${charData.hp_max}, ${charData.xp_current}, ${charData.xp_next},
            '${charData.stats}'::jsonb, '${charData.inventory}'::jsonb, '${charData.grimoire}'::jsonb, '${charData.features}'::jsonb,
            '${charData.spell_slots}'::jsonb, '${charData.ideals}', '${charData.bonds}', '${charData.image}', '${charData.description}'
        ) ON CONFLICT (id) DO UPDATE SET
            hp_current = EXCLUDED.hp_current,
            xp_current = EXCLUDED.xp_current,
            inventory = EXCLUDED.inventory,
            grimoire = EXCLUDED.grimoire;
    `

    const { error } = await supabase.rpc('exec_sql', { sql })
    if (error) {
        console.error(`❌ Erreur SQL pour ${char.name}:`, error.message)
    } else {
        console.log(`✅ ${char.name} importé via SQL.`)
    }
  }
}

importCharactersDirect()
