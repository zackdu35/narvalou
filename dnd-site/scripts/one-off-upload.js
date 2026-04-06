import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('=')))

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function upload() {
  const filePath = process.argv[2]
  const fileName = 'session3_placeholder.png'
  const fileData = fs.readFileSync(filePath)
  
  const { data, error } = await supabase.storage
    .from('campaign-assets')
    .upload(`sessions/3/${fileName}`, fileData, {
      contentType: 'image/png',
      upsert: true
    })

  if (error) {
    console.error('Upload Error:', error)
    return
  }

  const { data: { publicUrl } } = supabase.storage
    .from('campaign-assets')
    .getPublicUrl(`sessions/3/${fileName}`)

  console.log('PUBLIC_URL:' + publicUrl)
}

upload()
