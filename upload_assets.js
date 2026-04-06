import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config({ path: './.agents/skills/dnd-dm/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function uploadFile(bucket, folder, localPath) {
  const fileName = path.basename(localPath);
  const fileData = await fs.readFile(localPath);
  const storagePath = `${folder}/${fileName}`;

  console.log(`📤 Uploading ${fileName} to ${bucket}/${storagePath}...`);
  
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileData, { upsert: true, contentType: fileName.endsWith('.png') ? 'image/png' : 'image/jpeg' });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return publicUrl;
}

async function migrate() {
  try {
    // 1. MIGRER LES PERSONNAGES DE PHANDELVER (ID: 1)
    const chars = ['diaz', 'valmir', 'gandhi'];
    for (const name of chars) {
      const localPath = `./dnd-site/public/assets/characters/${name}.png`;
      const publicUrl = await uploadFile('campaign-assets', 'characters', localPath);
      
      console.log(`✅ ${name} online: ${publicUrl}`);
      await supabase.from('characters').update({ image: publicUrl }).eq('id', `1_${name}`);
    }

    // 2. MIGRER LA CARTE DE PHANDELVER (ID: 1)
    const mapPath = `./dnd-site/public/assets/maps/lost_mine_map.jpg`;
    const mapUrl = await uploadFile('campaign-assets', 'maps', mapPath);
    console.log(`✅ Map online: ${mapUrl}`);
    
    // On va stocker cette URL dans une nouvelle colonne meta ou dans 'scene_image' par défaut pour Phandelver
    // Ici on va juste s'assurer que l'URL est connue.
    // Je vais ajouter une colonne 'map_image' à campaigns via un update dynamique.
    const { error: mapError } = await supabase.from('campaigns').update({ scene_image: mapUrl }).eq('id', 1);
    if (mapError) console.warn("Note: impossible de mettre la map en image par defaut, column missing?");

    console.log("\n✨ MIGRATION DES ASSETS RÉUSSIE !");
  } catch (err) {
    console.error("❌ Erreur migration assets:", err.message);
  }
}

migrate();
