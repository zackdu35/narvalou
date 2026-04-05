import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('=')))

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

// Read the complete live state passed as JSON argument or from a file
let newState;
try {
  const arg = process.argv[2];
  if (arg.startsWith('{')) {
    newState = JSON.parse(arg);
  } else {
    newState = JSON.parse(fs.readFileSync(arg, 'utf8'));
  }
} catch (e) {
  console.error("Usage: node scripts/updateLive.js '<JSON_STRING>' OR node scripts/updateLive.js <path_to_json_file>")
  process.exit(1)
}

const { error } = await supabase
  .from('live_game')
  .update({ data: newState })
  .eq('id', 1)

if (error) {
  console.error("Error updating live state:", error.message)
} else {
  console.log("✅ Live board updated successfully!")
  console.log(`📍 Location: ${newState.currentLocation}`)
  console.log(`🌄 Scene: ${newState.currentScene.description.substring(0, 50)}...`)
}
