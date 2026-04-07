import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/.agents/plugins/dnd/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const msgText = `@Moultar, tu te précipites au pied de la muraille avec une agilité déroutante pour un Nain ! @diAz arrive juste derrière toi, tes lames forment un rempart contre l'avancée des Titans. 

La charrette est un amas de bois brisé et le père hurle de douleur. Dans un rugissement de détermination, tu saisis le châssis de tes mains nues, aidé par la force tranquille de @diAz. Vos muscles se tendent, vos visages sont rouges de l'effort, et dans un craquement de bois... VOUS LE SOULEVEZ ! (Jet de Force : **21 !**)

Le père s'extrait avec sa petite fille dans ses bras. Ils pleurent de joie alors qu'ils rampent hors de la zone d'impact. Mais votre répit est de courte durée. L'ombre d'un Titan déviant de 15 mètres recouvre désormais la petite ruelle. Il s'est arrêté de marcher et vous fixe avec son sourire figé, à seulement vingt mètres de vous. @Bigorneau, tu as distancé le gros de la horde, mais tu vois au loin une fumée noire s'élever : un second coup vient d'être porté à la porte intérieure ! 

Que faites-vous ?! @Moultar, @diAz, le Titan va charger ! Combat ou évacuation forcée avec les civils ? @Bigorneau, tu rebrousses chemin pour aider tes amis ou tu continues l'évacuation ?`;

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
