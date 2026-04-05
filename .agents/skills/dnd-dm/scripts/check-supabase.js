import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '../../../../dnd-site/.env' })
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkLive() {
  const { data, error } = await supabase.from('live_game').select('*')
  if (error) {
    console.error(error)
    return
  }
  console.log(JSON.stringify(data, null, 2))
}

checkLive()
