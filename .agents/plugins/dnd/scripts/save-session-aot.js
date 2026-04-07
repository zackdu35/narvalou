import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function saveSession() {
  const campaignId = 4; // Attack on Titan
  const sessionData = {
    campaign_id: campaignId,
    session_number: 1,
    title: "Le Mur Rose Vacille",
    date: new Date().toISOString().split('T')[0],
    summary: "L'escouade est frappée de plein fouet par l'apparition du Titan Colossal au District de Trost.",
    story: [
      {
        url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/trost_courtyard_1775592576974.png",
        text: "L'après-midi était calme à la caserne de Trost, avant que l'ombre ne recouvre le monde."
      },
      {
        url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/trost_titan_attack_1775593341372.png",
        text: "Une explosion de vapeur rouge, et le muret supérieur est broyé par une main gigantesque."
      },
      {
        url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/bigorneau_blast_back_1775594578452.png",
        text: "Bigorneau est foudroyé par le souffle thermique et entame une chute mortelle."
      },
      {
        url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/aot_3dm_action_1775593987999.png",
        text: "Malgré la terreur, Diaz et Moultar activent leurs grappins pour sauver leur ami."
      }
    ],
    highlights: [
      "Apparition surprise du Titan Colossal",
      "Bigorneau survit miraculeusement à une chute de 50m",
      "Sauvetage héroïque d'une famille bloquée sous une charrette",
      "Face-à-face final avec un titan de 15m dans les ruelles"
    ]
  };

  console.log("💾 Sauvegarde de la session 1 dans Supabase...");
  
  // On supprime l'ancienne si elle existe pour éviter les doublons lors des tests
  await supabase.from('sessions').delete().eq('campaign_id', campaignId).eq('session_number', 1);

  const { data, error } = await supabase.from('sessions').insert([sessionData]);

  if (error) {
    console.error("❌ Erreur lors de la sauvegarde :", error.message);
  } else {
    console.log("✅ Session 1 sauvegardée avec succès ! Les joueurs peuvent la voir dans les Chroniques.");
  }
}

saveSession();
