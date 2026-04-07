import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function update() {
  const grimoires = {
    '4_diaz': [
      { name: "Équipement Tridimensionnel", desc: "Permet un déplacement ultra-rapide en utilisant les murs et structures (bonus de mouvement, évite les attaques d'opportunité si réussi)." },
      { name: "Frappe Chirurgicale", desc: "Une attaque ciblée visant la nuque pour des dégâts critiques massifs." }
    ],
    '4_bigorneau': [
      { name: "Équipement Tridimensionnel", desc: "Permet un déplacement en hauteur rapide." },
      { name: "Agilité Féline", desc: "Permet d'esquiver in-extremis (avantage au jet de sauvegarde Dextérité)." }
    ],
    '4_moultar': [
      { name: "Tridimensionnel (Lourd)", desc: "Plus lent mais permet de s'ancrer solidement dans un obstacle." },
      { name: "Garde de Fer", desc: "Encaisse une attaque fatale à la place d'un allié adjacent." }
    ]
  };
  
  for (const id in grimoires) {
    const { error } = await supabase.from('characters').update({ grimoire: grimoires[id] }).eq('id', id);
    if (error) console.error("⚠️ Error updating", id, error);
    else console.log("✅ Grimoire updated for", id);
  }
}
update();
