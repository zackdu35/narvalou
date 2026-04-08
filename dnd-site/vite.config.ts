import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'dice-roller-api',
        configureServer(server) {
          server.middlewares.use('/api/roll-dice', (req, res) => {
            try {
              const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
              const query = url.searchParams.get('expr')
              const label = url.searchParams.get('label') || ''
              
              if (!query) {
                res.statusCode = 400; res.end(JSON.stringify({ error: 'Missing expr parameter' })); return
              }

              const scriptPath = path.resolve(__dirname, '../.agents/plugins/dnd/scripts/roll-dice.sh')
              console.log("🎲 Lancement du dé, script:", scriptPath)
              const cmd = `"${scriptPath}" "${query}" --label "${label}"`
              const output = execSync(cmd).toString()
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ output }))
            } catch (error: any) {
              console.error("❌ Erreur API roll-dice:", error.message)
              res.statusCode = 500; res.end(JSON.stringify({ error: error.message }))
            }
          })

          // --- ADMIN PROXY (Bypasses RLS for critical state) ---
          server.middlewares.use('/api/admin-proxy', async (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
            let body = '';
            req.on('data', chunk => { body += chunk })
            req.on('end', async () => {
              try {
                const { method, table, id, data, filter, match } = JSON.parse(body)
                const { createClient } = await import('@supabase/supabase-js')
                const adminClient = createClient(env.VITE_SUPABASE_URL || '', env.SUPABASE_SERVICE_ROLE_KEY || '')
                
                let result;
                if (method === 'STORAGE_UPLOAD') {
                  const { bucket, path, base64, contentType } = data || {}
                  const buffer = Buffer.from(base64, 'base64')
                  result = await adminClient.storage.from(bucket).upload(path, buffer, { 
                    contentType: contentType || 'image/png', 
                    upsert: true 
                  })
                } else if (method === 'INSERT') {
                  result = await adminClient.from(table).insert(data).select()
                } else if (method === 'DELETE') {
                  result = await adminClient.from(table).delete().match(match || { id })
                } else {
                  let query: any = adminClient.from(table).update(data, { count: 'exact' }).eq('id', id)
                  if (filter?.neq) query = query.neq(filter.neq.col, filter.neq.val)
                  result = await query
                }
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(result))
              } catch (error: any) {
                console.error("❌ Erreur API admin-proxy:", error.message)
                res.statusCode = 500; res.end(JSON.stringify({ error: error.message }))
              }
            })
          })
      }
    }
  ],
}})
