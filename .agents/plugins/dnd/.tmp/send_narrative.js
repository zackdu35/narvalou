import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/.agents/plugins/dnd/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const msgText = `@Moultar, ton réflexe est vif, mais la chaleur est écrasante ! Les vapeurs distordent ta vision et alors que tes doigts effleurent la veste de @Bigorneau, le souffle du Titan te déséquilibre brusquement. (Jet d'Acrobaties : 9) Tu manques ta prise ! Tu vois ton camarade, inconscient après avoir subi de lourds dégâts de brûlure (12 PV), basculer dans le vide. @Bigorneau est à terre (0 PV) et s'enfonce dans la brume de Trost ! @diAz, c'est ta dernière chance d'agir avant qu'il ne touche le sol ! Que fais-tu ?!`;

async function run() {
  const { error } = await supabase.from('messages').insert([{
    sender_id: 'Le Maître du Donjon',
    receiver_id: 'global',
    content: msgText,
    campaign_id: 4
  }]);
  if (error) console.error(error);
  else console.log('Message Envoyé !');
}
run();
