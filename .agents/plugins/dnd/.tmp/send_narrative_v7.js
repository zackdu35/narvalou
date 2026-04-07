import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/.agents/plugins/dnd/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const msgText = `@diAz, ton regard noir pétrifie le soldat de la garnison. Tu le repousses d'un geste sec et tu te saisis du levier. Les muscles de tes bras semblent sur le point de rompre, mais tu maîtrises le mécanisme. Tu gères le flux de civils avec une autorité naturelle, permettant à des centaines de fuyards de passer sous la herse qui descend. 

À travers l'ouverture qui se réduit, tu vois @moultar soutenir @Bigorneau. Le jeune homme, bien que mal en point, te lance un dernier regard de reconnaissance avant d'être englouti par l'ombre protectrice du tunnel. Il est sauf. 

Le fracas de la porte qui touche le sol résonne comme un coup de tonnerre final. Trost est scellée. Le silence revient, seulement troublé par le crépitement des incendies de l'autre côté du mur. Vous êtes en vie, mais à quel prix ? L'humanité vient de perdre son premier territoire face aux Titans. 

C'est ici que nous marquons une pause pour cette session. Reposez-vous, recrues. Vous l'avez mérité.`;

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
