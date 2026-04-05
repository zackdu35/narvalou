import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('=')))

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const text = process.argv.slice(2).join(' ')
if (!text) {
  console.error("Usage: node scripts/speakTerm.js <message>")
  process.exit(1)
}

const { error } = await supabase
  .from('messages')
  .insert([{
    sender_id: 'DM',
    receiver_id: 'global',
    content: text
  }])

if (error) console.error("Error:", error.message)
else console.log(`\n🧙‍♂️ DM: ${text}`)
