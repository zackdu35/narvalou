import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/.agents/plugins/dnd/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const msgText = `Pour récupérer de la vie, vous avez plusieurs options selon la situation : 

1. **Le Repos Court (1h)** : Vous pouvez dépenser vos **Dés de Vie** (Hit Dice) pour regagner des PV. Pour vous, c'est **1d10 + modificateur de Constitution** par dé. Un dé est dépensé à chaque lancer. Vous avez un nombre de dés égal à votre niveau (Niveau 1 = 1 dé).
2. **Le Repos Long (8h)** : Une nuit de sommeil complète dans un endroit sûr (comme le camp de réfugiés derrière le Mur Rose) vous rend **tous vos PV** automatiquement et la moitié de vos Dés de Vie dépensés. 
3. **Assistance Médicale** : @Bigorneau, comme tu es à seulement 1 PV, tu as grandement besoin de voir l'un des médecins de la brigade de soutien. Un jet de Médecine réussi ou des premiers soins peuvent te stabiliser ou te rendre quelques PV immédiatement. 

Voulez-vous tenter un Repos Court ici ou préférez-vous chercher un camp de réfugiés pour un Repos Long ?`;

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
