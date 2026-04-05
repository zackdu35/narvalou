import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'

dotenv.config({ path: '../dnd-site/.env' })
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function upload(filePath, bucketName = 'campaign-assets') {
  const fileName = path.basename(filePath)
  const fileData = await fs.readFile(filePath)
  
  // Try to create bucket if it doesn't exist (might fail if not admin, but we use service role)
  const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName)
  if (bucketError) {
    console.log(`Bucket ${bucketName} not found, trying to create it...`)
    await supabase.storage.createBucket(bucketName, { public: true })
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(`sessions/3/${fileName}`, fileData, {
      contentType: 'image/png',
      upsert: true
    })

  if (error) {
    console.error('Upload Error:', error)
    return
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(`sessions/3/${fileName}`)

  console.log('Public URL:', publicUrl)
  return publicUrl
}

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node upload-image.js <path_to_file>')
  process.exit(1)
}

upload(filePath)
