import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '../../../../dnd-site/.env' })
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function tryUpsert() {
  const liveData = JSON.parse(fs.readFileSync('../dnd-site/public/live.json', 'utf8'))
  console.log("Attempting UPSERT ID 1...")
  
  const { data, error, status, statusText } = await supabase
    .from('live_game')
    .upsert({ 
      id: 1,
      data: liveData,
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.error("Supabase Error:", error)
  } else {
    console.log("Status:", status, "StatusText:", statusText)
    console.log("Upsert Success!")
  }
}

tryUpsert()
