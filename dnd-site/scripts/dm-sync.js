import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'

// On charge le .env du dnd-site
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERREUR: Supabase URL ou KEY manquante.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function sync(jsonPath, imagePath) {
  try {
    console.log(`📖 Lecture du nouvel état: ${jsonPath}...`)
    const newState = JSON.parse(await fs.readFile(jsonPath, 'utf8'))
    const campaignId = process.argv[4] || 1 // Par défaut ID 1
    
    // 1. GESTION DES IMAGES (Upload auto vers Supabase Storage)
    if (imagePath && imagePath !== 'null' && (imagePath.endsWith('.png') || imagePath.endsWith('.jpg'))) {
      console.log(`📤 Upload de l'image de scène vers Storage...`)
      const fileName = path.basename(imagePath)
      const fileData = await fs.readFile(imagePath)
      
      const { error: uploadError } = await supabase.storage
        .from('campaign-assets')
        .upload(`scenes/${campaignId}/${fileName}`, fileData, {
          contentType: 'image/png',
          upsert: true
        })
        
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('campaign-assets')
          .getPublicUrl(`scenes/${campaignId}/${fileName}`)
        
        console.log(`✅ Image uploadée: ${publicUrl}`)
        newState.currentScene.image = publicUrl
      } else {
        console.warn("⚠️ Upload image échoué, utilisation du path local/distant direct.")
      }
    }

    // 2. SYNC RELATIONNELLE (Campagnes, Personnages, Quêtes)
    console.log(`🏰 Sync SQL (Campaigns/Chars/Quests)...`)
    
    // Update Campagne
    await supabase.from('campaigns').update({
      current_location: newState.currentLocation,
      current_time_of_day: newState.currentTimeOfDay,
      scene_description: newState.currentScene?.description,
      scene_image: newState.currentScene?.image,
      is_generating: false,
      updated_at: new Date().toISOString()
    }).eq('id', campaignId)

    // Update Personnages (PV)
    if (newState.partyStatus) {
      for (const charStatus of newState.partyStatus) {
        const charId = `${campaignId}_${charStatus.id}`
        await supabase.from('characters').update({
          hp_current: charStatus.hp,
          updated_at: new Date().toISOString()
        }).eq('id', charId)
      }
    }
    
    // Update Quêtes
    if (newState.activeQuests) {
      for (const quest of newState.activeQuests) {
        await supabase.from('quests').upsert({
          campaign_id: campaignId,
          title: quest.title,
          description: quest.description,
          priority: quest.priority || 'normal'
        }, { onConflict: 'campaign_id, title' })
      }
    }

    console.log(`\n✨ SYNC RÉUSSIE ! Tableau de bord mis à jour pour ID:${campaignId}`)

  } catch (err) {
    console.error(`\n❌ ERREUR SYNC: ${err.message}`)
    process.exit(1)
  }
}

const jsonArg = process.argv[2]
const imageArg = process.argv[3]
if (!jsonArg) {
  console.error("Usage: node scripts/dm-sync.js <path_to_json> [path_to_image] [campaign_id]")
  process.exit(1)
}
sync(jsonArg, imageArg)
