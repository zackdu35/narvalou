import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const queries = ['exec_sql', 'eval_sql', 'query', 'sql', 'run_sql'];
  for (const q of queries) {
    console.log(`Testing RPC: ${q}`);
    const { data, error } = await supabase.rpc(q, { sql: 'SELECT 1' });
    if (!error) {
      console.log(`✅ Found RPC: ${q}`);
      process.exit(0);
    } else {
      console.log(`❌ RPC ${q} failed: ${error.message}`);
    }
  }
}
run();
