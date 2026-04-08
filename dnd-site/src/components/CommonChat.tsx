import React, { useState, useRef, useEffect } from 'react'
import { 
  resolveTurnWithImage, 
  askDmQuestion, 
  isGeminiAvailable,
  type TurnAction, 
  type CampaignContext 
} from '../lib/gemini'

interface CommonChatProps {
  messages: any[]
  data: any
  curT: any
  sendMessage: (text: string, receiverId: string) => void
  sendDmMessage: (text: string, receiverId: string) => void
  supabase: any
  campaignId: string
  currentRole: string | null
  onSceneUpdate?: (sceneData: any) => void
}

export const CommonChat = ({ messages, data, curT, sendMessage, sendDmMessage, supabase, campaignId, currentRole, onSceneUpdate }: CommonChatProps) => {
  const [typedMessage, setTypedMessage] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const isResolvingRef = useRef(false)
  const lastProcessedActionId = useRef<string | null>(null)
  const [isDmThinking, setIsDmThinking] = useState(false)
  const [imageGenEnabled, setImageGenEnabled] = useState(true)
  const [gameMode, setGameMode] = useState<'adventure' | 'interactive'>('adventure')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // --- Helper: Admin Proxy via local proxy (Bypass RLS) ---
  const adminProxy = async (method: 'UPDATE' | 'INSERT' | 'DELETE' | 'STORAGE_UPLOAD', table: string, params: { id?: any, data?: any, filter?: any, match?: any }) => {
    try {
      const res = await fetch('/api/admin-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, table, ...params })
      })
      return await res.json()
    } catch (e) {
      console.error(`Admin proxy failed for ${table} ${method}:`, e)
      return { error: e }
    }
  }

  // Filtrer les messages visibles  
  const commonMessages = messages.filter((m: any) => {
    const content = (m.content || "").toUpperCase();
    return m.receiver_id === 'global' && 
           !content.includes('[REFRESH') && 
           !content.includes('[SYNC_SCENE') &&
           !content.includes('[TURN_RESOLVED');
  })

  // Trouver le timestamp du dernier tour résolu
  const lastResolveMsg = [...messages].reverse().find(m => m.content === '[TURN_RESOLVED]')
  const lastResolveTime = lastResolveMsg ? new Date(lastResolveMsg.created_at).getTime() : 0

  // Récupérer les actions en attente depuis tous les messages (post-résolution)
  const pendingActions: TurnAction[] = messages
    .filter((m: any) => 
      m.receiver_id === 'action' && 
      new Date(m.created_at).getTime() > lastResolveTime
    )
    .map((m: any) => {
      const senderChar = data.characters?.find((c: any) => c.id === m.sender_id)
      return {
        playerName: m.sender_id,
        characterName: senderChar?.name || m.sender_id,
        action: m.content
      }
    })

  // Trouver le perso du joueur actuel
  const currentCharacter = data.characters?.find((c: any) => 
    c.id?.toLowerCase() === currentRole?.toLowerCase() ||
    c.id?.toLowerCase().split('_').pop() === currentRole?.toLowerCase()
  )

  // Construire le contexte de campagne pour Gemini
  const buildContext = (): CampaignContext => ({
    campaignName: data.campaignName,
    universe: data.universe,
    currentLocation: data.currentLocation,
    currentTimeOfDay: data.currentTimeOfDay,
    sceneDescription: data.currentScene?.description || '',
    characters: (data.characters || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      sex: c.sex,
      race: c.race,
      class: c.class,
      level: c.level,
      xp: c.xp,
      hp: c.hp,
      hitDice: c.hit_dice || c.hitDice,
      stats: c.stats,
      ac: c.ac,
      proficiencyBonus: c.proficiencyBonus,
      speed: c.speed,
      state: c.state,
      background: c.background,
      languages: c.languages,
      allies: c.allies,
      weapons: c.weapons,
      spells: c.spells,
      spellSlots: c.spellSlots,
      conditions: c.conditions,
      savingThrows: c.savingThrows,
      skillProficiencies: c.skillProficiencies,
      inventory: c.inventory,
      features: c.features,
      description: c.description,
      ideals: c.ideals,
      bonds: c.bonds,
    })),
    activeQuests: data.activeQuests || [],
    recentMessages: commonMessages.slice(-20).map((m: any) => ({
      sender: m.sender_id === 'DM' ? 'Maître du Donjon' : 
              (data.characters?.find((c: any) => c.id === m.sender_id)?.name || m.sender_id),
      content: m.content
        .replace(/\[AUDIO:.*?\]/g, '')
        .replace(/\[SYNOPSIS\][\s\S]*?\[\/SYNOPSIS\]/g, '')
        .replace(/\[UPDATE_STATE\][\s\S]*?\[\/UPDATE_STATE\]/g, '')
        .replace(/\[SYNOPSIS:[\s\S]*?\]/g, '') // Legacy support
        .replace(/\[UPDATE_STATE:[\s\S]*?\]/g, '') // Legacy support
        .trim()
    })),
    gameMode: gameMode
  })

  // ─────────────────────────────────────
  // ⚔️ RÉSOUDRE LE TOUR
  // ─────────────────────────────────────
  const handleResolveTurn = async () => {
    console.log("🎬 Début de handleResolveTurn...", { 
      actionsCount: pendingActions.length, 
      isResolving, 
      isGenerating: data.currentScene?.isGenerating 
    })
    if (pendingActions.length === 0 || isResolving || isResolvingRef.current) {
      console.warn("🚫 handleResolveTurn annulé (actions vides ou déjà en cours)")
      return
    }
    
    const lastAction = messages.filter((m: any) => m.receiver_id === 'action').pop()
    if (lastAction?.id === lastProcessedActionId.current) return
    if (lastAction) lastProcessedActionId.current = lastAction.id

    if (!isGeminiAvailable()) {
      sendDmMessage("⚠️ L'IA du DM n'est pas configurée (clé API manquante).", 'global')
      return
    }

    // 1. Verrou ATOMIQUE en base de donnée pour éviter les doubles résolutions
    const targetId = isNaN(Number(campaignId)) ? campaignId : Number(campaignId)
    const resultLock = await adminProxy('UPDATE', 'campaigns', {
      id: targetId,
      data: { is_generating: true },
      filter: { neq: { col: 'is_generating', val: true } }
    })
    
    if (resultLock.error || resultLock.count === 0) {
      console.warn("🛑 Une résolution est déjà en cours ou a été prise par un autre client via Admin Proxy.", resultLock)
      return
    }

    console.log("✅ Verrouillage réussi via Proxy.")

    setIsResolving(true)
    isResolvingRef.current = true
    const context = buildContext()
    const actionsThisTurn = [...pendingActions]
    
    // Marquer l'UI locale
    onSceneUpdate?.({ isGenerating: true })

    // Au lieu de supprimer (erreur de permissions), on marque la fin du tour pour tout le monde
    sendMessage('[TURN_RESOLVED]', 'global')

    try {
      const result = await resolveTurnWithImage(actionsThisTurn, context, imageGenEnabled)
      
      let finalNarration = result.narration || ''
      
      // Look for [SYNOPSIS]...[/SYNOPSIS] update (Memory) - New Format
      const synopsisMatch = finalNarration.match(/\[SYNOPSIS\]\s*([\s\S]*?)\s*\[\/SYNOPSIS\]/)
      if (synopsisMatch?.[1]) {
        const newSummary = synopsisMatch[1].trim()
        console.log("📝 Mise à jour de la mémoire via Proxy :", newSummary)
        await adminProxy('UPDATE', 'campaigns', { id: targetId, data: { summary: newSummary } })
      }

      // Look for [SYNOPSIS: ...] update (Memory) - Legacy Format
      const legacySynopsisMatch = finalNarration.match(/\[SYNOPSIS:\s*([\s\S]*?)\]/)
      if (legacySynopsisMatch?.[1]) {
        const newSummary = legacySynopsisMatch[1].trim()
        await adminProxy('UPDATE', 'campaigns', { id: targetId, data: { summary: newSummary } })
      }

      const state = result.stateUpdate || {}
      if (state.characters) {
        const charUpdates = state.characters.map(async (charUpdate: any) => {
          const charName = charUpdate.name.replace('@', '').trim()
          const char = data.characters?.find((c: any) => c.name.toLowerCase() === charName.toLowerCase())
          if (char) {
            const newHp = Math.max(0, charUpdate.hp)
            const fullId = char.id
            console.log(`❤️ Mise à jour PV via Proxy pour ${charName} : ${newHp}`)
            const res = await adminProxy('UPDATE', 'characters', { id: fullId, data: { hp_current: newHp } })
            if (res.error || res.count === 0) console.error(`❌ Échec PV pour ${charName}:`, res.error || "Count 0")
          } else {
            console.warn(`⚠️ Personnage non trouvé pour mise à jour PV : ${charName}`)
          }
        })
        await Promise.all(charUpdates)
      }

      if (state.quests) {
        console.log("📜 Mise à jour atomique des quêtes...")
        // 1. Dédupliquer par titre au cas où l'IA renvoie des doublons
        const uniqueQuests = Array.from(new Map(state.quests.map((q: any) => [q.title, q])).values())

        // 2. Supprimer les anciennes quêtes via Proxy
        await adminProxy('DELETE', 'quests', { match: { campaign_id: campaignId } })
        
        // 3. Insertion via Proxy (Bulk Insert possible)
        if (uniqueQuests.length > 0) {
          const questsToInsert = uniqueQuests.map((q: any) => ({
            campaign_id: campaignId,
            title: q.title,
            description: q.description,
            priority: q.priority || 'normal'
          }))
          const resInsert = await adminProxy('INSERT', 'quests', { data: questsToInsert })
          if (resInsert.error) console.error("❌ Erreur insertion quêtes:", resInsert.error)
        }
      }

      if (state.location || state.time) {
        const up: any = {}
        if (state.location) up.current_location = state.location
        if (state.time) up.current_time_of_day = state.time
        await adminProxy('UPDATE', 'campaigns', { id: targetId, data: up })
      }
      
      // Remove all technical tags and any trailing noise
      finalNarration = finalNarration
        .replace(/\[SYNOPSIS\][\s\S]*?\[\/SYNOPSIS\]/g, '')
        .replace(/\[UPDATE_STATE\][\s\S]*?\[\/UPDATE_STATE\]/g, '')
        .replace(/\[SYNOPSIS:[\s\S]*?\]/g, '')
        .replace(/\[UPDATE_STATE:[\s\S]*?\]/g, '')
        .trim()

      if (finalNarration) sendDmMessage(finalNarration, 'global')
      
      const fullStateUpdate = {
        location: state.location || data.currentLocation,
        time: state.time || data.currentTimeOfDay,
        // On ne passe plus characters et quests ici car la DB est la source de vérité
        // via le trigger de refetch auto.
        description: finalNarration.substring(0, 500)
      }

      if (!result.isError) {
        onSceneUpdate?.(fullStateUpdate)
        if (result.imageBase64 && result.imageMimeType) {
          const imageDataUrl = `data:${result.imageMimeType};base64,${result.imageBase64}`
          console.log(`📸 Image locale prête (${result.imageMimeType}, ${result.imageBase64.length} chars)`)
          onSceneUpdate?.({ image: imageDataUrl, isGenerating: false })

          try {
            const fileName = `scenes/${campaignId}/turn_${Date.now()}.png`
            console.log(`📤 Tentative d'upload via Proxy : ${fileName}`)
            
            const uploadRes = await adminProxy('STORAGE_UPLOAD', 'campaign-assets', {
              data: {
                bucket: 'campaign-assets',
                path: fileName,
                base64: result.imageBase64,
                contentType: result.imageMimeType
              }
            })

            if (uploadRes.error) {
              console.error("❌ Erreur upload via Proxy :", uploadRes.error)
              await adminProxy('UPDATE', 'campaigns', { id: targetId, data: { is_generating: false } })
              return
            }

            const { data: urlData } = supabase.storage.from('campaign-assets').getPublicUrl(fileName)
            if (urlData?.publicUrl) {
              console.log(`🌍 Image uploadée et accessible via URL publique : ${urlData.publicUrl}`)
              await adminProxy('UPDATE', 'campaigns', {
                id: targetId,
                data: {
                  scene_image: urlData.publicUrl,
                  scene_description: result.narration.substring(0, 500),
                  is_generating: false
                }
              })

              sendDmMessage(`[SYNC_SCENE:${JSON.stringify({
                ...fullStateUpdate,
                image: urlData.publicUrl,
                caption: result.caption,
              })}]`, 'global')
            }
          } catch (uploadError) {
            console.error("❌ Erreur critique upload :", uploadError)
            await adminProxy('UPDATE', 'campaigns', { id: targetId, data: { is_generating: false } })
          }
        } else {
          await adminProxy('UPDATE', 'campaigns', { id: targetId, data: { is_generating: false } })
          onSceneUpdate?.({ image: '/assets/ui/scene_placeholder.png', isGenerating: false })
          // Still send refresh signal for state even if image failed
          sendDmMessage(`[SYNC_SCENE:${JSON.stringify(fullStateUpdate)}]`, 'global')
        }
      } else {
        await adminProxy('UPDATE', 'campaigns', { id: targetId, data: { is_generating: false } })
        onSceneUpdate?.({ isGenerating: false })
      }
    } catch (error) {
      sendDmMessage('💀 Erreur lors de la résolution du tour...', 'global')
      await adminProxy('UPDATE', 'campaigns', { id: targetId, data: { is_generating: false } })
      onSceneUpdate?.({ isGenerating: false })
    }
    setIsResolving(false)
    isResolvingRef.current = false
  }

  // ─────────────────────────────────────
  // HANDLER: Soumettre une action
  // ─────────────────────────────────────
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!typedMessage.trim() || !supabase) return
    const msg = typedMessage.trim()
    console.log("📤 Envoi du message:", msg)

    if (msg.toLowerCase().startsWith('/dm ')) {
      const question = msg.substring(4).trim()
      if (question) handleDmQuestion(question)
      setTypedMessage('')
      return
    }

    if (msg.toLowerCase().startsWith('/r ')) {
      const rpContent = msg.substring(3).trim()
      if (rpContent) {
        sendMessage(`[/r] ${rpContent}`, 'global')
      }
      setTypedMessage('')
      return
    }
    
    sendMessage(msg, 'global')
    sendMessage(msg, 'action')
    setTypedMessage('')
  }

  const handleDmQuestion = async (question: string) => {
    if (!isGeminiAvailable()) return
    sendMessage(`[/dm] ${question}`, 'global')
    setIsDmThinking(true)
    try {
      const answer = await askDmQuestion(question, buildContext())
      sendDmMessage(`📋 ${answer}`, 'global')
    } catch (e) {
      sendDmMessage('💀 Le DM ne peut pas répondre pour le moment...', 'global')
    }
    setIsDmThinking(false)
  }

  // --- EFFETS ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingActions])

  useEffect(() => {
    const totalPlayers = data.characters?.length || 0
    if (totalPlayers === 0) return
    
    // Filter only actions sent AFTER the last turn resolution
    const currentActions = messages.filter((m: any) => 
      m.receiver_id === 'action' && 
      new Date(m.created_at).getTime() > lastResolveTime
    )
    
    const playersReady = new Set(currentActions.map(a => a.sender_id))

    if (playersReady.size >= totalPlayers && !isResolving && !data.currentScene?.isGenerating) {
      const lastAction = currentActions[currentActions.length - 1]
      console.log("🤖 Tentative de résolution automatique...", { 
        lastActionSender: lastAction?.sender_id, 
        currentRole,
        match: lastAction?.sender_id === currentRole
      })
      // Only trigger if WE are the one who sent the last completing action
      if (lastAction && lastAction.sender_id === currentRole) {
        handleResolveTurn()
      }
    }
  }, [messages, data.characters, isResolving, data.currentScene?.isGenerating, currentRole, lastResolveTime])



  return (
    <div className="common-chat-container">
      {/* Header du chat */}
      <div className="chat-header">
        <div className="chat-header-left">
          <span className="chat-title">💬 {curT.commonChat || 'Chat'}</span>
          {isGeminiAvailable() && (
            <span className="ai-badge">🤖 IA DM Active</span>
          )}
        </div>
        <div className="chat-header-right">
          <label className="image-gen-toggle" title="Activer/désactiver la génération d'images">
            <input 
              type="checkbox" 
              checked={imageGenEnabled} 
              onChange={e => setImageGenEnabled(e.target.checked)} 
            />
            <span className="toggle-label">🎨</span>
          </label>
          <div style={{ margin: '0 8px', width: '1px', height: '16px', background: 'var(--accent-muted)' }}></div>
          <button 
            className={`mode-toggle-btn ${gameMode === 'interactive' ? 'active' : ''}`}
            onClick={() => setGameMode(prev => prev === 'adventure' ? 'interactive' : 'adventure')}
            title={gameMode === 'adventure' ? 'Mode Aventure (IA lance les dés)' : 'Mode Interactif (Joueur lance les dés)'}
          >
            {gameMode === 'adventure' ? '🚀' : '🏁'}
          </button>
        </div>
      </div>

      {/* Zone de messages */}
      <div className="common-chat-messages" ref={chatContainerRef}>
        {commonMessages.length === 0 && pendingActions.length === 0 && (
          <div className="chat-empty">{curT.emptyChat}</div>
        )}
        {commonMessages.map((m: any, i: number) => {
          const senderChar = data.characters?.find((c: any) => c.id === m.sender_id)
          const senderName = m.sender_id === 'DM' ? '🧙 Le Maître du Donjon' 
            : m.sender_id === 'SYSTEM' ? '⚙️ Système'
            : (senderChar?.name || m.sender_id)
          const cleanContent = m.content
            .replace(/\[AUDIO:.*?\]/g, '')
            .replace(/\[SYNOPSIS\][\s\S]*?\[\/SYNOPSIS\]/g, '')
            .replace(/\[UPDATE_STATE\][\s\S]*?\[\/UPDATE_STATE\]/g, '')
            .replace(/\[SYNOPSIS:[\s\S]*?\]/g, '')
            .replace(/\[UPDATE_STATE:[\s\S]*?\]/g, '')
            .trim()
          const isDiceBlock = cleanContent.startsWith('[DICE]')
          const isSystemAction = cleanContent.startsWith('⚔️')
          const isDmQuestion = cleanContent.startsWith('[/dm]')
          const isRoleplay = cleanContent.startsWith('[/r]')

          if (isDiceBlock) {
            const diceContent = cleanContent.replace('[DICE]', '').replace('[/DICE]', '').trim()
            const isFateReserve = diceContent.includes('Dés du Destin')
            
            return (
              <div key={i} className={`common-msg dice-msg ${isFateReserve ? 'fate-reserve' : ''}`}>
                <div className="dice-container">
                  {isFateReserve && <div className="dice-note">💡 Dés pré-tirés par le Destin pour les actions imprévues</div>}
                  {diceContent.split('\n').map((line: string, lidx: number) => (
                    <div key={lidx} className="dice-line">
                      {line.split(/(\*\*.*?\*\*|`.*?`)/g).map((part: string, pidx: number) => {
                        if (part.startsWith('**')) return <strong key={pidx}>{part.replace(/\*\*/g, '')}</strong>
                        if (part.startsWith('`')) return <code key={pidx}>{part.replace(/`/g, '')}</code>
                        return part
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )
          }

          if (isDmQuestion) {
            return (
              <div key={i} className="common-msg dm-question-msg">
                <span className="msg-author">❓ {senderName}:</span>
                <span className="msg-content">{cleanContent.replace('[/dm] ', '')}</span>
              </div>
            )
          }

          if (isRoleplay) {
            const roleplayText = cleanContent.replace('[/r] ', '')
            return (
              <div key={i} className="common-msg roleplay-msg">
                <span className="msg-author">🤫 {senderName} chuchote :</span>
                <span className="msg-content">
                  {roleplayText.split(/(@[A-Za-z0-9_À-ÿ]+)/g).map((part: string, idx: number) =>
                    part.match(/^@[A-Za-z0-9_À-ÿ]+/) ? (
                      <span key={idx} className="mention">{part}</span>
                    ) : part
                  )}
                </span>
              </div>
            )
          }

          if (isSystemAction) {
            return (
              <div key={i} className="common-msg system-action-msg">
                <span className="msg-content">{cleanContent}</span>
              </div>
            )
          }

          const isDmMsg = m.sender_id === 'DM' || m.sender_id === 'SYSTEM'

          return (
            <div key={i} className={`common-msg ${isDmMsg ? 'dm-msg' : 'player-msg'}`}>
              <span className="msg-author">{senderName}:</span>
              <span className="msg-content">
                {cleanContent.split(/(@[A-Za-z0-9_À-ÿ]+)/g).map((part: string, idx: number) => {
                  if (part.match(/^@[A-Za-z0-9_À-ÿ]+/)) {
                    const name = part.substring(1).toLowerCase()
                    const isPlayer = data.characters?.some((c: any) => c.name.toLowerCase() === name)
                    const isEnemy = name.includes('ennemi') || name.includes('gobelin') || name.includes('garde') || !isPlayer
                    
                    return (
                      <span key={idx} className={isEnemy ? "mention-enemy" : "mention"}>{part}</span>
                    )
                  }
                  return part
                })}
              </span>
            </div>
          )
        })}
        
        {/* Indicateur de résolution en cours */}
        {isResolving && (
          <div className="common-msg resolving-msg">
            <div className="resolving-indicator">
              <div className="dice-spinner">🎲</div>
              <span>Le Maître du Donjon résout les actions...</span>
            </div>
          </div>
        )}

        {isDmThinking && (
          <div className="common-msg resolving-msg">
            <div className="resolving-indicator">
              <div className="dice-spinner">📋</div>
              <span>Le DM consulte les règles...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Panneau d'actions en attente */}
      {pendingActions.length > 0 && (
        <div className="pending-actions-panel">
          <div className="pending-header">
            <span>⏳ Actions en attente ({pendingActions.length})</span>
            <button 
              className="clear-actions-btn" 
              onClick={async () => {
                console.log("🧹 Déverrouillage forcé via Proxy...")
                const targetId = isNaN(Number(campaignId)) ? campaignId : Number(campaignId)
                await sendMessage('[TURN_RESOLVED]', 'global')
                const res = await adminProxy('UPDATE', 'campaigns', { id: targetId, data: { is_generating: false } })
                if (res.error) console.error("❌ Échec du déverrouillage:", res.error)
                else console.log("✅ Déverrouillage réussi via Proxy pour:", targetId)
              }}
              title="Réinitialiser et déverrouiller le tour"
            >✕</button>
          </div>
          <div className="pending-list">
            {pendingActions.map((a, i) => (
              <div key={i} className="pending-action-item">
                <span className="pending-char">{a.characterName}</span>
                <span className="pending-text">{a.action}</span>
              </div>
            ))}
          </div>
          <button 
            className="resolve-turn-btn"
            onClick={handleResolveTurn}
            disabled={isResolving || data.currentScene?.isGenerating}
          >
            {isResolving || data.currentScene?.isGenerating ? (
              <>🎲 Résolution en cours...</>
            ) : (
              <>⚔️ Résoudre le tour ({pendingActions.length} action{pendingActions.length > 1 ? 's' : ''})</>
            )}
          </button>
        </div>
      )}

      {/* Input */}
      <form className="common-chat-input" onSubmit={handleSend}>
        <input
          type="text"
          placeholder={currentCharacter 
            ? `${currentCharacter.name} : décrivez votre action... (/dm pour une question)` 
            : curT.saySomething}
          value={typedMessage}
          onChange={e => setTypedMessage(e.target.value)}
          disabled={isResolving}
        />
        <button type="submit" disabled={isResolving || !typedMessage.trim()}>↪</button>
      </form>
    </div>
  )
}

// Utility: base64 → Blob
async function base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
  const dataUrl = `data:${mimeType};base64,${base64}`
  const res = await fetch(dataUrl)
  return res.blob()
}
