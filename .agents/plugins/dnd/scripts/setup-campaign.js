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
    
    const level = char.level || 1
    const proficiencyBonus = Math.floor((level - 1) / 4) + 2
    const stats = char.stats || defaultStats
    const dexMod = Math.floor(((stats.dex || 10) - 10) / 2)
    const strMod = Math.floor(((stats.str || 10) - 10) / 2)
    
    // Simple AC calculation: 10 + Dex mod
    const ac = 10 + dexMod
    
    // Default weapons based on class
    const defaultWeapons = []
    if (char.class?.toLowerCase().includes('guerrier') || char.class?.toLowerCase().includes('fighter')) {
      defaultWeapons.push({ name: 'Épée longue', damageDice: '1d8', damageType: 'tranchant', attackMod: 'str' })
    } else if (char.class?.toLowerCase().includes('voleur') || char.class?.toLowerCase().includes('rogue')) {
      defaultWeapons.push({ name: 'Dague', damageDice: '1d4', damageType: 'perçant', attackMod: 'dex' })
    } else if (char.class?.toLowerCase().includes('sorcier') || char.class?.toLowerCase().includes('wizard')) {
      defaultWeapons.push({ name: 'Bâton', damageDice: '1d6', damageType: 'contondant', attackMod: 'str' })
    } else {
      defaultWeapons.push({ name: 'Poings', damageDice: '1', damageType: 'contondant', attackMod: 'str' })
    }

    // Default values based on Valmir example
    const hitDice = char.class?.toLowerCase().includes('wizard') ? '1d6' : 
                   char.class?.toLowerCase().includes('fighter') ? '1d10' : 
                   char.class?.toLowerCase().includes('rogue') ? '1d8' : '1d8'
    
    // Default spells for magic classes
    let spells = null
    if (char.class?.toLowerCase().includes('magicien') || char.class?.toLowerCase().includes('wizard')) {
      spells = {
        cantrips: ['Main de Mage', 'Trait de Feu', 'Prestidigitation'],
        level1: ['Armure de Mage', 'Projectile Magique', 'Sommeil', 'Bouclier']
      }
    } else if (char.class?.toLowerCase().includes('clerc') || char.class?.toLowerCase().includes('cleric')) {
      spells = {
        cantrips: ['Flamme Sacrée', 'Assistance', 'Thaumaturgie'],
        level1: ['Soin des Blessures', 'Bénédiction', 'Mot de Guérison']
      }
    }

    const extendedStats = {
      ...stats,
      sex: char.sex || 'Masculin',
      ac: char.ac || ac,
      hitDice: char.hitDice || hitDice,
      proficiencyBonus: proficiencyBonus,
      speed: char.speed || 30,
      background: char.background || '',
      languages: char.languages || ['Commun'],
      allies: char.allies || [],
      skillProficiencies: char.skillProficiencies || []
    }

    await supabase.from('characters').insert([{
      id: charId,
      campaign_id: campaignId,
      name: char.name,
      race: char.race,
      class: char.class,
      level: level,
      xp_current: char.xp?.current || 0,
      xp_next: char.xp?.next || 300,
      hp_max: char.hp_max || 10,
      hp_current: char.hp_max || 10,
      stats: extendedStats,
      grimoire: char.spells || spells,
      description: char.description || '',
      inventory: char.inventory || [],
      features: char.features || [],
      ideals: char.ideals || '',
      bonds: char.bonds || ''
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
