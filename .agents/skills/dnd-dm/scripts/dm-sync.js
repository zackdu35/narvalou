import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'

// Charger le .env du skill
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERREUR: Supabase URL ou SERVICE_ROLE_KEY manquante.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function sync(jsonPath, imagePath) {
  try {
    console.log(`📖 Lecture du nouvel état: ${jsonPath}...`)
    const newState = JSON.parse(await fs.readFile(jsonPath, 'utf8'))
    const campaignId = process.argv[4] || 1 // Défaut à 1 (Padhiver)
    
    // --- 1. GESTION DES IMAGES ---
    if (imagePath && imagePath !== 'null') {
      console.log(`📤 Upload de l'image de scène...`)
      const fileName = path.basename(imagePath)
      const fileData = await fs.readFile(imagePath)
      
      const { error: uploadError } = await supabase.storage
        .from('campaign-assets')
        .upload(`scenes/${campaignId}/${fileName}`, fileData, {
          contentType: 'image/png',
          upsert: true
        })
        
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-assets')
        .getPublicUrl(`scenes/${campaignId}/${fileName}`)
        
      newState.currentScene.image = publicUrl
    }

    // --- 2. UPDATE TABLE: campaigns (MÉTADONNÉES & SCÈNE) ---
    console.log(`🏰 Mise à jour de la table 'campaigns'...`)
    const { error: campError } = await supabase
      .from('campaigns')
      .update({
        current_location: newState.currentLocation,
        current_time_of_day: newState.currentTimeOfDay,
        scene_description: newState.currentScene?.description,
        scene_image: newState.currentScene?.image,
        is_generating: newState.currentScene?.isGenerating || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (campError) throw campError

    // --- 3. UPDATE TABLE: characters (POINTS DE VIE) ---
    if (newState.partyStatus) {
      console.log(`🕵️ Mise à jour de la santé des héros...`)
      for (const charStatus of newState.partyStatus) {
        // L'ID dans la table characters est campaignId_charId (ex: 1_diaz)
        const charId = `${campaignId}_${charStatus.id}`
        const { error: charError } = await supabase
          .from('characters')
          .update({
            hp_current: charStatus.hp,
            updated_at: new Date().toISOString()
          })
          .eq('id', charId)

        if (charError) console.warn(`⚠️ Warning: Impossible de mettre à jour le perso ${charId}:`, charError.message)
      }
    }

    // --- 4. UPDATE TABLE: quests (QUÊTES ACTIVES) ---
    if (newState.activeQuests) {
      console.log(`📜 Nettoyage et synchronisation des quêtes...`)
      
      // 1. On supprime les anciennes quêtes pour repartir sur une base propre
      await supabase.from('quests').delete().eq('campaign_id', campaignId)

      // 2. On insère les quêtes actuellement actives dans le JSON
      for (const quest of newState.activeQuests) {
        await supabase.from('quests').insert({
          campaign_id: campaignId,
          title: quest.title,
          description: quest.description,
          priority: quest.priority || 'normal'
        })
      }
    }

    console.log(`\n✅ SYNCHRONISATION RELATIONNELLE RÉUSSIE !`)
    console.log(`📍 Lieu: ${newState.currentLocation}`)
    console.log(`🎭 Scène: ${newState.currentScene?.description?.substring(0, 50)}...`)

    // --- 5. SIGNAL REFRESH TO CLIENTS (Realtime Bridge v3) ---
    console.log(`📡 Envoi du signal de rafraîchissement avec données...`)
    const signalData = {
      location: newState.currentLocation,
      time: newState.currentTimeOfDay,
      description: newState.currentScene?.description,
      image: newState.currentScene?.image
    }
    await supabase.from('messages').insert([{
      sender_id: 'SYSTEM',
      receiver_id: 'global',
      content: `[SYNC_SCENE:${JSON.stringify(signalData)}]`,
      campaign_id: campaignId
    }])

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
