import { GoogleGenAI, Modality } from '@google/genai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

let ai: GoogleGenAI | null = null
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY })
}

export const isGeminiAvailable = () => !!ai

// ============================================================
// TYPES
// ============================================================

export interface CharacterContext {
  id: string
  name: string
  race: string
  class: string
  level: number
  hp: { current: number; max: number }
  stats: Record<string, number>
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
}

export interface TurnAction {
  playerName: string
  characterName: string
  action: string
}

export interface DmResponse {
  narration: string
  imageBase64?: string  // base64 PNG image data
  imageMimeType?: string
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
    return `### ${c.name}
- Race/Type: ${c.race || 'Inconnue'} | Classe: ${c.class || 'Inconnue'} | Niveau: ${c.level || 1}
- PV: ${c.hp?.current || '?'}/${c.hp?.max || '?'}
- ${statsStr}
${c.description ? `- Description: ${c.description}` : ''}
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

  return `Tu es le Maître du Donjon (DM) pour cette campagne de jeu de rôle.

═══════════════════════════════════
        CONTEXTE DE LA CAMPAGNE
═══════════════════════════════════
Nom : ${ctx.campaignName}
Univers : ${ctx.universe}
Lieu actuel : ${ctx.currentLocation}
Moment : ${ctx.currentTimeOfDay}

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
        TES RÈGLES DE DM
═══════════════════════════════════
1. Tu es un DM immersif, narratif et captivant. Tu décris les scènes avec vivacité.
2. Tu respectes les règles de l'univers de la campagne.
3. Quand une action nécessite un jet de dé, TU lances le dé. Format : [🎲 Jet de [Compétence] pour [Personnage]: [résultat]d20 + [mod] = [total] — [Réussite/Échec] !]
4. Tu ne contrôles JAMAIS les choix d'un personnage joueur. Tu décris les conséquences.
5. Tu peux introduire des PNJ, événements, dangers, et rebondissements.
6. Réponds de manière concise mais immersive.
7. Tu parles toujours en français.
8. N'utilise PAS de markdown lourd. Texte brut, emojis pour les dés 🎲 et l'ambiance.
9. IMPORTANT : Quand plusieurs joueurs agissent en même temps, décris la scène de manière cohérente en intégrant TOUTES les actions simultanément, comme dans un film.`

// ============================================================
// DICE ROLLING
// ============================================================

function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
}

function preRollDice(): string {
  const rolls = {
    d20_1: rollDice(20),
    d20_2: rollDice(20),
    d20_3: rollDice(20),
    d12: rollDice(12),
    d10: rollDice(10),
    d8: rollDice(8),
    d6_1: rollDice(6),
    d6_2: rollDice(6),
    d4: rollDice(4),
  }
  return `Dés pré-lancés (utilise-les si un jet est nécessaire) :
- d20: ${rolls.d20_1}, ${rolls.d20_2}, ${rolls.d20_3}
- d12: ${rolls.d12} | d10: ${rolls.d10} | d8: ${rolls.d8}
- d6: ${rolls.d6_1}, ${rolls.d6_2} | d4: ${rolls.d4}`
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

  const systemPrompt = buildTurnSystemPrompt(context)
  const diceRolls = preRollDice()

  const actionsText = actions.map(a => 
    `➤ ${a.characterName} (joueur: ${a.playerName}) : "${a.action}"`
  ).join('\n')

  const fullPrompt = `${systemPrompt}

${DM_RULES}

═══════════════════════════════════
        🎲 ${diceRolls}
═══════════════════════════════════

═══════════════════════════════════
        ACTIONS DES JOUEURS CE TOUR
═══════════════════════════════════
${actionsText}

Résous ce tour. Décris ce qui se passe pour TOUS les joueurs de manière cohérente et cinématique. Si des jets de dés sont nécessaires, utilise les dés pré-lancés ci-dessus.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    })

    const text = response.text || ''
    return { narration: text.trim() }
  } catch (error: any) {
    console.error('❌ Gemini API error (resolveTurn):', error)
    return { narration: getErrorMessage(error) }
  }
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 512,
      }
    })

    return (response.text || '').trim()
  } catch (error: any) {
    console.error('❌ Gemini API error (/dm):', error)
    return getErrorMessage(error)
  }
}

// ============================================================
// IMAGE GENERATION: Scene illustration
// ============================================================

export async function generateSceneImage(
  sceneDescription: string,
  context: CampaignContext
): Promise<{ base64: string; mimeType: string } | null> {
  if (!ai) return null

  const charDescriptions = context.characters.map(c => {
    const desc = c.description || `${c.race} ${c.class}`
    return `${c.name}: ${desc}`
  }).join('. ')

  const imagePrompt = `Generate a dramatic, cinematic illustration for a tabletop RPG scene.

Setting: ${context.universe}, at ${context.currentLocation}, during ${context.currentTimeOfDay}.

Scene: ${sceneDescription}

Characters present: ${charDescriptions}

Style: Dark fantasy anime illustration, dramatic lighting, high detail, no text or UI elements. The image should feel like a key frame from an anime or a high-quality RPG illustration book.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: imagePrompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      }
    })

    // Extract image from response
    const candidates = response.candidates
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          return {
            base64: part.inlineData.data as string,
            mimeType: (part.inlineData.mimeType as string) || 'image/png'
          }
        }
      }
    }
    return null
  } catch (error: any) {
    console.error('❌ Image generation error:', error)
    // Image gen might not be available on free tier - that's OK
    return null
  }
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
  const result = await resolveTurn(actions, context)

  // Then try to generate an image (non-blocking, can fail silently)
  if (generateImage && result.narration && !result.narration.startsWith('⚠️')) {
    try {
      const image = await generateSceneImage(result.narration, context)
      if (image) {
        result.imageBase64 = image.base64
        result.imageMimeType = image.mimeType
      }
    } catch (e) {
      console.warn('⚠️ Image generation skipped:', e)
    }
  }

  return result
}

// ============================================================
// ERROR HANDLING
// ============================================================

function getErrorMessage(error: any): string {
  const msg = error?.message || ''
  if (msg.includes('429') || error?.status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
    // Try to extract retry delay
    const retryMatch = msg.match(/retry in (\d+)/i)
    const delay = retryMatch ? retryMatch[1] : '30-60'
    return `⏳ Quota API temporairement atteint. Réessayez dans ~${delay} secondes. Le free tier a des limites de requêtes par minute.`
  }
  if (msg.includes('API_KEY') || msg.includes('401')) {
    return "🔑 Clé API Gemini invalide. Vérifiez votre fichier .env."
  }
  if (msg.includes('not found') || msg.includes('404') || msg.includes('not_found')) {
    return "🔧 Modèle Gemini non disponible. Vérifiez la version du modèle utilisé."
  }
  return "💀 Le Maître du Donjon est momentanément dans les limbes... (Erreur: " + msg.substring(0, 150) + ")"
}
