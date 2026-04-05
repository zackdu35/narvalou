import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Charger les variables du .env (parsing manuel simple)
const envFile = fs.readFileSync('.env', 'utf8')
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('=')))

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials not found in .env")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log("--- 🕵️‍♂️ MONITORING ADVENTURE CHAT ---")

// Monitor ALL messages for the DM (Antigravity)
const channel = supabase
  .channel('dm-bridge')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'messages' 
  }, (payload) => {
    const msg = payload.new
    if (msg.sender_id === 'DM') return; // Ignore own messages

    const targetLabel = msg.receiver_id === 'global' ? '[COMMUN]' : `[PRIVÉ -> ${msg.receiver_id}]`
    console.log(`\n💬 ${targetLabel} ${msg.sender_id}: ${msg.content}`)
    console.log("-----------------------------------")
  })
  .subscribe()

// Function to send a message as the DM
export const speakAsDM = async (text, receiverId = 'global') => {
  const { error } = await supabase
    .from('messages')
    .insert([{
      sender_id: 'DM',
      receiver_id: receiverId,
      content: text
    }])
  
  if (error) console.error("Error sending response:", error)
  else console.log(`\n🧙‍♂️ DM sent: ${text}`)
}

// Keeping the process alive
process.stdin.resume()
