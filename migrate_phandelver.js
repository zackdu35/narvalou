import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: './.agents/skills/dnd-dm/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERREUR: URL Supabase ou SERVICE_ROLE_KEY manquante dans le .env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  try {
    console.log("📂 Lecture du fichier campaign.json...");
    const jsonPath = path.resolve('./dnd-site/src/data/campaign.json');
    const campaign = JSON.parse(await fs.readFile(jsonPath, 'utf8'));

    const campaignId = 1; // On force l'ID 1 pour Padhiver

    console.log(`🏰 Migration de la campagne: ${campaign.campaignName} (ID: ${campaignId})...`);

    // 1. Migration des métadonnées de la campagne
    const { error: campError } = await supabase
      .from('campaigns')
      .upsert({
        id: campaignId,
        name: campaign.campaignName,
        dm_name: campaign.dm,
        summary: campaign.summary,
        universe: "D&D 5e",
        updated_at: new Date().toISOString()
      });

    if (campError) throw campError;
    console.log("✅ Métadonnées de campagne synchronisées.");

    // 2. Migration des personnages
    console.log("🕵️ Migration des personnages...");
    for (const char of campaign.characters) {
      const charId = `${campaignId}_${char.id}`;
      const { error: charError } = await supabase
        .from('characters')
        .upsert({
          id: charId,
          campaign_id: campaignId,
          name: char.name,
          race: char.race,
          class: char.class,
          level: char.level,
          hp_current: char.hp.current,
          hp_max: char.hp.max,
          xp_current: char.xp.current,
          xp_next: char.xp.next,
          stats: char.stats,
          inventory: char.inventory,
          grimoire: char.grimoire,
          features: char.features,
          image: char.image,
          description: char.description,
          ideals: char.ideals,
          bonds: char.bonds,
          spell_slots: char.spellSlots || { current: 0, max: 0 },
          updated_at: new Date().toISOString()
        });

      if (charError) throw charError;
      console.log(`   - Personnage ${char.name} synchronisé.`);
    }

    // 3. Migration des sessions (Chroniques)
    console.log("📜 Migration des chroniques (sessions)...");
    
    // On commence par vider les sessions existantes pour ID 1 pour éviter les doublons
    await supabase.from('sessions').delete().eq('campaign_id', campaignId);

    for (const session of campaign.sessions) {
      const { error: sessError } = await supabase
        .from('sessions')
        .insert({
          campaign_id: campaignId,
          session_number: session.id,
          title: session.title,
          date: session.date,
          summary: session.summary,
          story: session.story, // On injecte tout l'historique narration + images
          highlights: session.highlights
        });

      if (sessError) throw sessError;
      console.log(`   - Session #${session.id}: ${session.title} synchronisée.`);
    }

    console.log("\n✨ MIGRATION TERMINÉE AVEC SUCCÈS ! ✨");
    console.log(`🔗 Votre campagne '${campaign.campaignName}' est maintenant 100% online.`);
    
  } catch (err) {
    console.error("\n❌ ERREUR LORS DE LA MIGRATION:", err.message);
    process.exit(1);
  }
}

migrate();
