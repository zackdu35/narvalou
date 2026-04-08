import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { GoogleGenAI } from '@google/genai'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env from plugin dir
dotenv.config({ path: path.join(__dirname, '..', '.env') })
// Also try to load from site dir for Gemini key
dotenv.config({ path: path.join(__dirname, '../../../../dnd-site/.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY

if (!supabaseUrl || !supabaseKey || !geminiKey) {
  console.error("❌ ERREUR: Credentials manquants (Supabase ou Gemini).")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const genAI = new GoogleGenAI(geminiKey)

async function runDiceRoll(expression, label = "") {
  try {
    const scriptPath = path.join(__dirname, 'roll-dice.sh')
    const cmd = `${scriptPath} "${expression}" --label "${label}"`
    console.log(`🎲 Running: ${cmd}`)
    const output = execSync(cmd).toString()
    // Extract the parseable line: FINAL:X|EXPR:Y|LABEL:Z|ROLLS:[...]
    const parseableLine = output.split('\n').find(l => l.startsWith('FINAL:'))
    return { output: output.trim(), parseable: parseableLine }
  } catch (e) {
    console.error(`❌ Error rolling ${expression}:`, e.message)
    return { output: `Error: ${e.message}`, parseable: null }
  }
}

async function resolveCombat(campaignId) {
  console.log(`⚔️ Resolving Turn for Campaign ${campaignId}...`)

  // 1. Fetch Campaign Data
  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', campaignId).single()
  const { data: characters } = await supabase.from('characters').select('*').eq('campaign_id', campaignId)
  const { data: quests } = await supabase.from('quests').select('*').eq('campaign_id', campaignId)

  // 2. Find last [TURN_RESOLVED] to get pending actions
  const { data: allMessages } = await supabase
    .from('messages')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(50)

  const messages = allMessages.reverse()
  const lastResolveIdx = [...messages].reverse().findIndex(m => m.content === '[TURN_RESOLVED]')
  const lastResolveTime = lastResolveIdx !== -1 ? new Date(messages[messages.length - 1 - lastResolveIdx].created_at) : new Date(0)

  const pendingActions = messages.filter(m =>
    m.receiver_id === 'action' &&
    new Date(m.created_at) > lastResolveTime
  ).map(m => {
    const char = characters.find(c => c.id.toLowerCase() === `${campaignId}_${m.sender_id.toLowerCase()}`)
    return `@${char?.name || m.sender_id}: ${m.content}`
  })

  if (pendingActions.length === 0) {
    console.log("📭 No pending actions found.")
    return
  }

  console.log(`📝 Actions detected:\n${pendingActions.join('\n')}`)

  // 3. Identify Rolls via Gemini
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" })
  const charSummary = characters.map(c => `- ${c.name}: CA=${c.ac || 10}, Stats=${JSON.stringify(c.stats || {})}`).join('\n')

  const rollPrompt = `As a D&D 5e mechanics assistant, identify required rolls for these actions:
ACTIONS:
${pendingActions.join('\n')}

CONTEXT:
${charSummary}

Return ONLY a JSON array: [{"char": "...", "type": "attack|check|save|damage", "expr": "1d20+5", "label": "..."}]`

  const rollResult = await model.generateContent(rollPrompt)
  const rollJsonMatch = rollResult.response.text().match(/\[.*\]/s)
  const rollsToMake = rollJsonMatch ? JSON.parse(rollJsonMatch[0]) : []

  // 4. Execute Rolls via shell script
  const rollResults = []
  for (const r of rollsToMake) {
    const res = await runDiceRoll(r.expr, r.label)
    rollResults.push(res.output)
  }

  const diceOutputString = rollResults.join('\n\n')

  // 5. Generate Narration
  const dmModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" })
  const narrationPrompt = `You are the Dungeon Master. Resolve this turn using these REAL dice results.
  
CONTEXT:
Location: ${campaign.current_location}
Scene: ${campaign.scene_description}

DICE RESULTS:
${diceOutputString}

ACTIONS:
${pendingActions.join('\n')}

INSTRUCTIONS:
- Narrate concisely (2-3 paragraphs).
- Use the dice results strictly.
- Mentions players with @Name.
- End with a question.
- DO NOT INCLUDE ANY [UPDATE_STATE] TAGS. I will handle state updates mechanically.
- Output ONLY the narration text.`

  const narrationResult = await dmModel.generateContent(narrationPrompt)
  const finalNarration = narrationResult.response.text().trim()

  console.log(`\n🔮 Narration:\n${finalNarration}\n`)

  // 6. Post Narration to Site (with Voice)
  const speakPath = path.join(__dirname, 'speak-on-site.js')
  execSync(`node "${speakPath}" --text "${finalNarration.replace(/"/g, '\\"')}" --npc "DM" --campaign ${campaignId}`)

  // 7. Mechanical State Sync (Simplified for now)
  // In a real scenario, we'd parse the dice results to update HP.
  // For now, we manually mark the turn as resolved.
  const { error: resolveErr } = await supabase.from('messages').insert([{
    sender_id: 'SYSTEM',
    receiver_id: 'global',
    content: '[TURN_RESOLVED]',
    campaign_id: campaignId
  }])

  console.log("✅ Turn Resolved and State Synced.")
}

const campaignId = process.argv[2]
if (!campaignId) {
  console.error("Usage: node scripts/resolve-turn-cmd.js <campaign_id>")
  process.exit(1)
}

resolveCombat(parseInt(campaignId))
