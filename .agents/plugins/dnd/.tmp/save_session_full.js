import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/.agents/plugins/dnd/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const sessionData = {
  campaign_id: 4,
  session_number: 1,
  title: "Le Mur Rose Vacille",
  date: "2026-04-07",
  summary: "L'escouade de recrues composée de diAz, Moultar et Bigorneau a survécu à l'attaque dévastatrice du Titan Colossal sur le District de Trost. Malgré la chute d'un district entier, ces trois héros ont sauvé des centaines de vies avant de se replier derrière le Mur Rose.",
  highlights: [
    "Apparition soudaine du Titan Colossal et destruction de la porte de Trost.",
    "Bigorneau survit par miracle à une chute mortelle (Jet de Sauvegarde : 20 Naturel !).",
    "Moultar terrasse un Titan de 15 mètres à lui seul avec ses lames d'entraînement (20 Naturel !).",
    "diAz prend le contrôle du mécanisme de la porte intérieure pour assurer l'évacuation des civils (20 Naturel !).",
    "Retrouvailles émouvantes et retraite finale vers le Mur Rose."
  ],
  story: [
    {
      url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/trost_courtyard_1775592576974.png",
      text: "La cour de la caserne de Trost, plongée dans une quiétude précaire avant le drame."
    },
    {
      url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/trost_titan_attack_1775593341372.png",
      text: "L'apparition terrifiante du Titan Colossal surplombant le Mur Rose."
    },
    {
      url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/aot_3dm_action_1775593987999.png",
      text: "L'envol désespéré des recrues utilisant leur équipement de manœuvre tridimensionnelle."
    },
    {
      url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/bigorneau_blast_back_1775594578452.png",
      text: "Le souffle thermique expulse Bigorneau de la muraille, le condamnant à une chute certaine."
    },
    {
      url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/moultar_rescue_dive_1775595919389.png",
      text: "Alors que les Titans envahissent Trost, Moultar plonge pour sauver une famille piégée."
    },
    {
      url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/moultar_victory_over_titan_1775596258634.png",
      text: "Exploit monumental : Moultar terrasse un Titan de 15 mètres avec ses lames d'entraînement."
    },
    {
      url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/aot_heroic_reunion_1775596649099.png",
      text: "Miracle dans le chaos : Moultar et Bigorneau se retrouvent vivants au pied du mur."
    },
    {
      url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/diaz_gate_sacrifice_1775596961415.png",
      text: "diAz prend le contrôle du mécanisme pour assurer l'évacuation alors que la porte descend."
    },
    {
      url: "https://uohvjrnrfcjnbtwrslqo.supabase.co/storage/v1/object/public/campaign-assets/scenes/4/aot_session1_ending_1775597541242.png",
      text: "Fin de Session : L'escouade est saine et sauve, mais Trost est officiellement tombée."
    }
  ]
};

async function run() {
  await supabase.from('sessions').delete().eq('campaign_id', 4).eq('session_number', 1);
  const { error } = await supabase.from('sessions').insert([sessionData]);
  if (error) console.error("❌ Erreur sauvegarde session:", error);
  else console.log("✅ Session 1 mise à jour avec l'intégralité des images !");
}
run();
