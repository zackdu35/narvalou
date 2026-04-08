import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  // Add CORS headers if needed, though Vercel handles this mostly
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
    if (method === 'INSERT') {
      result = await adminClient.from(table).insert(data).select()
    } else if (method === 'DELETE') {
      result = await adminClient.from(table).delete().match(match || { id })
    } else {
      // UPDATE
      let query: any = adminClient.from(table).update(data, { count: 'exact' }).eq('id', id)
      if (filter?.neq) {
        query = query.neq(filter.neq.col, filter.neq.val)
      }
      result = await query
    }
    return res.status(200).json(result)
  } catch (error: any) {
    console.error("❌ Erreur API admin-proxy:", error.message)
    return res.status(500).json({ error: error.message })
  }
}
