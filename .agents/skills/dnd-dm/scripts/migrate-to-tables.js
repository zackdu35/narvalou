
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

// Load .env from dnd-site
dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/dnd-site/.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("ERREUR: Credentials Supabase absents.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrate() {
  console.log("🚀 Début de la migration vers les nouvelles tables...")

  // 1. Lire les anciennes données
  const { data: legacy, error: fetchError } = await supabase.from('live_game').select('*')
  if (fetchError) {
    console.error("Impossible de lire live_game:", fetchError.message)
    return
  }

  for (const campaignEntry of legacy) {
    const s = campaignEntry.data
    const legacyId = campaignEntry.id
    console.log(`\n📦 Migration de la Campagne #${legacyId} : ${s.campaignName}...`)

    // A. Mapper la campagne
    const campaignData = {
      name: s.campaignName || "Campagne sans nom",
      universe: s.universe || "D&D 5e",
      dm_name: s.dm || "Antigravity",
      summary: s.summary || "",
      session_number: s.sessionNumber || 1,
      current_location: s.currentLocation || "Début du voyage",
      current_time_of_day: s.currentTimeOfDay || "Aube",
      scene_description: s.currentScene?.description || "",
      scene_image: s.currentScene?.image || ""
    }

    // Upsert dans campaigns (on force l'ID pour garder la cohérence si possible, sinon on laisse générer)
    // Supabase JS ne permet pas de désactiver IDENTITY facilement via client, 
    // donc on va d'abord tenter d'insérer, et si ça échoue on laisse l'ID généré.
    const { data: newCampaign, error: campError } = await supabase
      .from('campaigns')
      .upsert([{ id: legacyId, ...campaignData }], { onConflict: 'id' })
      .select()

    if (campError) {
      console.error(`❌ Erreur insert campagne #${legacyId}:`, campError.message)
      continue
    }

    const campaignId = newCampaign[0].id
    console.log(`✅ Campagne créée/mise à jour (ID : ${campaignId})`)

    // B. Mapper les personnages
    if (s.characters && s.characters.length > 0) {
      console.log(`👤 Migration de ${s.characters.length} personnages...`)
      
      const charsToInsert = s.characters.map(char => {
        // Retrouver le status HP dans partyStatus si présent
        const statusEntry = (s.partyStatus || []).find(ps => ps.id === char.id)
        
        return {
          id: `${campaignId}_${char.id}`, // Unique ID composite pour éviter les collisions entre campagnes
          campaign_id: campaignId,
          name: char.name,
          race: char.race,
          class: char.class,
          level: char.level || 1,
          hp_current: statusEntry ? statusEntry.hp : (char.hp?.current || 10),
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
        }
      })

      const { error: charError } = await supabase.from('characters').upsert(charsToInsert)
      if (charError) console.error("❌ Erreur insert personnages:", charError.message)
      else console.log(`✅ ${charsToInsert.length} personnages migrés.`)
    }

    // C. Mapper les quêtes
    if (s.activeQuests && s.activeQuests.length > 0) {
      console.log(`📜 Migration de ${s.activeQuests.length} quêtes...`)
      const questsToInsert = s.activeQuests.map(q => ({
        campaign_id: campaignId,
        title: q.title,
        description: q.description,
        priority: q.priority || 'normal',
        status: 'active'
      }))

      const { error: questError } = await supabase.from('quests').upsert(questsToInsert)
      if (questError) console.error("❌ Erreur insert quêtes:", questError.message)
      else console.log(`✅ ${questsToInsert.length} quêtes migrées.`)
    }
  }

  console.log("\n✨ Migration terminée avec succès !")
}

migrate()
