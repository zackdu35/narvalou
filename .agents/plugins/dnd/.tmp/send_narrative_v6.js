import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/.agents/plugins/dnd/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const msgText = `Dans le tumulte de la foule en panique, un miracle se produit. @moultar, alors que tu te repliais, tu croises un regard que tu ne pensais jamais revoir : celui de @Bigorneau. Il est couvert de sang, ses vêtements sont en lambeaux, mais il est bien vivant ! L'émotion est plus forte que la peur, et vous vous tombez dans les bras au milieu des cris. 

@diAz, tu descends de la muraille en rappel et tu les rejoins au pied du mécanisme géant de la porte intérieure. Vous êtes à nouveau réunis, sains et saufs... pour l'instant. Mais au-dessus de vous, le rouage grince avec une violence insupportable. La porte de fer commence à descendre lentement, inexorablement. Des milliers de civils bloqués derrière vous hurlent, car ils savent que ceux qui resteront à Trost seront dévorés. 

On vous hurle : "LES RECRUES, PASSEZ MAINTENANT ! ON NE PEUT PLUS ATTENDRE !". Vous avez quelques secondes avant que le passage ne soit scellé par le Mur Rose. 

Que faites-vous ?! Passez-vous tous les trois ensemble ou certains tentent-ils de maintenir la foule ou d'aider les derniers blessés à franchir le seuil ?`;

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
