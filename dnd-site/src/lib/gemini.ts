import { GoogleGenAI } from '@google/genai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// Helper for cleaning shell results (stripping ANSI color codes)
function stripAnsi(text: string): string {
  return text.replace(/\x1B\[[0-9;]*[mK]/g, '')
}

let ai: GoogleGenAI | null = null
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY })
}

export const isGeminiAvailable = () => !!ai

// ============================================================
// TYPES
// ============================================================

export interface Weapon {
  name: string
  damageDice: string
  damageType: string
  attackMod: 'str' | 'dex'
  properties?: string[]
}

export interface SpellSlots {
  level1: number
  level2: number
  level3: number
}

export interface SpellBook {
  cantrips: string[]
  level1: string[]
  level2?: string[]
  level3?: string[]
}

export interface CharacterContext {
  id: string
  name: string
  sex?: string
  race: string
  class: string
  level: number
  xp: { current: number; next: number }
  hp: { current: number; max: number }
  hitDice: string
  stats: Record<string, number>
  ac: number
  proficiencyBonus: number
  speed: number
  state?: string
  background?: string
  languages?: string[]
  allies?: string[]
  weapons?: Weapon[]
  spells?: SpellBook
  spellSlots?: SpellSlots
  conditions?: string[]
  savingThrows?: string[]
  skillProficiencies?: string[]
  inventory?: string[]
  features?: string[]
  description?: string
  ideals?: string
  bonds?: string
}

export interface CampaignContext {
  campaignName: string
  universe: string
  currentLocation: string
  currentTimeOfDay: string
  sceneDescription: string
  characters: CharacterContext[]
  activeQuests: { title: string; description: string; priority: string }[]
  recentMessages: { sender: string; content: string }[]
  campaignLog?: string  // markdown du campaign-log
  gameMode?: 'adventure' | 'interactive'
}

export interface TurnAction {
  playerName: string
  characterName: string
  action: string
}

export interface IntendedRoll {
  characterName: string
  actionType: 'attack' | 'check' | 'save' | 'damage'
  expression: string
  label: string
  result?: number
  breakdown?: string
}

export interface DmResponse {
  narration: string
  caption?: string
  imageBase64?: string
  imageMimeType?: string
  stateUpdate?: {
    characters?: { name: string; hp: number }[]
    quests?: { title: string; description: string; priority: string }[]
    location?: string
    time?: string
  }
  isError?: boolean
}

// ============================================================
// PROMPT BUILDERS
// ============================================================

function safeJoin(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ')
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function buildCharacterBlock(chars: CharacterContext[]): string {
  return chars.map(c => {
    const statsStr = c.stats
      ? `FOR:${c.stats.str || '?'} DEX:${c.stats.dex || '?'} CON:${c.stats.con || '?'} INT:${c.stats.int || '?'} SAG:${c.stats.wis || '?'} CHA:${c.stats.cha || '?'}`
      : 'Stats inconnues'
    const invStr = c.inventory ? `Inventaire: ${safeJoin(c.inventory)}` : ''
    const featStr = c.features ? `Capacités: ${safeJoin(c.features)}` : ''
    const weaponsStr = c.weapons ? `Armes: ${c.weapons.map(w => `${w.name} (${w.damageDice} ${w.damageType}, mod ${w.attackMod})`).join(', ')}` : ''
    const condStr = (c.conditions && c.conditions.length > 0) ? `Conditions: ${c.conditions.join(', ')}` : ''
    const langStr = (c.languages && c.languages.length > 0) ? `Langues: ${c.languages.join(', ')}` : ''

    let spellsStr = ''
    if (c.spells) {
      spellsStr = `Sorts: Cantrips(${safeJoin(c.spells.cantrips)}), Nv1(${safeJoin(c.spells.level1)})`
    }

    return `### ${c.name} (${c.sex || '?'})
- Race: ${c.race || 'Inconnue'} | Classe: ${c.class || 'Inconnue'} | Niveau: ${c.level || 1} (XP: ${c.xp?.current || 0}/${c.xp?.next || 300})
- PV: ${c.hp?.current || '?'}/${c.hp?.max || '?'} | Dé de Vie: ${c.hitDice || '?'} | CA: ${c.ac || 10} | Vitesse: ${c.speed || 30}ft | Bonus Maîtrise: +${c.proficiencyBonus || 2}
- ${statsStr}
- État: ${c.state || 'Normal'}
- Maîtrises: ${safeJoin(c.skillProficiencies)} | Sauvegardes: ${safeJoin(c.savingThrows)}
${langStr ? `- ${langStr}` : ''}
${weaponsStr ? `- ${weaponsStr}` : ''}
${spellsStr ? `- ${spellsStr}` : ''}
${condStr ? `- ${condStr}` : ''}
${c.description ? `- Description: ${c.description}` : ''}
${c.background ? `- Histoire: ${c.background}` : ''}
${invStr ? `- ${invStr}` : ''}
${featStr ? `- ${featStr}` : ''}`
  }).join('\n\n')
}

function buildTurnSystemPrompt(ctx: CampaignContext): string {
  const charBlock = buildCharacterBlock(ctx.characters)

  const questList = ctx.activeQuests.map(q =>
    `- [${q.priority.toUpperCase()}] ${q.title}: ${q.description}`
  ).join('\n') || 'Aucune quête active.'

  const recentChat = ctx.recentMessages.slice(-15).map(m =>
    `${m.sender}: ${m.content}`
  ).join('\n') || 'Début de la session.'

  const playerRoster = ctx.characters.map(c => `@${c.name}`).join(', ')

  const modeDesc = ctx.gameMode === 'interactive'
    ? "MODE INTERACTIF : Tu ne lances PAS les dés pour les joueurs. Tu leur demandes de lancer le dé et tu attends leur réponse avant de conclure."
    : "MODE AVENTURE (Par défaut) : Tu effectues TOUS les jets pour les joueurs en utilisant les dés pré-lancés. Tu narres le résultat immédiatement."

  return `Tu es le Maître du Donjon (DM) pour cette campagne de jeu de rôle.

═══════════════════════════════════
        MODE DE JEU
═══════════════════════════════════
${modeDesc}

═══════════════════════════════════
        CONTEXTE DE LA CAMPAGNE
═══════════════════════════════════
Nom : ${ctx.campaignName}
Univers : ${ctx.universe}
Lieu actuel : ${ctx.currentLocation}
Moment : ${ctx.currentTimeOfDay}

═══════════════════════════════════
        JOUEURS À TA TABLE
═══════════════════════════════════
${playerRoster}
(Utilise toujours @NomDuPersonnage pour les mentionner. Interpelle-les individuellement.)

═══════════════════════════════════
        SCÈNE EN COURS
═══════════════════════════════════
${ctx.sceneDescription}

═══════════════════════════════════
        FICHES DES PERSONNAGES
═══════════════════════════════════
${charBlock}

═══════════════════════════════════
        QUÊTES ACTIVES
═══════════════════════════════════
${questList}

═══════════════════════════════════
        HISTORIQUE RÉCENT
═══════════════════════════════════
${recentChat}
${ctx.campaignLog ? `\n═══════════════════════════════════\n        JOURNAL DE CAMPAGNE\n═══════════════════════════════════\n${ctx.campaignLog.substring(0, 3000)}` : ''}`
}

const DM_RULES = `
═══════════════════════════════════
        TES RÈGLES DE DM (STRICTES)
═══════════════════════════════════

🎭 IDENTITÉ & VOCATION
Tu es un Maître du Donjon (DM) expert, rigoureux sur les règles de D&D 5e mais talentueux dans la narration. Ton objectif est de transformer les actions mécaniques en scènes cinématiques.

⚔️ PASSAGE EN MODE COMBAT
Dès qu'un joueur attaque, profère une menace physique immédiate, ou qu'un ennemi agresse le groupe :
1. Déclare : "⚔️ PASSAGE EN MODE COMBAT !".
2. Lance l'initiative pour tous (Joueurs + Ennemis). Utilise 1d20 + mod DEX.
3. Structure ton tour avec un tracker visuel :
   ⚔️ COMBAT — Round [X]
   [Initiative 21] @Zac (Actif)
   [Initiative 15] @Garçon (En attente)
   

📜 RÉSOLUTION DES ACTIONS (SYSTÈME 5e)
- JETS D'ATTAQUE : 1d20 + mod (FOR ou DEX) + Bonus Maîtrise. Compare à la CA (Classe d'Armure) cible.
- DÉGÂTS : Utilise le dé de l'arme + mod (FOR ou DEX). Ne jamais inventer de dés aléatoires (ex: pas de 1d6 pour un coup de poing si FOR est 10).
- ACTIONS PAR TOUR : Chaque participant a : 1 Action + 1 Action Bonus + 1 Mouvement + 1 Réaction.
- ENNEMIS : Ils ne sont pas des sacs de frappe. Ils DOIVENT agir, attaquer, se déplacer ou utiliser des capacités tactiques. Identifie-les toujours avec un @ (ex: @Gobelin, @Boss) pour qu'ils apparaissent en rouge.

🎲 GESTION DES DÉS
- MODE AVENTURE : Utilise EXCLUSIVEMENT les dés pré-lancés. Affiche toujours le calcul complet : [🎲 Jet de [Force] pour @Nom : 15 + 3 = 18 — Succès !].
- MODE INTERACTIF : Stoppe ta narration après avoir demandé le jet. "Zac, fais-moi un jet d'Athlétisme (DD 15)". Attends sa réponse avant de conclure.

✨ STYLE DE NARRATION
- STYLE : Ultra-concis (2-3 paragraphes), dramatique, utilise @Nom pour mentionner les acteurs.
- DÉROULEMENT : Décris les ACTIONS et les RÉSULTATS basés sur les dés fournis.
- TRACKER DE COMBAT : À chaque tour de combat, affiche obligatoirement :
  ⚔️ ROUND [X] | PROCHAIN : @Suivant
- SYNCHRONISATION : Ton but est de fournir à la fois la narration et l'état mis à jour dans un format structuré.
- NARRATION : Décris l'action. Ultra-concis (2-3 paragraphes).
- ÉTAT : Si les PV, quêtes, lieu ou temps changent, inclus-les dans les champs correspondants.
- FIN DE RÉPONSE : Termine toujours par une question directe à l'un des joueurs.`


// ============================================================
// DICE ROLLING
// ============================================================

// ============================================================
// DYNAMIC DICE ROLLING (Targeted)
// ============================================================

function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
}

function executeRoll(expr: string): { total: number; breakdown: string } {
  // Simple parser for "XdY+Z" or "XdY-Z" or "XdY"
  const match = expr.toLowerCase().match(/^(\d+)?d(\d+)([+-]\d+)?$/)

  if (match) {
    const num = parseInt(match[1] || "1")
    const sides = parseInt(match[2])
    const mod = parseInt(match[3] || "0")

    const rolls = []
    let sum = 0
    for (let i = 0; i < num; i++) {
      const r = rollDice(sides)
      rolls.push(r)
      sum += r
    }
    const total = sum + mod
    const breakdown = `[${rolls.join(' + ')}]${mod !== 0 ? (mod > 0 ? ' + ' + mod : ' - ' + Math.abs(mod)) : ''} = ${total}`

    return { total, breakdown }
  }

  // Handle constant values or simple math like "1-1" or "5"
  const constMatch = expr.match(/^(\d+)([+-]\d+)?$/)
  if (constMatch) {
    const base = parseInt(constMatch[1])
    const mod = parseInt(constMatch[2] || "0")
    const total = base + mod
    const breakdown = `${base}${mod !== 0 ? (mod > 0 ? ' + ' + mod : ' - ' + Math.abs(mod)) : ''} = ${total}`
    return { total, breakdown }
  }

  return { total: 0, breakdown: "Erreur format" }
}

async function identifyAndExecuteRolls(
  actions: TurnAction[],
  context: CampaignContext
): Promise<IntendedRoll[]> {
  if (!ai) return []

  const actionsSummary = actions.map(a => `- @${a.characterName}: ${a.action}`).join('\n')
  const charSummary = context.characters.map(c => {
    const wp = c.weapons?.[0]
    return `- ${c.name}: CA=${c.ac}, Arme=${wp ? `${wp.name} (${wp.damageDice}, mod ${wp.attackMod})` : 'aucune'}, Stats=${JSON.stringify(c.stats)}`
  }).join('\n')

  const prompt = `Tu es un assistant moteur de règles D&D 5e. 
Analyse les actions des joueurs et détermine quels jets de dés sont nécessaires.

ACTIONS:
${actionsSummary}

CONTEXTE PERSONNAGES:
${charSummary}

Réponds UNIQUEMENT avec un tableau JSON d'objets IntendedRoll :
[{"characterName": "...", "actionType": "attack" | "check" | "save" | "damage", "expression": "1d20+5", "label": "..."}]

Règles :
- Si un joueur attaque, crée un jet "attack" (1d20 + mod + bonus maîtrise) ET un jet "damage" (dé d'arme + mod).
- Utilise les modificateurs de stats appropriés (FOR pour corps-à-corps, DEX pour distance/finesse).
- Si aucune action mécanique n'est requise, renvoie [].`

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt

    })
    const text = response.text || '[]'
    const jsonMatch = text.match(/\[.*\]/s)
    if (!jsonMatch) return []

    const intendedRolls: IntendedRoll[] = JSON.parse(jsonMatch[0])

    // Execute each roll via LOCAL API (roll-dice.sh)
    for (const r of intendedRolls) {
      try {
        const res = await fetch(`/api/roll-dice?expr=${encodeURIComponent(r.expression)}&label=${encodeURIComponent(r.label || '')}`)
        const data = await res.json()
        if (data.output) {
          const cleanOutput = stripAnsi(data.output)
          // Parse the "FINAL:X" part from output
          const finalMatch = cleanOutput.match(/FINAL:(\d+)/)
          r.result = finalMatch ? parseInt(finalMatch[1]) : 0
          
          // Use a much cleaner breakdown for display
          const lines = cleanOutput.split('\n')
          const diceLine = lines.find((l: string) => l.startsWith('Dice:'))
          const totalLine = lines.find((l: string) => l.startsWith('Total:'))
          
          if (diceLine && totalLine) {
            r.breakdown = `${diceLine.trim()} ➔ ${totalLine.trim()}`
          } else {
            r.breakdown = cleanOutput.split('\n').filter((l: string) => !l.startsWith('FINAL:') && l.trim()).pop() || '???'
          }
        }
      } catch (e) {
        console.error("Local dice roll failed:", e)
        const exec = executeRoll(r.expression)
        r.result = exec.total
        r.breakdown = exec.breakdown
      }
    }

    return intendedRolls
  } catch (e) {
    console.warn("Targeted rolls identification failed, falling back to random:", e)
    return []
  }
}

function preRollDiceFallback(): string {
  const rolls = {
    d20: Array.from({ length: 5 }, () => rollDice(20)),
    d12: rollDice(12),
    d10: rollDice(10),
    d8: [rollDice(8), rollDice(8)],
    d6: [rollDice(6), rollDice(6), rollDice(6)],
    d4: [rollDice(4), rollDice(4)],
  }
  return `[DICE]🔮 **Dés du Destin (Réserve)**\n   • d20 : [${rolls.d20.join(', ')}] • d8 : [${rolls.d8.join(', ')}]\n   • d6 : [${rolls.d6.join(', ')}] • d4 : [${rolls.d4.join(', ')}][/DICE]`
}

// ============================================================
// MAIN API: RESOLVE TURN (Batch all player actions)
// ============================================================

export async function resolveTurn(
  actions: TurnAction[],
  context: CampaignContext
): Promise<DmResponse> {
  if (!ai) {
    return { narration: "⚠️ L'API Gemini n'est pas configurée. Ajoutez VITE_GEMINI_API_KEY dans votre fichier .env." }
  }

  const intendedRolls = await identifyAndExecuteRolls(actions, context)
  
  // Ce que le joueur voit : seulement les jets spécifiques identifiés
  const diceForPlayer = intendedRolls.length > 0
    ? `[DICE]${intendedRolls.map(r => `🎲 **${r.label}** (@${r.characterName})\n   ↳ \`${r.breakdown} (${r.expression})\``).join('\n\n')}[/DICE]`
    : ""

  // Ce que l'IA reçoit : les jets spécifiques + la réserve du destin pour le reste
  const diceForAi = intendedRolls.length > 0
    ? intendedRolls.map(r => `[🎲 Jet pour @${r.characterName} (${r.label}) : ${r.breakdown}]`).join('\n')
    : preRollDiceFallback()

  const actionsText = actions.map(a =>
    `➤ **@${a.characterName}** : "${a.action}"`
  ).join('\n')

  // Identify characters who did NOT act this turn
  const actingNames = new Set(actions.map(a => a.characterName))
  const silentChars = context.characters
    .filter(c => !actingNames.has(c.name))
    .map(c => `@${c.name}`)

  const silentNote = silentChars.length > 0
    ? `\n\n⚠️ Ces joueurs n'ont PAS agi ce tour : ${silentChars.join(', ')}. Interpelle-les à la fin de ta narration en leur demandant ce qu'ils font.`
    : ''

  const systemPrompt = buildTurnSystemPrompt(context)
  const fullPrompt = `${systemPrompt}

${DM_RULES}

═══════════════════════════════════
        🎲 RÉSULTATS DES DÉS (À UTILISER IMPÉRATIVEMENT)
═══════════════════════════════════
${diceForAi}

═══════════════════════════════════
        ACTIONS DES JOUEURS CE TOUR
═══════════════════════════════════
${actionsText}
${silentNote}

Résous ce tour de manière cinématique, DRAMATIQUE mais ULTRA-CONCISE.
- Va droit au but : 2-3 paragraphes max.
- Utilise les résultats des dés fournis. Ne ré-invente pas les résultats.
- [UPDATE_STATE] : Produis le JSON à la fin pour les PV (Joueurs et Ennemis si possible), Quêtes, Lieu. Exemple: [UPDATE_STATE]{"characters": [{"name": "Zac", "hp": 5}]}[/UPDATE_STATE].
- Termine par une question directe.
`

  let attempts = 0
  const maxAttempts = 3
  const baseDelay = 1000
  const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash']

  while (attempts < maxAttempts) {
    const currentModel = models[attempts % models.length]
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: fullPrompt,
        config: {
          temperature: 0.9,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            properties: {
              narration: { type: "string" },
              characters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    hp: { type: "integer" }
                  },
                  required: ["name", "hp"]
                }
              },
              quests: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string" }
                  },
                  required: ["title", "description"]
                }
              },
              location: { type: "string" },
              time: { type: "string" }
            },
            required: ["narration"]
          }
        }
      })

      const rawText = response.text || '{}'
      try {
        const json = JSON.parse(rawText)
        
        // Inclure les résultats des dés filtrés au début de la narration
        const finalNarration = diceForPlayer ? `${diceForPlayer}\n\n${json.narration || ''}` : (json.narration || '')

        return {
          narration: finalNarration,
          stateUpdate: json,
          isError: false
        }
      } catch (e) {
        return { narration: rawText.trim(), isError: false }
      }
    } catch (error: any) {
      attempts++
      const status = error?.status || error?.code
      const msg = (error?.message || '').toLowerCase()

      // Retry on 503 (Unavailable), 429 (Too many requests), or other temporary issues
      if (attempts < maxAttempts && (status === 503 || status === 429 || msg.includes('503') || msg.includes('429') || msg.includes('demand'))) {
        const delay = baseDelay * Math.pow(2, attempts - 1)
        console.warn(`⏳ Gemini (${currentModel}) busy (attempt ${attempts}/${maxAttempts}). Retrying with next model in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      console.error('❌ Gemini API error (resolveTurn):', error)
      return { narration: getErrorMessage(error), isError: true }
    }
  }
  return { narration: "💀 Le Maître du Donjon est épuisé... (Erreur persistante)", isError: true }
}

// ============================================================
// /DM COMMAND: Quick meta question
// ============================================================

export async function askDmQuestion(
  question: string,
  context: CampaignContext
): Promise<string> {
  if (!ai) {
    return "⚠️ L'API Gemini n'est pas configurée."
  }

  const systemPrompt = buildTurnSystemPrompt(context)

  const fullPrompt = `${systemPrompt}

Tu es le Maître du Donjon. Un joueur te pose une question HORS-JEU (règle, contexte, clarification).
Réponds de manière concise et utile, en français.
Ne fais PAS avancer la narration. C'est une question méta.

Question du joueur : "${question}"

Ta réponse (concise, 1-2 paragraphes max) :`

  let attempts = 0
  const maxAttempts = 2
  const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash']

  while (attempts < maxAttempts) {
    const currentModel = models[attempts % models.length]
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: fullPrompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 512,
        }
      })

      return (response.text || '').trim()
    } catch (error: any) {
      attempts++
      const status = error?.status || error?.code
      const msg = (error?.message || '').toLowerCase()

      if (attempts < maxAttempts && (status === 503 || status === 429 || msg.includes('503') || msg.includes('429') || msg.includes('demand'))) {
        await new Promise(resolve => setTimeout(resolve, 500))
        continue
      }

      console.error('❌ Gemini API error (/dm):', error)
      return getErrorMessage(error)
    }
  }
  return "💀 Le MJ est occupé à consulter ses parchemins... (Erreur persistante)"
}

// ============================================================
// IMAGE GENERATION: Scene illustration
// ============================================================

/**
 * Transforms a narration into a safe, visually descriptive prompt for image generation.
 * This helps bypass safety filters that might be triggered by violent D&D narrations.
 */
async function refineImagePrompt(
  narration: string,
  context: CampaignContext
): Promise<string> {
  if (!ai) return narration

  const charDetails = context.characters.map(c => `${c.name} (${c.race} ${c.class})`).join(', ')
  
  const prompt = `You are a prompt engineer for AI image generation. 
Your goal is to transform a dark or violent RPG narration into a SAFE, cinematic, and visually descriptive prompt.

RULES:
1. REMOVE all graphic violence, gore, blood, or decapitation.
2. REPLACE "killing", "slashing", or "murder" with "epic confrontation", "dynamic combat pose", "dramatic action", or "intense standoff".
3. FOCUS on: Environment (${context.currentLocation}), Lighting (${context.currentTimeOfDay}), Atmosphere, and Composition.
4. INCLUDE characters: ${charDetails}.
5. Style: Dark fantasy anime illustration, high detail.
6. Output ONLY the safe English prompt.

ORIGINAL NARRATION:
${narration}

SAFE VISUAL PROMPT:
`

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: { temperature: 0.7, maxOutputTokens: 200 }
    })
    const refined = (response.text || '').trim()
    console.log("🎨 Prompt original :", narration.substring(0, 50) + "...")
    console.log("✨ Prompt raffiné :", refined)
    return refined || narration
  } catch (e) {
    console.warn("⚠️ Échec du raffinage du prompt, utilisation du brut.", e)
    return narration
  }
}

export async function generateSceneImage(
  sceneDescription: string,
  context: CampaignContext
): Promise<{ base64: string; mimeType: string; caption?: string } | null> {
  if (!ai) return null

  // 1. Raffiner le prompt pour éviter les blocages de sécurité
  const safePrompt = await refineImagePrompt(sceneDescription, context)

  const charDescriptions = context.characters.map(c => {
    const desc = c.description || `${c.race} ${c.class}`
    return `${c.name}: ${desc}`
  }).join('. ')

  const imagePrompt = `Generate a dramatic, cinematic illustration for a tabletop RPG scene.

Setting: ${context.universe}, at ${context.currentLocation}, during ${context.currentTimeOfDay}.

Scene Description: ${safePrompt}

Characters present: ${charDescriptions}

Style: Dark fantasy anime illustration, dramatic lighting, high detail, no text or UI elements. Key frame from a high-quality RPG illustration book.

IMPORTANT: Provide a very short, poetic caption (1 sentence maximum) in French that captures the essence of this scene first, then generate the image. Do NOT put text ON the image.`

  let attempts = 0
  const maxAttempts = 2
  const models = ['gemini-2.5-flash-image']

  while (attempts < maxAttempts) {
    const currentModel = models[attempts % models.length]
    try {
      const config: any = {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }

      console.log(`🎨 Tentative de génération d'image avec ${currentModel}...`)
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: imagePrompt,
        config
      })

      console.log(`📥 Réponse brute reçue de ${currentModel}:`, response)
      
      if (response.candidates && response.candidates.length > 0) {
        const cand = response.candidates[0]
        console.log("🔍 Clés du premier candidat :", Object.keys(cand))
        if (cand.content) {
          console.log("🔍 Clés du content :", Object.keys(cand.content))
          if (cand.content.parts) {
            console.log(`🧩 Nombre de parties : ${cand.content.parts.length}`)
          }
        }
        if (cand.finishReason) {
          console.log(`🏁 Finish Reason : ${cand.finishReason}`)
          if (cand.finishReason === 'IMAGE_SAFETY' || cand.finishReason === 'SAFETY') {
            console.error("🚫 Blocage de sécurité (SAFETY) détecté par le modèle d'image.")
            // On pourrait retenter ici avec un prompt encore plus neutre si besoin
          }
        }
      }

      // Essayer d'extraire via candidates (Gemini standard)
      const candidates = response.candidates
      if (candidates && candidates[0]?.content?.parts) {
        let base64 = ''
        let mimeType = ''
        let caption = ''
        for (const [idx, part] of candidates[0].content.parts.entries()) {
          const p = part as any
          if (p.inlineData) {
            console.log(`🖼️ Partie ${idx}: Image trouvée via inlineData (${p.inlineData.mimeType})`)
            base64 = p.inlineData.data
            mimeType = p.inlineData.mimeType || 'image/png'
          } else if (p.text) {
            console.log(`📝 Partie ${idx}: Texte trouvé ("${p.text.substring(0, 50)}...")`)
            caption = p.text.trim()
          } else if (p.videoMetadata) {
            console.log(`🎥 Partie ${idx}: Vidéo trouvée (non géré)`)
          } else {
            console.log(`❓ Partie ${idx}: Type inconnu`, Object.keys(p))
          }
        }
        if (base64) return { base64, mimeType, caption }
      }

      // Essayer d'extraire via generatedImages (nouveaux modèles Imagen/Gemini)
      const genImgs = (response as any).generatedImages
      if (genImgs && genImgs.length > 0) {
        console.log(`🖼️ Image trouvée via generatedImages (${genImgs.length} images)`)
        const img = genImgs[0]
        if (img.image?.data) {
          return { 
            base64: img.image.data, 
            mimeType: img.image.mimeType || 'image/png',
            caption: img.caption || ''
          }
        }
      }

      // Essayer d'extraire via un champ 'images' direct (certaines versions d'API)
      const directImgs = (response as any).images
      if (directImgs && directImgs.length > 0) {
        console.log(`🖼️ Image trouvée via champ direct 'images'`)
        const img = directImgs[0]
        if (img.url || img.data) {
          return {
            base64: img.data || '',
            mimeType: img.mimeType || 'image/png',
            caption: img.caption || ''
          }
        }
      }

      console.warn("⚠️ Aucune image trouvée dans la réponse (ni candidates.parts, ni generatedImages, ni images).")
      return null
    } catch (error: any) {
      console.error(`❌ Erreur image (${currentModel}):`, error)
      attempts++
      const status = error?.status || error?.code
      const msg = (error?.message || '').toLowerCase()

      if (attempts < maxAttempts && (status === 503 || status === 429 || msg.includes('503') || msg.includes('429') || msg.includes('demand'))) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }

      console.error('❌ Image generation error:', error)
      return null
    }
  }
  return null
}

// ============================================================
// RESOLVE TURN WITH IMAGE (combined)
// ============================================================

export async function resolveTurnWithImage(
  actions: TurnAction[],
  context: CampaignContext,
  generateImage: boolean = true
): Promise<DmResponse> {
  // First, get the narration
  console.log("🧩 Résolution de la narration en cours...")
  const result = await resolveTurn(actions, context)

  // Try to generate an image only if narration was successful
  if (generateImage && result.narration && !result.isError) {
    try {
      const image = await generateSceneImage(result.narration, context)
      if (image) {
        result.imageBase64 = image.base64
        result.imageMimeType = image.mimeType
        result.caption = image.caption
      } else {
        console.warn("⚠️ generateSceneImage a retourné null (échec de génération).")
      }
    } catch (e) {
      console.warn('⚠️ Erreur lors de la génération d\'image:', e)
    }
  } else {
    if (!generateImage) console.log("ℹ️ Génération d'image sautée (désactivée par l'option generateImage).")
    else if (!result.narration) console.log("ℹ️ Génération d'image sautée (narration vide).")
    else if (result.isError) console.log("ℹ️ Génération d'image sautée (erreur dans resolveTurn).")
  }

  return result
}

// ============================================================
// ERROR HANDLING
// ============================================================

function getErrorMessage(error: any): string {
  let msg = error?.message || ''

  // Try to parse JSON if the error message is a stringified JSON
  try {
    if (msg.includes('{')) {
      const start = msg.indexOf('{')
      const end = msg.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        const potentialJson = msg.substring(start, end + 1)
        const parsed = JSON.parse(potentialJson)
        if (parsed.error?.message) msg = parsed.error.message
        else if (parsed.message) msg = parsed.message
      }
    }
  } catch (e) {
    // Not JSON, continue with original message
  }

  const status = error?.status || error?.code || ''
  const isBusy = msg.includes('429') || status === 429 || msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('503') || status === 503 || msg.includes('UNAVAILABLE') ||
    msg.includes('high demand')

  if (isBusy) {
    // Try to extract retry delay if present
    const retryMatch = msg.match(/retry in (\d+)/i)
    const delay = retryMatch ? retryMatch[1] : 'quelques'
    return `⏳ Le Maître du Donjon est surchargé par trop de demandes simultanées. Réessayez dans ${delay === 'quelques' ? 'quelques' : delay + ' '} secondes. (Erreur Flash: ${status})`
  }

  if (msg.includes('API_KEY') || msg.includes('401') || status === 401) {
    return "🔑 Clé API Gemini invalide. Vérifiez votre fichier .env."
  }

  if (msg.includes('not found') || msg.includes('404') || status === 404) {
    return "🔧 Modèle Gemini non trouvé ou non disponible. La version demandée est peut-être obsolète ou incorrecte."
  }

  return "💀 Le Maître du Donjon est momentanément dans les limbes... (Erreur: " + msg.substring(0, 150) + ")"
}
