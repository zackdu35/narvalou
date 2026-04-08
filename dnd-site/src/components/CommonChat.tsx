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
  const [isDmThinking, setIsDmThinking] = useState(false)
  const [pendingActions, setPendingActions] = useState<TurnAction[]>([])
  const [imageGenEnabled, setImageGenEnabled] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll au dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingActions])

  // Filtrer les messages visibles  
  const commonMessages = messages.filter((m: any) => {
    const content = (m.content || "").toUpperCase();
    return m.receiver_id === 'global' && 
           !content.includes('[REFRESH') && 
           !content.includes('[SYNC_SCENE');
  })

  // Trouver le perso du joueur actuel
  const currentCharacter = data.characters?.find((c: any) => 
    c.id?.toLowerCase() === currentRole?.toLowerCase()
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
      race: c.race,
      class: c.class,
      level: c.level,
      hp: c.hp,
      stats: c.stats,
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
      content: m.content.replace(/\[AUDIO:.*?\]/g, '').trim()
    }))
  })

  // ─────────────────────────────────────
  // HANDLER: Soumettre une action
  // ─────────────────────────────────────
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!typedMessage.trim() || !supabase) return

    const msg = typedMessage.trim()

    // /dm command → question méta directe
    if (msg.toLowerCase().startsWith('/dm ')) {
      const question = msg.substring(4).trim()
      if (question) handleDmQuestion(question)
      setTypedMessage('')
      return
    }

    // Action normale → ajouter au chat + au buffer de tour
    const charName = currentCharacter?.name || currentRole || 'Inconnu'
    
    sendMessage(msg, 'global')

    // Ajouter à la liste des actions en attente
    setPendingActions(prev => [...prev, {
      playerName: currentRole || 'guest',
      characterName: charName,
      action: msg,
    }])

    setTypedMessage('')
  }

  // ─────────────────────────────────────  
  // /DM Question (réponse instantanée)
  // ─────────────────────────────────────
  const handleDmQuestion = async (question: string) => {
    if (!isGeminiAvailable()) return

    // Afficher la question dans le chat
    sendMessage(`[/dm] ${question}`, 'global')
    
    setIsDmThinking(true)
    try {
      const answer = await askDmQuestion(question, buildContext())
      // Poster la réponse du DM dans le chat
      sendDmMessage(`📋 ${answer}`, 'global')
    } catch (e) {
      console.error('DM question error:', e)
      sendDmMessage('💀 Le DM ne peut pas répondre pour le moment...', 'global')
    }
    setIsDmThinking(false)
  }

  // ─────────────────────────────────────
  // ⚔️ RÉSOUDRE LE TOUR
  // ─────────────────────────────────────
  const handleResolveTurn = async () => {
    if (pendingActions.length === 0 || isResolving) return
    if (!isGeminiAvailable()) {
      sendDmMessage("⚠️ L'IA du DM n'est pas configurée (clé API manquante).", 'global')
      return
    }

    setIsResolving(true)
    
    const context = buildContext()
    const actionsThisTurn = [...pendingActions]
    setPendingActions([])

    try {
      // On récupère d'abord le résultat (narration + image éventuelle)
      const result = await resolveTurnWithImage(actionsThisTurn, context, imageGenEnabled)
      
      // Poster la narration du DM quoi qu'il arrive (même erreur)
      if (result.narration) {
        sendDmMessage(result.narration, 'global')
      }

      // N'AGIR SUR LA SCENE QUE SI CE N'EST PAS UNE ERREUR
      if (!result.isError) {
        // Mettre à jour la légende
        onSceneUpdate?.({ description: result.narration })

        // Si une image a été générée
        if (result.imageBase64 && result.imageMimeType) {
          const imageDataUrl = `data:${result.imageMimeType};base64,${result.imageBase64}`
          
          // Mettre à jour la scène immédiatement avec le base64 (optimiste)
          onSceneUpdate?.({ image: imageDataUrl, isGenerating: false })

          // Upload l'image à Supabase Storage pour la persister
          try {
            const blob = await base64ToBlob(result.imageBase64, result.imageMimeType)
            const fileName = `scenes/${campaignId}/turn_${Date.now()}.png`
            const { data: uploadData } = await supabase.storage
              .from('campaign-assets')
              .upload(fileName, blob, { contentType: result.imageMimeType })

            if (uploadData?.path) {
              const { data: urlData } = supabase.storage
                .from('campaign-assets')
                .getPublicUrl(uploadData.path)
              
              if (urlData?.publicUrl) {
                // Mettre à jour la scène avec la nouvelle image permanente
                await supabase.from('campaigns').update({
                  scene_image: urlData.publicUrl,
                  scene_description: result.narration.substring(0, 500),
                  is_generating: false
                }).eq('id', campaignId)

                // Envoyer un signal de sync
                sendDmMessage(`[SYNC_SCENE:${JSON.stringify({
                  image: urlData.publicUrl,
                  description: result.narration.substring(0, 500),
                  location: context.currentLocation,
                  time: context.currentTimeOfDay
                })}]`, 'global')
              }
            }
          } catch (uploadError) {
            console.warn('Image upload skipped:', uploadError)
            await supabase.from('campaigns').update({ is_generating: false }).eq('id', campaignId)
          }
        } else {
          // Succès narration mais pas d'image (désactivé ou échec)
          await supabase.from('campaigns').update({ is_generating: false }).eq('id', campaignId)
          onSceneUpdate?.({ 
            image: '/assets/ui/scene_placeholder.png', 
            isGenerating: false 
          })
        }
      } else {
        // C'était une erreur : on arrête le chargement en BDD
        await supabase.from('campaigns').update({ is_generating: false }).eq('id', campaignId)
        onSceneUpdate?.({ isGenerating: false })
      }
    } catch (error) {
      console.error('Turn resolution error:', error)
      sendDmMessage('💀 Erreur lors de la résolution du tour...', 'global')
      await supabase.from('campaigns').update({ is_generating: false }).eq('id', campaignId)
      onSceneUpdate?.({ isGenerating: false })
    }

    setIsResolving(false)
  }

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
          const cleanContent = m.content.replace(/\[AUDIO:.*?\]/g, '').trim()
          const isDmMsg = m.sender_id === 'DM' || m.sender_id === 'SYSTEM'
          const isSystemAction = cleanContent.startsWith('⚔️')
          const isDmQuestion = cleanContent.startsWith('[/dm]')

          if (isDmQuestion) {
            return (
              <div key={i} className="common-msg dm-question-msg">
                <span className="msg-author">❓ {senderName}:</span>
                <span className="msg-content">{cleanContent.replace('[/dm] ', '')}</span>
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

          return (
            <div key={i} className={`common-msg ${isDmMsg ? 'dm-msg' : 'player-msg'}`}>
              <span className="msg-author">{senderName}:</span>
              <span className="msg-content">
                {cleanContent.split(/(@[A-Za-z0-9_À-ÿ]+)/g).map((part: string, idx: number) =>
                  part.match(/^@[A-Za-z0-9_À-ÿ]+/) ? (
                    <span key={idx} className="mention">{part}</span>
                  ) : part
                )}
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
              onClick={() => setPendingActions([])}
              title="Annuler les actions"
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
            disabled={isResolving}
          >
            {isResolving ? (
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
