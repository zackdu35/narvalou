import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim())))

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function manageCampaigns() {
  console.log("🔍 Fetching campaigns...")
  
  const { data: campaigns, error: fetchError } = await supabase
    .from('live_game')
    .select('id, data')

  if (fetchError) {
    console.error("Error fetching campaigns:", fetchError.message)
    return
  }

  // 1. DELETE HARRY POTTER CAMPAIGNS
  const toDelete = campaigns.filter(c => c.data && (
    c.data.universe === 'Harry Potter' || 
    (c.data.campaignName && c.data.campaignName.toLowerCase().includes('harry'))
  ))

  if (toDelete.length > 0) {
    for (const c of toDelete) {
      console.log(`🗑️ Deleting Harry Potter campaign ${c.id}: "${c.data.campaignName}"`)
      const { error: delError } = await supabase.from('live_game').delete().eq('id', c.id)
      if (delError) console.error(`Error deleting ${c.id}:`, delError.message)
      else console.log(`✅ Deleted ${c.id}`)
    }
  } else {
    console.log("ℹ️ No Harry Potter campaigns found.")
  }

  // 2. RENAME CAMPAIGN 1
  const campaign1 = campaigns.find(c => c.id === 1)
  if (campaign1) {
    console.log(`📝 Renaming campaign 1 to "Les Mines Oubliées de Phandelver"...`)
    const updatedData = { ...campaign1.data, campaignName: "Les Mines Oubliées de Phandelver" }
    const { error: updateError } = await supabase
      .from('live_game')
      .update({ data: updatedData })
      .eq('id', 1)

    if (updateError) console.error("Error renaming campaign 1:", updateError.message)
    else console.log("✅ Campaign 1 renamed successfully!")
  } else {
    console.log("❌ Campaign 1 not found in database.")
  }
}

manageCampaigns()
