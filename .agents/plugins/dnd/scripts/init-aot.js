import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log("Checking if AoT campaign exists...")
  let { data: campaigns, error: selectErr } = await supabase
    .from('campaigns')
    .select('*')
    .ilike('name', '%titan%')

  if (selectErr) {
    console.error('Error fetching campaigns:', selectErr)
    return
  }
  
  let campaignId;
  
  if (campaigns.length === 0) {
    console.log("No AoT campaign found. Creating one...")
    const { data: newCampaign, error: insertErr } = await supabase
      .from('campaigns')
      .insert([{
        name: "L'Attaque des Titans",
        
        current_location: "Camp d'entraînement",
        current_time_of_day: "Matin",
        scene_description: "Premier jour des recrues, sur la place d'entraînement."
      }])
      .select()
    
    if (insertErr) {
       console.error("Error creating campaign:", insertErr)
       return;
    }
    campaignId = newCampaign[0].id
    console.log("Created successfully with ID:", campaignId)
  } else {
    campaignId = campaigns[0].id
    console.log("Found existing AoT campaign with ID:", campaignId)
  }

  const characters = [
    { name: 'diAz', class: 'Recrue' },
    { name: 'Bigorneau', class: 'Recrue' },
    { name: 'Moultar', class: 'Recrue' }
  ];

  for (const char of characters) {
    const cid = `${campaignId}_${char.name.toLowerCase()}`
    
    let { data: charData } = await supabase.from('characters').select('id').eq('id', cid)
    if (!charData || charData.length === 0) {
      await supabase.from('characters').insert([{
        id: cid,
        campaign_id: campaignId,
        name: char.name,
        class: char.class,
        level: 1,
        hp_max: 12, // simple default max, will be synced
        hp_current: 12
      }])
      console.log("Inserted char:", char.name)
    }
  }

  console.log("CAMPAIGN_READY_ID=" + campaignId)
}

main()
