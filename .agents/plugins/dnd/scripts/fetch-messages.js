import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/.agents/plugins/dnd/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .ilike('name', '%titan%')

  if (!campaigns || campaigns.length === 0) return

  const campaignId = campaigns[0].id

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(50)

  messages.reverse().forEach(m => {
    console.log(`[${m.created_at}] ${m.sender_id}: ${m.content}`)
  })
}

main()
