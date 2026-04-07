import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/.agents/plugins/dnd/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const msgText = `@diAz, ton saut est magnifique, tu es à deux doigts de le saisir... mais la vitesse est trop importante et tu le rates de quelques centimètres ! @Bigorneau, tu sombres vers une mort quasi-certaine, alors que tous ferment les yeux. (Jet d'Athlétisme de Diaz: 6) 

... MAIS ! Dans le sifflement du vent qui précède l'impact, un éclair de pur instinct te traverse, @Bigorneau ! Tes yeux s'ouvrent brusquement (Jet de Sauvegarde contre la Mort : **20 CRITIQUE !**). Tes mains agissent avant ton cerveau. Tes câbles jaillissent et s'ancrent violemment dans la pierre à seulement quelques mètres du pavé ! 

Tu t'immobilises brusquement, suspendu le long de la paroi. Tu es vivant ! @Bigorneau a 1 PV et il n'y a plus une seconde à perdre. Le Titan Colossal ne s'est pas arrêté là : un coup de pied titanesque vient de pulvériser la porte du District de Trost ! 

Les cloches sonnent le tocsin ! L'invasion commence. Que faites-vous ?!`;

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
