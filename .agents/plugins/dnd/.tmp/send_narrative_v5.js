import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/.agents/plugins/dnd/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const msgText = `@moultar, tu es une légende vivante ! (NATURAL 20 !!) Alors que le colosse de 15 mètres s'apprête à porter son coup sur ta ruelle, tu le percuteras de plein fouet sur la nuque. Le choc est d'une violence inouïe. On entend un craquement de cervicales écrasées par tes lames émoussées, et le monstre s'effondre avec un fracas de séisme ! Tu triomphes au milieu de la fumée, debout sur le cou de la bête. 

Pendant ce temps, à la barricade, @diAz, tes mots résonnent avec une puissance que personne ne peut ignorer ! (**20 Naturel !**) Les soldats de la garnison, émus par ton leadership et ton courage, ouvrent les vannes in extremis. La foule s'engouffre dans le tunnel, évitant de justesse le carnage des Titans de 4 mètres qui arrivaient par les rues adjacentes. @Bigorneau (1 PV!), tu les accompagnes et t'assures que personne n'est laissé pour compte alors qu'ils franchissent la porte intérieure.

Cependant, alors que vous croyez avoir un instant de répit, une corne de brume lugubre déchire l'air. La cloche sonne : la **retraite générale** est ordonnée. Trost est officiellement perdue. Il ne vous reste que peu de temps pour rejoindre l'intérieur du Mur Rose avant que la porte ne soit définitivement scellée. Que faites-vous pour ce repli final ?`;

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
