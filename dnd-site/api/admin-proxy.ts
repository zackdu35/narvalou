import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { method, table, id, data, filter, match } = req.body

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Missing Supabase credentials in environment' })
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  try {
    let result;
    
    // Explicitly check for STORAGE_UPLOAD first to avoid falling through to database logic
    if (method === 'STORAGE_UPLOAD') {
      const { bucket, path, base64, contentType } = data || {}
      if (!bucket || !path || !base64) {
        throw new Error(`Missing storage parameters: bucket=${bucket}, path=${path}, hasBase64=${!!base64}`)
      }
      const buffer = Buffer.from(base64, 'base64')
      result = await adminClient.storage.from(bucket).upload(path, buffer, { 
        contentType: contentType || 'image/png', 
        upsert: true 
      })
      
      if (result.error) {
        return res.status(200).json({ error: result.error, data: null })
      }
      return res.status(200).json(result)
    }

    // Database operations
    if (!table) {
      return res.status(400).json({ error: 'Missing table name for database operation' })
    }

    if (method === 'INSERT') {
      result = await adminClient.from(table).insert(data).select()
    } else if (method === 'DELETE') {
      result = await adminClient.from(table).delete().match(match || { id })
    } else if (method === 'UPDATE' || !method) {
      let query: any = adminClient.from(table).update(data, { count: 'exact' }).eq('id', id)
      if (filter?.neq) {
        query = query.neq(filter.neq.col, filter.neq.val)
      }
      result = await query
    } else {
      return res.status(400).json({ error: `Unsupported method: ${method}` })
    }

    return res.status(200).json(result)
  } catch (error: any) {
    console.error(`❌ Admin Proxy Error [${method}]:`, error.message)
    return res.status(500).json({ error: error.message, methodRequested: method })
  }
}
