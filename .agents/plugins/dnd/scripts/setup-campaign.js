import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERREUR: Supabase URL ou SERVICE_ROLE_KEY manquante.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateLocalFiles(sessionFolder, config) {
  const sessionsPath = path.join(process.cwd(), 'resources', 'sessions', sessionFolder)
  await fs.mkdir(sessionsPath, { recursive: true })

  // 1. campaign-summary.md
  const summaryContent = `# Campagne: ${config.name}

**Univers :** ${config.universe}
**Système :** D&D 5e

## Statut du groupe
Pleine forme.

## Localisation actuelle
${config.location}

## Quêtes Actives
- Démarrer l'aventure !
`
  await fs.writeFile(path.join(sessionsPath, 'campaign-summary.md'), summaryContent, 'utf-8')

  // 2. campaign-log.md
  const logContent = `# Journal de Campagne : ${config.name}

## Table of Contents
1. Initiation

## Initiation
*(La campagne commence ici !)*
`
  await fs.writeFile(path.join(sessionsPath, 'campaign-log.md'), logContent, 'utf-8')

  // 3. Characters
  for (const char of config.characters) {
    const charContent = `# Feuille de Personnage : @${char.name}

**Nom:** ${char.name}
**Classe:** ${char.class}
**Niveau:** ${char.level || 1}
**Race:** ${char.race || 'Inconnue'}

## Physionomie & Personnalité
${char.description || ''}

## État de Santé
**PV Actuels:** ${char.hp_max} / ${char.hp_max}
**PV Max:** ${char.hp_max}
**Statut:** Pleine forme

## Équipement
${char.inventory ? char.inventory.map(item => '- ' + item).join('\n') : '- Rien pour l\'instant'}
`
    const charFileName = `character-${char.name.toLowerCase()}.md`
    await fs.writeFile(path.join(sessionsPath, charFileName), charContent, 'utf-8')
  }
}

async function main() {
  const jsonPath = process.argv[2]
  if (!jsonPath) {
    console.error("Usage: node scripts/setup-campaign.js <path_to_config.json>")
    process.exit(1)
  }

  console.log(`📖 Lecture de la configuration: ${jsonPath}`)
  const config = JSON.parse(await fs.readFile(jsonPath, 'utf8'))
  
  if (!config.folderName) {
    config.folderName = config.name.replace(/\\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
  }

  console.log(`🏰 Création de la campagne locale dans resources/sessions/${config.folderName}...`)
  await generateLocalFiles(config.folderName, config)

  console.log(`📡 Connexion à Supabase pour initialiser la DB...`)
  
  // Create Campaign in Supabase
  const { data: newCampaign, error: campErr } = await supabase
    .from('campaigns')
    .insert([{
      name: config.name,
      universe: config.universe,
      current_location: config.location,
      current_time_of_day: config.timeOfDay || 'Matin',
      scene_description: config.sceneDescription || 'Une nouvelle aventure commence.',
      session_number: 1,
      is_generating: false
    }])
    .select()

  if (campErr) {
    console.error("Erreur lors de la création de la campagne DB :", campErr)
    process.exit(1)
  }

  const campaignId = newCampaign[0].id
  console.log(`✅ Campagne créée avec l'ID: ${campaignId}`)

  // Create Characters in Supabase
  for (const char of config.characters) {
    const charId = `${campaignId}_${char.name.toLowerCase()}`
    
    const defaultStats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
    
    await supabase.from('characters').insert([{
      id: charId,
      campaign_id: campaignId,
      name: char.name,
      race: char.race,
      class: char.class,
      level: char.level || 1,
      hp_max: char.hp_max || 10,
      hp_current: char.hp_max || 10,
      stats: char.stats || defaultStats,
      description: char.description || '',
      inventory: char.inventory || []
    }])
    console.log(`🕵️ Personnage inséré: ${char.name}`)
  }

  console.log(`\n🎉 SETUP TERMINÉ AVEC SUCCÈS ! (ID de campagne Supabase: ${campaignId})`)
  console.log(`👉 Il ne vous reste plus qu'à générer les images (generate_image) et à les lier.`)
}

main().catch(err => {
  console.error("Erreur fatale:", err)
  process.exit(1)
})
