import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Paintbrush, Send, User as UserIcon, ChevronDown, Check, X, Image as ImageIcon, ImageOff, Eye } from 'lucide-react'
import { db, supabase } from '../services/supabase'
import { aiService } from '../services/ai'

// ==================== CONSTANTS ====================

const TIME_ICONS = { 'Matin': '🌅', 'Midi': '☀️', 'Soir': '🌆', 'Nuit': '🌙' }
const MOOD_LABELS = { 'Calme': 'Calme', 'Tendu': 'Tendu', 'Combat': 'Combat', 'Mystère': 'Mystère' }

const SLASH_COMMANDS = {
  '/help': { description: 'Affiche toutes les commandes disponibles' },
  '/inventory': { description: 'Affiche ton inventaire' },
  '/stats': { description: 'Affiche tes statistiques' },
  '/save': { description: 'Archive la session' },
  '/r': { description: 'Message entre joueurs (rose, pas d\'IA)' },
  '/dm': { description: 'Question hors-RP au MJ' },
  '/rest': { description: 'Proposer un repos' },
  '/img': { description: 'Activer/désactiver la génération d\'images' },
}

// ==================== HELPERS ====================

function getHpClass(current, max) {
  const pct = (current / max) * 100
  if (pct > 60) return 'hp-high'
  if (pct > 30) return 'hp-mid'
  return 'hp-low'
}

function rollDice(type) {
  const sides = parseInt(type.replace('d', ''))
  return Math.floor(Math.random() * sides) + 1
}

function formatStatMod(val) {
  const mod = Math.floor((val - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

// ==================== SUB-COMPONENTS ====================

function DiceRollButton({ request, characterName, onRoll }) {
  const [rolled, setRolled] = useState(false)
  const [result, setResult] = useState(null)
  const [animating, setAnimating] = useState(false)

  if (request.player !== characterName) {
    return (
      <div className="dice-request-waiting">
        🎲 En attente du jet de <strong>{request.player}</strong> ({request.reason})
      </div>
    )
  }

  const handleRoll = () => {
    setAnimating(true)
    setTimeout(() => {
      const raw = rollDice(request.type)
      const total = raw + (request.modifier || 0)
      const success = request.dd ? total >= request.dd : null
      setResult({ raw, total, success })
      setRolled(true)
      setAnimating(false)
      onRoll({ ...request, raw, total, success })
    }, 800)
  }

  if (rolled) {
    return (
      <motion.div 
        className={`dice-result ${result.success === true ? 'success' : result.success === false ? 'failure' : ''}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <span className="dice-emoji">🎲</span>
        <span className="dice-detail">
          {request.reason}: <strong>{result.raw}</strong> ({request.type})
          {request.modifier ? ` ${request.modifier >= 0 ? '+' : ''}${request.modifier}` : ''}
          {' = '}<strong className="dice-total">{result.total}</strong>
          {request.dd && <span className="dice-dd">{` (DD ${request.dd}: ${result.success ? '✅ Succès' : '❌ Échec'})`}</span>}
        </span>
      </motion.div>
    )
  }

  return (
    <motion.button className={`dice-roll-btn ${animating ? 'rolling' : ''}`} onClick={handleRoll} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
      <span className={`dice-icon ${animating ? 'spin' : ''}`}>🎲</span>
      <span className="dice-info">
        <strong>{request.reason}</strong>
        <span className="dice-sub">{request.type}{request.modifier ? ` ${request.modifier >= 0 ? '+' : ''}${request.modifier}` : ''}{request.dd ? ` · DD ${request.dd}` : ''}</span>
      </span>
      <span className="dice-cta">Lancer</span>
    </motion.button>
  )
}

/* Character Sheet Modal */
function CharacterSheetModal({ char, onClose }) {
  if (!char) return null
  const stats = char.stats || {}
  const inventory = char.inventory || []
  const statKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha']
  const statLabels = { str: 'Force', dex: 'Dextérité', con: 'Constitution', int: 'Intelligence', wis: 'Sagesse', cha: 'Charisme' }

  return (
    <AnimatePresence>
      <motion.div className="sheet-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="sheet-modal" initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} onClick={e => e.stopPropagation()}>
          <button className="sheet-close" onClick={onClose}><X size={20} /></button>
          
          <div className="sheet-header-row">
            <div className="sheet-portrait-lg">
              {char.portrait_url ? <img src={char.portrait_url} alt={char.name} /> : <UserIcon size={40} />}
            </div>
            <div>
              <h2 className="sheet-name">{char.name}</h2>
              <p className="sheet-subtitle">
                {char.gender} {char.race} · {char.class} {char.age ? `· ${char.age} ans` : ''} · Niv.{char.level || 1}
              </p>
              <p className="sheet-bg">{char.background}</p>
            </div>
          </div>

          <div className="sheet-hp-row">
            <span className="sheet-hp-label">PV</span>
            <div className="pv-bar" style={{ flex: 1 }}>
              <div className={`pv-bar-fill ${getHpClass(char.hp_current, char.hp_max)}`} style={{ width: `${(char.hp_current / char.hp_max) * 100}%` }} />
            </div>
            <span className="sheet-hp-val">{char.hp_current} / {char.hp_max}</span>
          </div>

          <div className="sheet-stats-grid">
            {statKeys.map(k => (
              <div key={k} className="sheet-stat-box">
                <div className="sheet-stat-label">{statLabels[k]}</div>
                <div className="sheet-stat-val">{stats[k] || 10}</div>
                <div className="sheet-stat-mod">{formatStatMod(stats[k] || 10)}</div>
              </div>
            ))}
          </div>

          <div className="sheet-section">
            <h3>🎒 Inventaire</h3>
            {inventory.length > 0 ? (
              <ul className="sheet-inv-list">
                {inventory.map((item, i) => <li key={i}>{item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''}</li>)}
              </ul>
            ) : <p className="sheet-empty">Inventaire vide.</p>}
          </div>

          {char.appearance && (
            <div className="sheet-section">
              <h3>👤 Apparence</h3>
              <p className="sheet-desc">{char.appearance}</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ==================== MAIN COMPONENT ====================

export default function LiveSession({ campaign, character, session, onExit }) {
  // --- State ---
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [groupMembers, setGroupMembers] = useState([])
  const [sceneImage, setSceneImage] = useState(
    campaign.image || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1600'
  )
  const [narrationText, setNarrationText] = useState('')
  const [location, setLocation] = useState(campaign.name || 'Monde Inconnu')
  const [timeOfDay, setTimeOfDay] = useState('Matin')
  const [sceneMood, setSceneMood] = useState('Calme')
  const [pendingDice, setPendingDice] = useState([])
  const [pendingActions, setPendingActions] = useState({})
  const [readyPlayers, setReadyPlayers] = useState({})
  const [imageGenEnabled, setImageGenEnabled] = useState(true)
  const [selectedChar, setSelectedChar] = useState(null)
  const [quests, setQuests] = useState([])
  const [showMap, setShowMap] = useState(false)
  const [mapImageUrl, setMapImageUrl] = useState(campaign.map_url || null)
  const chatEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const imageGenInProgress = useRef(false) // prevent double image gen
  const hasInitialized = useRef(false) // prevent double initial narration

  // --- Effects ---
  useEffect(() => {
    loadGroupMembers()
    loadChatHistory()
    if (!mapImageUrl) generateMap()
  }, [campaign.id])

  useEffect(() => {
    if (groupMembers.length > 0 && messages.length === 0 && !hasInitialized.current) {
      hasInitialized.current = true
      generateInitialNarration()
    }
  }, [groupMembers])

  // Realtime: new logs
  useEffect(() => {
    const channel = db.logs.subscribe(campaign.id, (payload) => {
      const newLog = payload.new
      setMessages(prev => {
        const exists = prev.some(m => m.id === newLog.id)
        if (exists) return prev
        return [...prev, {
          id: newLog.id,
          role: newLog.type === 'narration' ? 'mj' : newLog.type === 'system' ? 'system' : newLog.type === 'whisper' ? 'whisper' : 'user',
          content: newLog.content,
          sender: newLog.sender_name,
          metadata: newLog.metadata
        }]
      })
    })
    return () => supabase.removeChannel(channel)
  }, [campaign.id])

  // Realtime: character PV
  useEffect(() => {
    const channel = db.realtime.subscribeCharacters(campaign.id, (payload) => {
      const updated = payload.new
      setGroupMembers(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
    })
    return () => supabase.removeChannel(channel)
  }, [campaign.id])

  // Realtime: game state
  useEffect(() => {
    const channel = db.realtime.subscribeGameState(campaign.id, (payload) => {
      const state = payload.new
      if (state?.metadata?.ready_players) setReadyPlayers(state.metadata.ready_players)
      if (state?.metadata?.pending_actions) setPendingActions(state.metadata.pending_actions)
      if (state?.metadata?.quests) setQuests(state.metadata.quests)
    })
    return () => supabase.removeChannel(channel)
  }, [campaign.id])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, pendingDice])

  // --- Data Loading ---
  const loadGroupMembers = async () => {
    try {
      const chars = await db.characters.getByCampaign(campaign.id)
      setGroupMembers(chars || (character ? [character] : []))
    } catch (err) {
      console.error('Error loading group:', err)
      if (character) setGroupMembers([character])
    }
  }

  const loadChatHistory = async () => {
    try {
      const logs = await db.logs.getRecent(campaign.id, 50)
      if (logs.length > 0) {
        setMessages(logs.map(log => ({
          id: log.id,
          role: log.type === 'narration' ? 'mj' : log.type === 'system' ? 'system' : log.type === 'whisper' ? 'whisper' : 'user',
          content: log.content,
          sender: log.sender_name,
          metadata: log.metadata
        })))
        const lastMjMsg = [...logs].reverse().find(l => l.type === 'narration')
        if (lastMjMsg?.metadata) {
          if (lastMjMsg.metadata.location) setLocation(lastMjMsg.metadata.location)
          if (lastMjMsg.metadata.time_of_day) setTimeOfDay(lastMjMsg.metadata.time_of_day)
          if (lastMjMsg.metadata.scene_mood) setSceneMood(lastMjMsg.metadata.scene_mood)
        }
        if (lastMjMsg) setNarrationText(lastMjMsg.content)
      }

      // Load quests from game state
      try {
        const state = await db.gameState.get(campaign.id)
        if (state?.metadata?.quests) setQuests(state.metadata.quests)
      } catch (e) { /* no game state yet */ }
    } catch (err) {
      console.error('Error loading chat history:', err)
    }
  }

  const generateMap = async () => {
    try {
      const mapUrl = await aiService.generateSceneImage(
        `fantasy world map, top-down view, parchment style, detailed regions, mountains, forests, cities, rivers. World: ${campaign.name}`,
        'medieval fantasy cartography style, antique map, ink on parchment'
      )
      setMapImageUrl(mapUrl)
    } catch (err) {
      console.warn('[Map] Generation failed:', err.message)
    }
  }

  const generateInitialNarration = async () => {
    try {
      const logs = await db.logs.getRecent(campaign.id, 1)
      if (logs.length > 0) {
        const lastMj = logs.find(l => l.type === 'narration')
        if (lastMj) setNarrationText(lastMj.content)
        return
      }

      setLoading(true)
      const response = await aiService.generateResponse(
        campaign, character, [],
        `Le MJ accueille le groupe dans l'aventure "${campaign.name}". Décris la scène d'ouverture. NE DEMANDE PAS de jets de dés pour la scène d'ouverture, c'est juste narratif.`,
        groupMembers
      )
      await processAIResponse(response, true)
      setLoading(false)
    } catch (err) {
      console.error('Error generating initial narration:', err)
      setNarrationText(`Bienvenue dans "${campaign.name}". L'aventure commence ici...`)
      setLoading(false)
    }
  }

  // --- Core: Process AI Response ---
  // skipImage = true to prevent image gen on initial narration / double gen
  const processAIResponse = async (response, skipImage = false) => {
    const mjMsg = {
      id: `mj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'mj',
      content: response.content,
      sender: response.sender || 'Architecte MJ'
    }
    setMessages(prev => [...prev, mjMsg])
    setNarrationText(response.content)

    if (response.location) setLocation(response.location)
    if (response.time_of_day) setTimeOfDay(response.time_of_day)
    if (response.scene_mood) setSceneMood(response.scene_mood)

    // Persist
    await db.logs.add(campaign.id, 'narration', response.content, response.sender || 'Architecte MJ', {
      location: response.location,
      time_of_day: response.time_of_day,
      scene_mood: response.scene_mood
    })

    // Function calls
    if (response.function_calls?.length > 0) {
      for (const call of response.function_calls) {
        const result = await db.executeFunctionCall(call, campaign.id, groupMembers)
        setMessages(prev => [...prev, {
          id: `fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'system',
          content: `${getFCLabel(call.name)}: ${getFCDescription(call, result)}`,
          sender: 'Système'
        }])

        if (call.name === 'update_lore_entry' && call.args?.category === 'quête') {
          setQuests(prev => [...prev.filter(q => q.key !== call.args.key), { key: call.args.key, details: call.args.details, done: false }])
        }
      }
      await loadGroupMembers()
    }

    // Dice requests
    if (response.dice_requests?.length > 0) {
      setPendingDice(prev => [...prev, ...response.dice_requests.map((dr, i) => ({
        ...dr,
        id: `dice-${Date.now()}-${i}`
      }))])
    }

    // Scene image (only if enabled AND not skipped AND no gen already in progress)
    if (imageGenEnabled && !skipImage && response.content && !imageGenInProgress.current) {
      imageGenInProgress.current = true
      aiService.generateSceneImage(
        response.content.substring(0, 200),
        response.location || campaign.name,
        groupMembers
      ).then(imageUrl => {
        if (imageUrl) setSceneImage(imageUrl)
      }).catch(err => {
        console.warn('[Scene Image] Generation failed:', err.message)
      }).finally(() => {
        imageGenInProgress.current = false
      })
    }
  }

  const getFCLabel = (name) => ({
    'update_stat': '⚔️ Stat modifiée',
    'consume_item': '🎒 Objet consommé',
    'use_spell_slot': '✨ Sort utilisé',
    'apply_rest': '🏕️ Repos appliqué',
    'update_lore_entry': '📖 Lore mis à jour'
  }[name] || name)

  const getFCDescription = (call, result) => {
    if (!result) return 'Échec'
    switch (call.name) {
      case 'update_stat': return `${result.character}: ${result.stat} ${result.oldValue} → ${result.newValue}`
      case 'consume_item': return `${result.character} perd ${result.consumed}x ${result.item}`
      case 'apply_rest': return `Repos ${result.type} — ${result.healed} héros soignés`
      case 'use_spell_slot': return `${result.character}: niv.${result.spellLevel} (reste: ${result.remaining})`
      case 'update_lore_entry': return `${result.category}: ${result.key}`
      default: return JSON.stringify(result)
    }
  }

  // --- Dice Roll Handler ---
  const handleDiceRoll = async (rollResult) => {
    setPendingDice(prev => prev.filter(d => d.id !== rollResult.id))

    const resultMsg = `🎲 ${character.name} lance ${rollResult.type} pour "${rollResult.reason}": ${rollResult.raw}${rollResult.modifier ? (rollResult.modifier >= 0 ? '+' : '') + rollResult.modifier : ''} = ${rollResult.total}${rollResult.dd ? ` (DD ${rollResult.dd}: ${rollResult.success ? 'Succès ✅' : 'Échec ❌'})` : ''}`

    await db.logs.add(campaign.id, 'dice', resultMsg, character.name)
    setMessages(prev => [...prev, { id: `dr-${Date.now()}`, role: 'system', content: resultMsg, sender: character.name }])

    setLoading(true)
    try {
      const response = await aiService.generateResponse(
        campaign, character,
        messages.slice(-8).map(m => ({ role: m.role === 'mj' ? 'model' : 'user', content: `${m.sender}: ${m.content}` })),
        `[RÉSULTAT DE JET] ${resultMsg}. Narre la conséquence.`,
        groupMembers
      )
      await processAIResponse(response)
    } catch (err) {
      console.error('AI Error after dice:', err)
    } finally {
      setLoading(false)
    }
  }

  // --- Slash Commands ---
  const processSlashCommand = async (input) => {
    const parts = input.split(' ')
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1).join(' ')

    switch (cmd) {
      case '/help': {
        const helpText = Object.entries(SLASH_COMMANDS).map(([c, info]) => `${c} — ${info.description}`).join('\n')
        addSystemMessage(`📜 Commandes disponibles :\n${helpText}`)
        return true
      }

      case '/inventory': {
        const inv = character.inventory || []
        const invText = inv.length > 0 ? inv.map(i => `• ${i.name}${i.quantity > 1 ? ` (x${i.quantity})` : ''}`).join('\n') : 'Inventaire vide.'
        addSystemMessage(`🎒 Inventaire de ${character.name} :\n${invText}`)
        return true
      }

      case '/stats': {
        const stats = character.stats || {}
        const statText = Object.entries(stats).filter(([k]) => ['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(k)).map(([k, v]) => `${k.toUpperCase()}: ${v} (${formatStatMod(v)})`).join(' | ')
        addSystemMessage(`📊 ${character.name} — Niv.${character.level || 1} ${character.race} ${character.class}\nPV: ${character.hp_current}/${character.hp_max}\n${statText || 'Aucune stat enregistrée.'}`)
        return true
      }

      case '/save': {
        addSystemMessage('💾 Sauvegarde en cours...')
        setLoading(true)
        try {
          const response = await aiService.generateResponse(campaign, character, messages.slice(-20).map(m => ({ role: m.role === 'mj' ? 'model' : 'user', content: `${m.sender}: ${m.content}` })), '[COMMANDE SYSTÈME] /save — Génère un résumé narratif de cette session.', groupMembers)
          await processAIResponse(response)
        } catch { addSystemMessage('❌ Erreur lors de la sauvegarde.') }
        finally { setLoading(false) }
        return true
      }

      case '/r': {
        // Whisper between players — pink, no AI response
        if (!args) { addSystemMessage('Usage: /r [message entre joueurs]'); return true }
        const whisperMsg = {
          id: `whisper-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'whisper',
          content: args,
          sender: character.name
        }
        setMessages(prev => [...prev, whisperMsg])
        await db.logs.add(campaign.id, 'whisper', args, character.name)
        return true
      }

      case '/dm': {
        if (!args) { addSystemMessage('Usage: /dm [question hors-RP]'); return true }
        setLoading(true)
        try {
          const response = await aiService.generateResponse(campaign, character, messages.slice(-8).map(m => ({ role: m.role === 'mj' ? 'model' : 'user', content: `${m.sender}: ${m.content}` })), `[QUESTION HORS-RP de ${character.name}] ${args}.`, groupMembers)
          await processAIResponse(response)
        } catch { addSystemMessage('❌ Le MJ ne peut pas répondre.') }
        finally { setLoading(false) }
        return true
      }

      case '/rest': {
        addSystemMessage('🏕️ Proposition de repos...')
        setLoading(true)
        try {
          const response = await aiService.generateResponse(campaign, character, messages.slice(-8).map(m => ({ role: m.role === 'mj' ? 'model' : 'user', content: `${m.sender}: ${m.content}` })), `[COMMANDE SYSTÈME] ${character.name} propose un repos.`, groupMembers)
          await processAIResponse(response)
        } catch { addSystemMessage('❌ Le repos n\'est pas possible ici.') }
        finally { setLoading(false) }
        return true
      }

      case '/img': {
        const newState = !imageGenEnabled
        setImageGenEnabled(newState)
        addSystemMessage(newState ? '🖼️ Génération d\'images activée.' : '🚫 Génération d\'images désactivée.')
        return true
      }

      default:
        addSystemMessage(`❓ Commande inconnue: ${cmd}. Tapez /help.`)
        return true
    }
  }

  const addSystemMessage = (content) => {
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'system', content, sender: 'Système'
    }])
  }

  // --- Validation Collective (in chat) ---
  const submitAction = async (actionText) => {
    if (!actionText?.trim()) return

    const newPending = { ...pendingActions, [character.id]: actionText.trim() }
    const newReady = { ...readyPlayers, [character.id]: true }

    setPendingActions(newPending)
    setReadyPlayers(newReady)

    db.gameState.update(campaign.id, { metadata: { pending_actions: newPending, ready_players: newReady, quests } })
      .catch(err => console.warn('[Game State] RLS blocked:', err.message))

    addSystemMessage(`✅ ${character.name} a soumis son action.`)

    const allReady = groupMembers.every(m => newReady[m.id])
    if (allReady && groupMembers.length > 0) {
      await resolveCollectiveActions(newPending)
    }
  }

  const resolveCollectiveActions = async (actions) => {
    addSystemMessage('⚔️ Tous les héros sont prêts ! Résolution du tour...')
    setLoading(true)
    try {
      const actionPile = Object.entries(actions).map(([charId, action]) => {
        const char = groupMembers.find(m => m.id === charId)
        return `${char?.name || 'Inconnu'}: "${action}"`
      }).join('\n')

      const response = await aiService.generateResponse(campaign, character,
        messages.slice(-10).map(m => ({ role: m.role === 'mj' ? 'model' : 'user', content: `${m.sender}: ${m.content}` })),
        `[PILE D'ACTIONS]\n${actionPile}\nRésous chaque action narrativement et applique les conséquences.`,
        groupMembers
      )
      await processAIResponse(response)
      setReadyPlayers({})
      setPendingActions({})
      db.gameState.update(campaign.id, { metadata: { pending_actions: {}, ready_players: {}, quests } })
        .catch(err => console.warn('[Game State] RLS blocked:', err.message))
    } catch (err) {
      console.error('Error resolving:', err)
      addSystemMessage('❌ Erreur lors de la résolution.')
    } finally {
      setLoading(false)
    }
  }

  // --- Unified Send Handler ---
  // Everything goes through here: slash commands, actions, or direct RP
  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')

    // Slash commands always take priority
    if (userMsg.startsWith('/')) {
      const handled = await processSlashCommand(userMsg)
      if (handled) return
    }

    // If player hasn't submitted a turn action yet, treat as action
    const playerIsReadyNow = readyPlayers[character?.id]
    if (!playerIsReadyNow) {
      // Add as user message + submit as action
      setMessages(prev => [...prev, { id: `local-${Date.now()}`, role: 'user', content: userMsg, sender: character.name }])
      try { await db.logs.add(campaign.id, 'chat', userMsg, character.name) } catch {}
      await submitAction(userMsg)
      return
    }

    // Already submitted action — this is just chat/RP
    setMessages(prev => [...prev, { id: `local-${Date.now()}`, role: 'user', content: userMsg, sender: character.name }])
    try { await db.logs.add(campaign.id, 'chat', userMsg, character.name) } catch {}

    setLoading(true)
    try {
      const response = await aiService.generateResponse(campaign, character,
        messages.slice(-10).map(m => ({ role: m.role === 'mj' ? 'model' : 'user', content: `${m.sender}: ${m.content}` })),
        userMsg, groupMembers
      )
      await processAIResponse(response)
    } catch (err) {
      console.error('AI Error:', err)
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'mj', content: "L'Oracle est perturbé... Réessayez.", sender: 'Système' }])
    } finally {
      setLoading(false)
    }
  }

  // ==================== RENDER ====================

  const timeIcon = TIME_ICONS[timeOfDay] || '🌤️'
  const readyCount = Object.keys(readyPlayers).filter(k => readyPlayers[k]).length
  const totalPlayers = groupMembers.length
  const playerIsReady = readyPlayers[character?.id]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="live-layout">
      
      {/* Character Sheet Modal */}
      {selectedChar && <CharacterSheetModal char={selectedChar} onClose={() => setSelectedChar(null)} />}

      {/* Map Modal */}
      {showMap && (
        <motion.div className="sheet-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowMap(false)}>
          <motion.div className="map-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
            <button className="sheet-close" onClick={() => setShowMap(false)}><X size={20} /></button>
            <h2 className="map-title">🗺️ Carte du Monde — {campaign.name}</h2>
            {mapImageUrl ? (
              <img src={mapImageUrl} alt="Carte du monde" className="map-image" />
            ) : (
              <div className="map-loading">Génération de la carte en cours...</div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* ===== TOP BAR ===== */}
      <header className="live-topbar">
        <div className="live-topbar-left">
          <button className="live-tab" onClick={() => setShowMap(true)}>
            <span className="tab-icon">🗺️</span> Carte
          </button>
          <button className="live-tab active">Session</button>
        </div>

        <div className="live-topbar-center">
          <div className="live-location">
            <span className="loc-icon">📍</span> {location}
          </div>
          <div className="live-topbar-divider" />
          <div className="live-time">
            <span className="time-icon">{timeIcon}</span> {timeOfDay} {MOOD_LABELS[sceneMood] || sceneMood}
          </div>
        </div>

        <div className="live-topbar-right">
          <button className="live-lang-btn">🇫🇷 <ChevronDown size={12} /></button>
          <button className="btn-quit" onClick={onExit}>Quitter</button>
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <div className="live-content">

        {/* --- Sidebar Left --- */}
        <aside className="live-sidebar-left">
          <div className="group-status">
            <div className="group-status-title">
              Statut du Groupe <span className="hint">(clique pour la fiche)</span>
            </div>

            {groupMembers.map(member => {
              const hpPct = Math.max(0, Math.min(100, (member.hp_current / member.hp_max) * 100))
              const hpClass = getHpClass(member.hp_current, member.hp_max)
              const isReady = readyPlayers[member.id]
              return (
                <div key={member.id} className="group-member" onClick={() => setSelectedChar(member)}>
                  <div className="member-portrait">
                    {member.portrait_url ? <img src={member.portrait_url} alt={member.name} /> : <UserIcon size={16} />}
                  </div>
                  <div className="member-info">
                    <div className="member-name">
                      {member.name}
                      <span className="member-pv-text">{member.hp_current} PV</span>
                    </div>
                    <div className="pv-bar">
                      <div className={`pv-bar-fill ${hpClass}`} style={{ width: `${hpPct}%` }} />
                    </div>
                    <div className="member-state">
                      État: {member.is_dead ? '💀 Mort' : member.hp_current <= 0 ? '⚠️ Inconscient' : isReady ? '✅ Prêt' : 'Prêt'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Journal de Quête */}
          <div className="quest-journal">
            <div className="quest-journal-title">📖 Le Journal de Quête</div>
            {quests.length > 0 ? (
              <div className="quest-list">
                {quests.map((q, i) => (
                  <div key={i} className={`quest-item ${q.done ? 'done' : ''}`}>
                    <span className="quest-icon">{q.done ? '✅' : '🔹'}</span>
                    <div>
                      <div className="quest-key">{q.key}</div>
                      {q.details && <div className="quest-details">{q.details}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="quest-empty">Les objectifs apparaîtront au fil de l'aventure...</div>
            )}
          </div>
        </aside>

        {/* --- Main Scene --- */}
        <main className="live-main-scene">
          <div className="scene-wrapper">
            <img src={sceneImage} alt="Scène actuelle" className="scene-img" />
            <div className="scene-vignette" />
            <div className="scene-gradient-bottom" />
            <div className="narration-block">
              <div className="narration-quote">
                <p className="narration-text">
                  {narrationText || `Bienvenue dans "${campaign.name}". Votre aventure commence maintenant...`}
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* --- Sidebar Right: Chat --- */}
        <aside className="live-sidebar-right">
          <div className="chat-header">
            <div className="chat-header-left">
              <span className="chat-label">💬 Chat</span>
              <span className="ia-badge"><span className="ia-badge-dot" /> IA DM Active</span>
            </div>
            <div className="chat-header-actions">
              <button className={`chat-action-btn ${imageGenEnabled ? 'active-toggle' : ''}`} title={imageGenEnabled ? 'Images activées' : 'Images désactivées'} onClick={() => { setImageGenEnabled(!imageGenEnabled); addSystemMessage(imageGenEnabled ? '🚫 Images désactivées.' : '🖼️ Images activées.') }}>
                {imageGenEnabled ? <ImageIcon size={16} /> : <ImageOff size={16} />}
              </button>
              <button className="chat-action-btn" title="Son"><Volume2 size={16} /></button>
            </div>
          </div>

          <div className="chat-messages" ref={chatContainerRef}>
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`live-chat-msg ${msg.role === 'system' ? 'system-msg-inline' : ''} ${msg.role === 'whisper' ? 'whisper-msg' : ''}`}>
                <span className={`msg-sender ${msg.role === 'mj' ? 'mj' : msg.role === 'system' ? 'system' : msg.role === 'whisper' ? 'whisper' : ''}`}>
                  {msg.role === 'whisper' ? `🤫 ${msg.sender}` : msg.sender}:
                </span>{' '}
                {msg.content}
              </div>
            ))}

            {pendingDice.map(dice => (
              <DiceRollButton key={dice.id} request={dice} characterName={character.name} onRoll={(result) => handleDiceRoll({ ...result, id: dice.id })} />
            ))}

            {loading && (
              <div className="chat-typing">
                L'Architecte réfléchit
                <div className="typing-dots"><span /><span /><span /></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Single unified input */}
          <div className="chat-input-container">
            {!playerIsReady ? (
              <div className="action-bar-label">
                ⚔️ Action du Tour
                {totalPlayers > 0 && <span className="ready-counter">{readyCount}/{totalPlayers}</span>}
              </div>
            ) : (
              <div className="action-submitted-bar">
                ✅ Action soumise — {readyCount}/{totalPlayers} prêts
              </div>
            )}
            <div className="chat-input-wrapper">
              <input
                type="text"
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={!playerIsReady ? 'Décrivez votre action... (/help)' : 'Discutez en attendant... (/help)'}
                disabled={loading}
              />
              <button className="chat-send-btn" onClick={handleSend} disabled={loading || !input.trim()} title="Envoyer">
                <Send size={16} />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  )
}
