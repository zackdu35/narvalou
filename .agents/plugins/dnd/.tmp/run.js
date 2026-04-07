import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const msg = `\"Bien sûr que vous les avez à la taille, @DiAz !\" hurle Shadis en parant un morceau de débris enflammé. \"Vous êtes diplômés ! Propulsez-vous !!\"\n\nSans réfléchir, @Bigorneau sent son instinct prendre le dessus. Ses doigts pressent machinalement les gâchettes de ses lames. Les grappins d'acier jaillissent dans un sifflement strident et s'enfoncent dans le calcaire du Mur Rose.\nLa pression du gaz le balaye brutalement vers les hauteurs. \n\nEn un instant, Bigorneau atterrit maladroitement sur le parapet de la muraille. Et là... l'horreur absolue.\nLe titanesque visage écorché du Dieu de la Destruction masque entièrement l'horizon. Ses yeux exorbités et vides fixent la ville miniature en contrebas. Une vague de chaleur apocalyptique, chargée d'une vapeur brûlante, frappe l'escouade au visage. \n\n@Bigorneau, tu es seul en face-à-face avec la divinité de la destruction. Tes poumons brûlent litéralement sous la vapeur, fais-moi un **Jet de Sauvegarde de Constitution** !
@Moultar et @Diaz, vous êtes en contrebas. Allez-vous le rejoindre ou tenter une manœuvre offensive directe sur la nuque du monstre ?`;

async function run() {
  await supabase.from('messages').insert([{
    sender_id: 'SYSTEM',
    receiver_id: 'global',
    content: msg,
    campaign_id: 4
  }]);
  console.log('Message Envoyé !');
}
run();
