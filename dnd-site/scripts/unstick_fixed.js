
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uohvjrnrfcjnbtwrslqo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvaHZqcm5yZmNqbmJ0d3JzbHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDk5NjUsImV4cCI6MjA5MDk4NTk2NX0.7mGkkfd516eH6O1J10WD-ZjuQVvTbwf_2ZQt-wDv-cs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function unstick() {
  console.log('🔄 Repairing database...')
  const { data, error } = await supabase
    .from('campaigns')
    .update({ is_generating: false })
    .eq('is_generating', true)
  
  if (error) {
    console.error('❌ Error updating database:', error)
  } else {
    console.log('✅ DATABASE REPAIRED: is_generating is now FALSE for all campaigns.')
  }
}

unstick()
