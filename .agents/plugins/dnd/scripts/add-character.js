import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function addCharacter(campaignId, char) {
  const charId = `${campaignId}_${char.name.toLowerCase()}`
  
  const level = char.level || 1
  const proficiencyBonus = Math.floor((level - 1) / 4) + 2
  const stats = char.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  const dexMod = Math.floor((stats.dex - 10) / 2)
  const ac = char.ac || (10 + dexMod)
  
  const hitDice = char.class.toLowerCase().includes('wizard') ? '1d6' : 
                   char.class.toLowerCase().includes('fighter') ? '1d10' : 
                   char.class.toLowerCase().includes('rogue') ? '1d8' : '1d8'

  console.log(`👤 Ajout du personnage ${char.name} à la campagne ${campaignId}...`)

  const extendedStats = {
    ...stats,
    sex: char.sex || 'Masculin',
    ac: ac,
    hitDice: hitDice,
    proficiencyBonus: proficiencyBonus,
    speed: char.speed || 30,
    background: char.background || '',
    languages: char.languages || ['Commun'],
    allies: [],
    skillProficiencies: char.skillProficiencies || []
  }

  const { error } = await supabase.from('characters').insert([{
    id: charId,
    campaign_id: campaignId,
    name: char.name,
    race: char.race || 'Humain',
    class: char.class,
    level: level,
    xp_current: 0,
    xp_next: 300,
    hp_max: char.hp_max || 10,
    hp_current: char.hp_max || 10,
    stats: extendedStats,
    grimoire: char.spells || null,
    description: char.description || '',
    inventory: char.inventory || [],
    features: [],
    ideals: '',
    bonds: ''
  }])

  if (error) {
    console.error("❌ Erreur lors de l'insertion:", error)
  } else {
    console.log(`✅ ${char.name} a rejoint l'aventure !`)
  }
}

const campaignId = process.argv[2] || 5
const char = {
  name: "Lyra",
  race: "Elfe sylvain",
  class: "Voleuse",
  sex: "Féminin",
  hp_max: 9,
  stats: { str: 8, dex: 17, con: 12, int: 13, wis: 14, cha: 10 },
  inventory: ["Dague", "Arc court", "Outils de voleur"],
  description: "Silencieuse et agile, Lyra porte une capuche vert sombre et ses yeux dorés scrutent toujours les ombres.",
  background: "Une ancienne espionne qui a fui une guilde corrompue.",
  languages: ["Commun", "Elfe"]
}

addCharacter(campaignId, char)
