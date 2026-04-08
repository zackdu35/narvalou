
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase env missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function unstick() {
  console.log('🔄 Unsticking is_generating flags...')
  const { data, error } = await supabase
    .from('campaigns')
    .update({ is_generating: false })
    .eq('is_generating', true)
  
  if (error) {
    console.error('❌ Error updating database:', error)
  } else {
    console.log('✅ Campaigns unjammed.')
  }
}

unstick()
