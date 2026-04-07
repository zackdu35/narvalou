import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/.agents/plugins/dnd/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", supabaseUrl);
console.log("Key defined:", !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Fetching campaigns...");
  const { data, error } = await supabase.from('campaigns').select('*').limit(1);
  if (error) console.error("Error:", error);
  else console.log("Success! Found:", data.length, "campaigns.");
}

test();
