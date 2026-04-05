import { useState, useEffect } from 'react'
import './index.css'
import campaignData from './data/campaign.json'
import { supabase } from './lib/supabase'

function App() {
  const [data, setData] = useState(campaignData)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(0)
  
  // States pour le Live (Initialisé avec un placeholder ou le fallback local)
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [liveData, setLiveData] = useState<any>(null)
  const [lastFetched, setLastFetched] = useState(Date.now())
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null)
  const [activeGrimoire, setActiveGrimoire] = useState<any>(null)
  const [isMapVisible, setIsMapVisible] = useState(false)
  
  // 🎭 RÔLES ET CHAT
  const [currentRole, setCurrentRole] = useState<string | null>(null) // 'DM' or 'diaz', 'valmir', etc.
  const [messages, setMessages] = useState<any[]>([])

  // Détection du rôle via URL (?player=diaz ou ?dm=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const player = params.get('player')

    if (player) {
      setCurrentRole(player)
      // On force le mode Live pour les joueurs
      setIsLiveMode(true)
    }
  }, [])

  useEffect(() => {
    setData(campaignData)
  }, [])

  // 🌩️ REALTIME SUPABASE LISTENER
  useEffect(() => {
    let sub: any;

    if (isLiveMode) {
      // 1. On tente de charger l'état actuel initiale
      const fetchInitialLive = async () => {
        if (supabase) {
          try {
            const { data: initial, error } = await supabase
              .from('live_game')
              .select('data')
          
            if (error) {
              console.warn("Erreur Supabase:", error.message)
              return
            }

            if (initial && initial.length > 0) {
              // On prend le premier record (ou celui avec id=1)
              const session = initial[0]
              setLiveData(session.data)
              setLastFetched(Date.now())
            }
          } catch (err) {
            console.error("Exception lors du fetch Supabase:", err)
          }
        } else {
          // ... rest of fallback
          // Fallback Local si Supabase n'est pas configuré
          try {
            const res = await fetch('/live.json?t=' + Date.now())
            const jsonData = await res.json()
            setLiveData(jsonData)
          } catch (e) {
            console.error("No live source available.")
          }
        }
      }

      fetchInitialLive()

      // 2. On s'abonne aux changements en temps réel si Supabase est là
      if (supabase) {
        sub = supabase
          .channel('live-updates')
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'live_game',
            filter: 'id=eq.1'
          }, (payload) => {
            console.log('Update reçue du cloud !', payload.new.data)
            setLiveData(payload.new.data)
            setLastFetched(Date.now())
          })
          .subscribe()
      }
    }

    return () => {
      if (sub) supabase?.removeChannel(sub)
    }
  }, [isLiveMode])

  // 💬 REALTIME CHAT LISTENER
  useEffect(() => {
    if (!supabase || !isLiveMode) return;

    const fetchInitialMessages = async () => {
      const { data: initialMsgs, error } = await supabase!
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
      
      if (!error && initialMsgs) {
        setMessages(initialMsgs)
      }
    }

    fetchInitialMessages()

    const channel = supabase
      .channel('chat-messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        // Notification visuelle si chat fermé (TODO)
      })
      .subscribe()

    return () => {
      if (supabase) supabase.removeChannel(channel)
    }
  }, [isLiveMode])

  const sendMessage = async (text: string, receiverId: string) => {
    if (!supabase || !currentRole || !text.trim()) return;

    const newMessage = {
      sender_id: currentRole,
      receiver_id: receiverId,
      content: text.trim()
    }

    const { error } = await supabase
      .from('messages')
      .insert([newMessage])
    
    if (error) console.error("Erreur d'envoi:", error)
  }

  const CharacterSheet = ({ char, onClose }: { char: any, onClose: () => void }) => {
    if (!char) return null;

    const getMod = (score: number) => {
      const mod = Math.floor((score - 10) / 2);
      return mod >= 0 ? `+${mod}` : mod;
    };

    return (
      <div className="char-sheet-overlay" onClick={onClose}>
        <div className="char-sheet-content" onClick={e => e.stopPropagation()}>
          <button className="close-btn" style={{ color: 'var(--accent)', top: '15px', right: '15px', fontSize: '2rem' }} onClick={onClose}>×</button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px', borderBottom: '2px solid var(--accent)', paddingBottom: '10px', position: 'relative' }}>
            <h2 style={{ margin: 0, textAlign: 'left', flex: 1, fontFamily: 'Cinzel', fontSize: '2.5rem', color: 'var(--accent)', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>{char.name}</h2>
            
            <div style={{ textAlign: 'right', fontSize: '0.85rem', fontFamily: 'Cinzel', color: 'var(--text-secondary)', paddingRight: '40px' }}>
              <div>
                <strong style={{ color: 'var(--accent)' }}>CLASSE & NIVEAU:</strong> <span style={{ color: '#fff' }}>{char.class} {char.level}</span>
              </div>
              <div style={{ marginTop: '4px' }}>
                <strong style={{ color: 'var(--accent)' }}>RACE:</strong> <span style={{ color: '#fff' }}>{char.race}</span>
              </div>
              
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.65rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 'bold' }}>Expérience : {char.xp.current} / {char.xp.next} XP</span>
                <div style={{ width: '180px', height: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '3px', overflow: 'hidden', marginTop: '5px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                  <div style={{ 
                    width: `${(char.xp.current / char.xp.next) * 100}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #d4af37, #f7d794)', 
                    boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)',
                    transition: 'width 1s ease-out'
                  }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="dnd-sheet-grid">
            <div className="attributes-col">
              {[
                { n: 'Force', s: char.stats.str, id: 'str' },
                { n: 'Dextérité', s: char.stats.dex, id: 'dex' },
                { n: 'Constitution', s: char.stats.con, id: 'con' },
                { n: 'Intelligence', s: char.stats.int, id: 'int' },
                { n: 'Sagesse', s: char.stats.wis, id: 'wis' },
                { n: 'Charisme', s: char.stats.cha, id: 'cha' }
              ].map(stat => (
                <div className="attribute-item" key={stat.id}>
                  <span className="name">{stat.n}</span>
                  <span className="modifier">{getMod(stat.s)}</span>
                  <div className="score-circle">{stat.s}</div>
                </div>
              ))}
            </div>

            <div className="skills-col">
              <div className="proficiency-bonus">
                <div style={{ width: '22px', height: '22px', border: '2px solid var(--accent)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent)' }}>+2</div>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent)' }}>Bonus de Maîtrise</span>
              </div>
              
              <div className="skills-list" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', borderBottom: '1px solid var(--accent)', paddingBottom: '3px', fontSize: '0.7rem', color: 'var(--accent)' }}>COMPÉTENCES</div>
                {[
                  { n: 'Acrobaties', a: 'dex' },
                  { n: 'Arcanes', a: 'int' },
                  { n: 'Athlétisme', a: 'str' },
                  { n: 'Discrétion', a: 'dex' },
                  { n: 'Histoire', a: 'int' },
                  { n: 'Intimidation', a: 'cha' },
                  { n: 'Investigation', a: 'int' },
                  { n: 'Médecine', a: 'wis' },
                  { n: 'Nature', a: 'int' },
                  { n: 'Perception', a: 'wis' },
                  { n: 'Persuasion', a: 'cha' },
                  { n: 'Religion', a: 'int' },
                  { n: 'Survie', a: 'wis' }
                ].map(s => (
                  <div className="skill-row" key={s.n}>
                    <div className="bubble" style={{ borderColor: 'var(--accent)' }}></div>
                    <div className="mod" style={{ borderBottomColor: 'var(--accent)' }}>{getMod(char.stats[s.a])}</div>
                    <span style={{ color: 'var(--text-primary)' }}>{s.n} <small style={{ opacity: 0.5, fontSize: '0.6rem' }}>({s.a.toUpperCase()})</small></span>
                  </div>
                ))}
              </div>
            </div>

            <div className="combat-col">
              <div className="combat-stats">
                <div className="combat-box">
                  <span className="label">CA</span>
                  <span className="value">{10 + parseInt(String(getMod(char.stats.dex)))}</span>
                </div>
                <div className="combat-box">
                  <span className="label">Init.</span>
                  <span className="value">{getMod(char.stats.dex)}</span>
                </div>
                <div className="combat-box">
                  <span className="label">Vitesse</span>
                  <span className="value" style={{ fontSize: '1.4rem' }}>9m</span>
                </div>
                {char.spellSlots?.max > 0 && (
                  <div className="combat-box" style={{ border: '1px solid #4a90e2', background: 'rgba(74, 144, 226, 0.05)' }}>
                    <span className="label" style={{ color: '#4a90e2' }}>Sorts (Lvl 1)</span>
                    <span className="value" style={{ color: '#fff' }}>{char.spellSlots.current} / {char.spellSlots.max}</span>
                  </div>
                )}
              </div>

              <div className="hp-box" style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--accent)' }}>
                <div className="hp-value" style={{ fontSize: '2.2rem', color: '#fff' }}>{char.hp.current} / {char.hp.max}</div>
                <div className="hp-label" style={{ fontWeight: 'bold', letterSpacing: '1px', color: 'var(--accent)' }}>Points de Vie Actuels</div>
              </div>

              <div style={{ border: '2px solid var(--accent)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', marginTop: '20px' }}>
                <img src={char.image} alt={char.name} style={{ width: '100%', height: '450px', objectFit: 'cover', objectPosition: 'center 20%', display: 'block', transition: 'all 0.5s' }} />
              </div>
            </div>

            <div className="personality-col">
              <div className="personality-item">
                <span className="label">Traits de Personnalité</span>
                <div className="text">{char.description}</div>
              </div>
              <div className="personality-item">
                <span className="label">Idéaux</span>
                <div className="text">{char.ideals}</div>
              </div>
              <div className="personality-item">
                <span className="label">Liens</span>
                <div className="text">{char.bonds}</div>
              </div>
              <div className="personality-item" style={{ flex: 1 }}>
                <span className="label">Capacités & Traits</span>
                <div className="text" style={{ fontSize: '0.75rem' }}>
                  {char.features?.map((f: string, i: number) => (
                    <div key={i}>• {f}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="inventory-col">
              <div style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', borderBottom: '1px solid var(--accent)', paddingBottom: '3px', fontSize: '0.7rem', color: 'var(--accent)' }}>INVENTAIRE ACTIF</div>
              <div className="inventory-list" style={{ background: 'rgba(0,0,0,0.4)' }}>
                {char.inventory?.map((item: string, i: number) => (
                  <div className="inventory-item" key={i} style={{ color: 'var(--text-secondary)' }}>{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const openSession = (session: any) => {
    setSelectedSession(session)
    setCurrentStep(0)
    setIsLiveMode(false)
  }

  const nextStep = () => {
    if (selectedSession?.story && currentStep < selectedSession.story.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const Grimoire = ({ char, onClose }: { char: any, onClose: () => void }) => {
    if (!char) return null;
    return (
      <div className="char-sheet-overlay" onClick={onClose} style={{ zIndex: 4000 }}>
        <div className="char-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
          <button className="close-btn" style={{ color: 'var(--accent)' }} onClick={onClose}>×</button>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '3rem' }}>📜</span>
            <h2 style={{ margin: 0, fontFamily: 'Cinzel', color: 'var(--accent)', fontSize: '2rem' }}>Grimoire d'aide : {char.name}</h2>
            <p style={{ opacity: 0.7, fontStyle: 'italic', marginBottom: '20px' }}>Essentiel pour bien débuter l'aventure</p>
            
            {char.spellSlots?.max > 0 && (
              <div style={{ 
                display: 'inline-block', 
                background: 'rgba(74, 144, 226, 0.1)', 
                border: '1px solid #4a90e2', 
                padding: '10px 25px', 
                borderRadius: '5px', 
                marginBottom: '30px',
                boxShadow: '0 0 15px rgba(74, 144, 226, 0.2)'
              }}>
                <span style={{ color: '#4a90e2', fontSize: '0.8rem', letterSpacing: '1px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  ⚡ Emplacements de sorts restants : 
                  <span style={{ color: '#fff', fontSize: '1.2rem', marginLeft: '10px' }}>{char.spellSlots.current} / {char.spellSlots.max}</span>
                </span>
              </div>
            )}
          </div>
          <div className="grimoire-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {char.grimoire?.map((spell: any, i: number) => (
              <div key={i} style={{ borderBottom: '1px solid var(--accent-muted)', paddingBottom: '15px' }}>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--accent)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {spell.name}
                </strong>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-primary)' }}>{spell.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '30px', padding: '15px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '8px', fontSize: '0.8rem', border: '1px dashed var(--accent)' }}>
            <strong style={{ color: 'var(--accent)' }}>💡 Conseil du MD :</strong> N'hésitez pas à demander des précisions sur le canal vocal si besoin. Le D20 est votre meilleur ami !
          </div>
        </div>
      </div>
    );
  };

  const MapModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const [zoom, setZoom] = useState(1);
    if (!isOpen) return null;
    return (
      <div className="char-sheet-overlay" onClick={onClose} style={{ zIndex: 5000 }}>
        <div className="char-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '90%', height: '90vh', background: '#0a0a0c', border: '2px solid var(--accent)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <button className="close-btn" style={{ color: 'var(--accent)', zIndex: 10 }} onClick={onClose}>×</button>
          
          <div style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid var(--accent-muted)', position: 'relative', background: 'rgba(0,0,0,0.5)' }}>
            <h2 style={{ margin: 0, fontFamily: 'Cinzel', color: 'var(--accent)' }}>Carte de la Région</h2>
            
            {/* Zoom Controls */}
            <div style={{ position: 'absolute', right: '60px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', width: '30px', height: '30px', borderRadius: '5px', cursor: 'pointer' }}
              >-</button>
              <span style={{ color: 'var(--accent)', fontSize: '0.8rem', lineHeight: '30px', minWidth: '40px' }}>{Math.round(zoom * 100)}%</span>
              <button 
                onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', width: '30px', height: '30px', borderRadius: '5px', cursor: 'pointer' }}
              >+</button>
              <button 
                onClick={() => setZoom(1)}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '0 10px', height: '30px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.7rem' }}
              >RESET</button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: zoom > 1 ? 'grab' : 'default' }}>
            <div style={{ 
              transform: `scale(${zoom})`, 
              transformOrigin: 'center center',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'inline-block'
            }}>
              <img 
                src="/assets/maps/lost_mine_map.jpg" 
                alt="Carte du monde" 
                style={{ display: 'block', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CommonChat = () => {
    const [typedMessage, setTypedMessage] = useState('')
    if (!isLiveMode || !currentRole) return null;

    const commonMessages = messages.filter((m: any) => m.receiver_id === 'global')

    const handleSend = (e: React.FormEvent) => {
      e.preventDefault()
      if (!typedMessage.trim() || !supabase) return
      sendMessage(typedMessage, 'global')
      setTypedMessage('')
    }

    return (
      <div className="common-chat-container">
        <div className="common-chat-messages">
          {commonMessages.length === 0 && (
            <div className="chat-empty">Le journal d'aventure commence ici...</div>
          )}
          {commonMessages.map((m: any, i: number) => {
            const senderChar = data.characters.find((c: any) => c.id === m.sender_id)
            const senderName = m.sender_id === 'DM' ? 'Le Maître du Donjon' : (senderChar?.name || m.sender_id)
            
            return (
              <div key={i} className={`common-msg ${m.sender_id === 'DM' ? 'dm-msg' : 'player-msg'}`}>
                <span className="msg-author">{senderName}:</span>
                <span className="msg-content">{m.content}</span>
              </div>
            )
          })}
        </div>
        <form className="common-chat-input" onSubmit={handleSend}>
          <input 
            type="text" 
            placeholder="Dites quelque chose..." 
            value={typedMessage} 
            onChange={e => setTypedMessage(e.target.value)} 
          />
          <button type="submit">↪</button>
        </form>
      </div>
    )
  }

  // --- RENDU LIVE ---
  if (isLiveMode && liveData) {
    return (
      <div className="app">
        {selectedCharacter && (
          <CharacterSheet 
            char={data.characters.find(c => c.id === selectedCharacter.id)} 
            onClose={() => setSelectedCharacter(null)} 
          />
        )}

        {activeGrimoire && (
          <Grimoire 
            char={data.characters.find(c => c.id === activeGrimoire.id)} 
            onClose={() => setActiveGrimoire(null)} 
          />
        )}

        <MapModal 
          isOpen={isMapVisible} 
          onClose={() => setIsMapVisible(false)} 
        />

        <div className="live-game-toolbar">
          <div className="toolbar-left">
            <button className="toolbar-btn" onClick={() => setIsMapVisible(true)}>
              <span>🗺️</span> CARTE
            </button>
            <div style={{ margin: '0 10px', width: '1px', height: '20px', background: 'var(--accent-muted)' }}></div>
            <div className="toolbar-info-item">
              <span className="label">Session</span>
              <span style={{ 
                color: 'var(--accent)', 
                fontSize: '1.2rem', 
                fontFamily: 'var(--font-display)',
                marginLeft: '5px',
                textShadow: '0 0 10px rgba(212, 175, 55, 0.4)',
                fontWeight: 'bold'
              }}>
                {data.sessions.length + 1}
              </span>
            </div>
          </div>
          
          <div className="toolbar-center">
            <div className="toolbar-info-item">
              <span>📍</span>
              <span>{liveData.currentLocation}</span>
            </div>
            <span style={{ opacity: 0.3 }}>|</span>
            <div className="toolbar-info-item">
              <span>🕰️</span>
              <span>{liveData.currentTimeOfDay}</span>
            </div>
          </div>

          <div className="toolbar-right">
            <button className="toolbar-btn danger" onClick={() => setIsLiveMode(false)}>
              <span className="live-indicator-dot pulsing"></span>
              QUITTER
            </button>
          </div>
        </div>

        <div className="live-view-container">
          <div className="live-main-grid">
            <div className="live-scene-card">
              <div className="live-image-wrapper">
                {liveData.currentScene.isGenerating && (
                  <div className="generating-overlay">
                    <div className="spinner"></div>
                    <p style={{ fontFamily: 'Cinzel', letterSpacing: '2px', fontSize: '0.8rem' }}>Visualisation en cours...</p>
                  </div>
                )}
                <img 
                  src={liveData.currentScene.image} 
                  alt="Scène actuelle" 
                  key={liveData.currentScene.image}
                  style={{ opacity: liveData.currentScene.isGenerating ? 0.3 : 1 }}
                  onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/800x450/1a1a1f/d4af37?text=Scène+D%26D+en+direct' }}
                />
              </div>
              <div className="live-caption-box">
                <p className="live-description">
                  {liveData.currentScene.description}
                </p>
                <CommonChat />
              </div>
            </div>

            <div className="live-sidebar">
              <div className="sidebar-panel">
                <h4>Statut du Groupe (Clique pour voir la fiche)</h4>
                <div className="party-status-list">
                  {liveData.partyStatus.map((char: any) => {
                    const originalChar = data.characters.find(c => c.id === char.id)
                    const hpPercent = (char.hp / (originalChar?.hp.max || 10)) * 100
                    return (
                      <div 
                        key={char.id} 
                        className="status-row"
                        style={{ position: 'relative' }}
                        onClick={() => setSelectedCharacter(char)}
                        title="Voir la fiche personnage"
                      >
                        <div className="status-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{originalChar?.name || char.id}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveGrimoire(char); }} 
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px', transition: 'transform 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              title="Ouvrir le Grimoire d'Aide"
                            >
                              📜
                            </button>
                          </div>
                          <span style={{ color: hpPercent < 30 ? '#ff4d4d' : '#2ecc71' }}>{char.hp} PV</span>
                        </div>
                        <div className="hp-bar-bg">
                          <div 
                            className="hp-bar-fill" 
                            style={{ 
                              width: `${hpPercent}%`,
                              backgroundColor: hpPercent < 30 ? '#ff4d4d' : '#2ecc71'
                            }}
                          ></div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>
                          État: {char.status}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {liveData.activeQuests && liveData.activeQuests.length > 0 && (
                <div className="sidebar-panel">
                  <h4>📜 Le Journal de Quête</h4>
                  <div className="quest-list">
                    {liveData.activeQuests.map((quest: any, i: number) => (
                      <div key={i} className={`quest-item priority-${quest.priority}`}>
                        <div className="quest-title">{quest.title}</div>
                        <div className="quest-desc">{quest.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="sidebar-panel">
                <h4>Derniers Événements</h4>
                <ul className="event-feed">
                  {liveData.recentEvents.map((evt: string, i: number) => (
                    <li key={i} className="event-item">{evt}</li>
                  ))}
                </ul>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#444' }}>
                Réception cloud: {new Date(lastFetched).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- RENDU ARCHIVE / HOME ---
  return (
    <div className="app">
      {!isLiveMode && (
        <button className="live-toggle-btn" onClick={() => setIsLiveMode(true)}>
          <span className="live-indicator-dot pulsing"></span>
          VOIR LE DIRECT
        </button>
      )}

      {selectedSession && (
        <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedSession(null)}>×</button>
            
            <div className="modal-header">
              <div style={{ color: '#d4af37', fontFamily: 'Cinzel', fontSize: '0.9rem' }}>Session {selectedSession.id}</div>
              <h2>{selectedSession.title}</h2>
              <p className="modal-date">{selectedSession.date}</p>
            </div>

            <div className="modal-body">
              <section className="narrative-flow">
                <div style={{ marginBottom: '30px', fontSize: '1rem', fontStyle: 'italic', color: '#888', textAlign: 'center' }}>
                  {selectedSession.summary}
                </div>

                {selectedSession.story ? (
                  <div className="carousel-container">
                    <div className="carousel-main">
                      <button 
                        className="carousel-control prev" 
                        onClick={prevStep} 
                        disabled={currentStep === 0}
                      >
                        ‹
                      </button>
                      
                      <div className="carousel-viewport">
                        <div className="story-step active" key={currentStep}>
                          <div className="story-img-container">
                            <img 
                              src={selectedSession.story[currentStep].url} 
                              alt={`Scène ${currentStep + 1}`} 
                              onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/800x450/1a1a1f/d4af37?text=Moment+' + (currentStep + 1) }}
                            />
                          </div>
                          <p className="story-caption">{selectedSession.story[currentStep].text}</p>
                        </div>
                      </div>

                      <button 
                        className="carousel-control next" 
                        onClick={nextStep} 
                        disabled={currentStep === selectedSession.story.length - 1}
                      >
                        ›
                      </button>
                    </div>

                    <div className="carousel-dots">
                      {selectedSession.story.map((_: any, idx: number) => (
                        <span 
                          key={idx} 
                          className={`dot ${idx === currentStep ? 'active' : ''}`}
                          onClick={() => setCurrentStep(idx)}
                        ></span>
                      ))}
                    </div>
                    <div className="step-counter">
                      {currentStep + 1} / {selectedSession.story.length}
                    </div>
                  </div>
                ) : (
                  <div className="image-gallery">
                    {selectedSession.images?.map((img: string, idx: number) => (
                      <div key={idx} className="gallery-item">
                        <img src={img} alt={`Moment ${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section style={{ marginTop: '60px', borderTop: '1px solid #222', paddingTop: '40px' }}>
                <h3 style={{ color: '#d4af37', fontFamily: 'Cinzel', textAlign: 'center', marginBottom: '30px' }}>Points Marquants</h3>
                <ul className="session-highlights" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                  {selectedSession.highlights.map((h: string, index: number) => (
                    <li key={index}>{h}</li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

      <section className="hero">
        <div className="container">
          <h1 className="hero-title">{data.campaignName}</h1>
          <p className="hero-subtitle">{data.summary}</p>
          <div className="dm-badge" style={{ marginTop: '30px', color: '#d4af37', fontFamily: 'Cinzel', fontSize: '1.2rem' }}>
            Maître du Donjon: {data.dm}
          </div>
          <div className="scroll-indicator" style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', opacity: '0.6' }}>
            <span style={{ fontSize: '2rem', display: 'block', animation: 'bounce 2s infinite' }}>↓</span>
          </div>
        </div>
      </section>

      <div className="container">
        <h2 className="section-title">Aventuriers</h2>
        <div className="character-grid">
          {data.characters.map((char) => (
            <div className="character-card" key={char.id}>
              <div className="char-img-container" style={{ position: 'relative', height: '320px', overflow: 'hidden' }}>
                <img 
                  src={char.image} 
                  alt={char.name} 
                  className="char-img"
                  onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x320/1a1a1f/d4af37?text=' + char.name }}
                />
                <div className="char-overlay" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '20px', background: 'linear-gradient(transparent, rgba(10,10,12,0.95))' }}>
                  <h3>{char.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#d4af37', textTransform: 'uppercase' }}>{char.race} {char.class} - Niveau {char.level}</div>
                </div>
              </div>
              <div className="char-info">
                <p style={{ fontSize: '0.9rem', minHeight: '60px', color: '#a0a0a0' }}>{char.description}</p>
                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ flex: 1, height: '6px', background: '#333', borderRadius: '3px', position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', 
                      height: '100%', 
                      background: char.hp.current / char.hp.max < 0.3 ? '#ff4d4d' : '#2ecc71',
                      width: `${(char.hp.current / char.hp.max) * 100}%`,
                      transition: 'width 0.5s ease',
                      borderRadius: '3px'
                    }}></div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{char.hp.current}/{char.hp.max} PV</span>
                </div>
                <div className="char-stats">
                  <div className="stat-item"><span>{char.stats.str}</span>FOR</div>
                  <div className="stat-item"><span>{char.stats.dex}</span>DEX</div>
                  <div className="stat-item"><span>{char.stats.con}</span>CON</div>
                  <div className="stat-item"><span>{char.stats.int}</span>INT</div>
                  <div className="stat-item"><span>{char.stats.wis}</span>SAG</div>
                  <div className="stat-item"><span>{char.stats.cha}</span>CHA</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="section-title">Chroniques</h2>
        <div className="session-list">
          {data.sessions.map((session: any) => (
            <div 
              className="session-card" 
              key={session.id} 
              onClick={() => openSession(session)}
              style={{ cursor: 'pointer' }}
            >
              <div className="session-img-display" style={{ position: 'relative' }}>
                <div className="session-img-container">
                  <img 
                    src={session.story ? session.story[0].url : session.images?.[0]} 
                    alt={session.title} 
                    onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/800x450/1a1a1f/d4af37?text=Session+' + session.id }} 
                  />
                </div>
                {(session.story?.length > 1 || session.images?.length > 1) && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '20px', 
                    right: '20px', 
                    background: 'rgba(0,0,0,0.7)', 
                    padding: '5px 12px', 
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    border: '1px solid #d4af37'
                  }}>
                    +{(session.story?.length || session.images?.length) - 1} Images
                  </div>
                )}
              </div>
              <div className="session-content">
                <div style={{ color: '#d4af37', fontFamily: 'Cinzel', fontSize: '0.9rem', marginBottom: '10px' }}>Session {session.id} - {session.date}</div>
                <h3>{session.title}</h3>
                <p className="session-summary">{session.summary}</p>
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '15px' }}>Moments Forts</h4>
                  <ul className="session-highlights">
                    {session.highlights.map((h: string, index: number) => (
                      <li key={index}>{h}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer style={{ background: '#111', padding: '60px 0', textAlign: 'center', marginTop: '100px', borderTop: '1px solid #222' }}>
        <p style={{ color: '#555', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Géré par le module D&D DM - Synchronisation Cloud Realtime {supabase ? 'Active' : 'Désactivée'}</p>
      </footer>
    </div>
  )
}

export default App
