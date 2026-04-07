import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/.agents/plugins/dnd/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const msgText = `La nuit tombe désormais sur le Mur Rose, une nuit noire et silencieuse, seulement troublée par les sanglots lointains des réfugiés. @diAz, tu t'effondres sur un lit de camp dans une caserne de fortune, tes muscles encore tremblants de l'effort monumental pour maintenir la porte. @Bigorneau, après avoir reçu les soins nécessaires, tu sombres dans un sommeil profond, ton corps commençant enfin à se réparer. Et @Moultar, tu restes un dernier instant à contempler les lueurs des incendies au loin : Trost n'est plus qu'un cimetière de pierre. 

Vous bénéficiez tous d'un **REPOS LONG**. Vos PV sont entièrement restaurés. 

**FIN DE LA SESSION 1.**
Félicitations à tous, vous avez survécu à l'une des journées les plus sombres de l'histoire de l'humanité. L'escouade est soudée comme jamais. Préparez-vous pour la suite, car le monde ne sera plus jamais le même.`;

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
