import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'

// Load .env
dotenv.config({ path: '../dnd-site/.env' })
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: Missing Supabase URL or SERVICE_ROLE_KEY for high-privilege sync.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function sync(jsonPath, imagePath) {
  try {
    let newState = JSON.parse(await fs.readFile(jsonPath, 'utf8'))
    
    // 1. Upload image if provided
    if (imagePath) {
      console.log(`📤 Uploading image: ${imagePath}...`)
      const fileName = path.basename(imagePath)
      const fileData = await fs.readFile(imagePath)
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('campaign-assets')
        .upload(`sessions/3/${fileName}`, fileData, {
          contentType: 'image/png',
          upsert: true
        })
        
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-assets')
        .getPublicUrl(`sessions/3/${fileName}`)
        
      console.log(`✅ Image uploaded: ${publicUrl}`)
      newState.currentScene.image = publicUrl
      newState.currentScene.isGenerating = false
    }

    // 2. Update live_game (id: 1)
    console.log(`🔄 Updating live board (id: 1)...`)
    const { error: updateError } = await supabase
      .from('live_game')
      .update({ 
        data: newState,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      
    if (updateError) throw updateError
    
    console.log(`✨ Live board synced successfully!`)
    console.log(`📍 Location: ${newState.currentLocation}`)

  } catch (err) {
    console.error(`❌ Sync error: ${err.message}`)
    process.exit(1)
  }
}

const jsonArg = process.argv[2]
const imageArg = process.argv[3]

if (!jsonArg) {
  console.error("Usage: node scripts/dm-sync.js <path_to_json> [path_to_image]")
  process.exit(1)
}

sync(jsonArg, imageArg)
