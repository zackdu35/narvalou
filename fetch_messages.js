import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '../.agents/plugins/dnd/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // First find the campaign ID for AoT
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .ilike('name', '%titan%')

  if (!campaigns || campaigns.length === 0) {
    console.log("No AoT campaign found.")
    return
  }

  const campaignId = campaigns[0].id
  console.log(`Campaign: ${campaigns[0].name} (ID: ${campaignId})`)

  // Get last 10 messages
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(15)

  if (error) {
    console.error('Error fetching messages:', error)
    return
  }

  console.log("\n--- Latest Messages ---")
  messages.reverse().forEach(m => {
    console.log(`[${m.created_at}] ${m.sender_id}: ${m.content}`)
  })
}

main()
