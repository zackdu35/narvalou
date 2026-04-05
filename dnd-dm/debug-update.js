import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '../dnd-site/.env' })
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugUpdate() {
  const liveData = JSON.parse(fs.readFileSync('../dnd-site/public/live.json', 'utf8'))
  console.log("Updating with data:", JSON.stringify(liveData, null, 2))
  
  const { data, error, status } = await supabase
    .from('live_game')
    .update({ 
      data: liveData,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1)
    .select()

  if (error) {
    console.error("Supabase Error:", error)
  } else {
    console.log("Status:", status)
    console.log("Updated record:", JSON.stringify(data, null, 2))
  }
}

debugUpdate()
