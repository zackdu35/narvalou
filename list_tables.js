
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/dnd-site/.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function listSchema() {
  const { data, error } = await supabase.rpc('get_tables')
  if (error) {
    // If RPC doesn't exist, try a direct query to information_schema
    const { data: tables, error: tableError } = await supabase.from('messages').select('*').limit(1)
    if (tableError) {
      console.error("Couldn't check schema:", tableError.message)
      return
    }
    console.log("Found table: messages")
    
    const { data: live, error: liveError } = await supabase.from('live_game').select('*').limit(1)
    if (liveError) {
      console.error("Couldn't check schema:", liveError.message)
      return
    }
    console.log("Found table: live_game")
  } else {
    console.log(data)
  }
}

listSchema()
