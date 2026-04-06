import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import './index.css'
import { supabase } from './lib/supabase'
import { translations } from './lib/translations'

// Import extracted components
import { CharacterSheet } from './components/CharacterSheet'
import { Grimoire } from './components/Grimoire'
import { MapModal } from './components/MapModal'
import { CommonChat } from './components/CommonChat'

// --- SHARED UTILS ---
const getMod = (score: number) => {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : mod;
};

// --- LANGUAGE SWITCHER COMPONENT ---
const LanguageSwitcher = ({ language, setLanguage, isHome = false }: any) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const langs: { code: 'FR' | 'EN' | 'IT', flag: string, label: string }[] = [
    { code: 'FR', flag: '🇫🇷', label: 'Français' },
    { code: 'EN', flag: '🇬🇧', label: 'English' },
    { code: 'IT', flag: '🇮🇹', label: 'Italiano' }
  ]
  const active = langs.find(l => l.code === language)!

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`premium-lang-selector ${isHome ? 'is-home' : ''}`} ref={containerRef}>
      <button className="lang-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className="flag">{active.flag}</span>
        {isHome && <span className="code">{active.code}</span>}
        <span className={`arrow ${isOpen ? 'open' : ''}`}>▾</span>
      </button>
      {isOpen && (
        <div className="lang-dropdown">
          {langs.map(l => (
            <button
              key={l.code}
              className={`lang-option ${l.code === language ? 'selected' : ''}`}
              onClick={() => { setLanguage(l.code); setIsOpen(false); }}
            >
              <span className="flag">{l.flag}</span>
              <span className="label">{l.label}</span>
              {l.code === language && <span className="check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// --- COMPONENT: CAMPAIGN SELECTOR ---
const CampaignSelector = () => {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [newCampaignUniverse, setNewCampaignUniverse] = useState('D&D 5e')
  const navigate = useNavigate()

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    if (!supabase) return
    const { data: list, error } = await supabase.from('campaigns').select('id, name, universe, updated_at').order('id', { ascending: true })
    if (!error && list) {
      setCampaigns(list.map(c => ({
        id: c.id,
        name: c.name || `Campagne #${c.id}`,
        universe: c.universe || 'D&D 5e',
        lastUpdated: c.updated_at
      })))
    }
  }

  const createNewCampaign = async () => {
    if (!supabase || !newCampaignName.trim()) return
    setIsCreating(true)
    const { data: newC, error } = await supabase.from('campaigns').insert([{
      name: newCampaignName,
      universe: newCampaignUniverse,
      session_number: 1,
      current_location: "Début de l'aventure",
      current_time_of_day: "Aube",
      scene_description: `Bienvenue dans votre nouvelle aventure dans l'univers ${newCampaignUniverse} !`,
      scene_image: "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?auto=format&fit=crop&q=80&w=800",
      is_generating: false
    }]).select()

    if (!error && newC) {
      const created = newC[0]
      await supabase.from('quests').insert([{
        campaign_id: created.id,
        title: "Les premiers pas",
        description: "Explorez votre environnement et rencontrez vos alliés.",
        priority: "normal"
      }])
      navigate(`/campaign/${created.id}`)
    } else {
      alert("Erreur création campagne: " + (error?.message || "Erreur inconnue"))
    }
    setIsCreating(false)
  }

  return (
    <div className="campaign-selection-overlay">
      <div className="campaign-selection-content">
        <h1 style={{ fontFamily: 'Cinzel', color: 'var(--accent)', fontSize: '2.5rem', marginBottom: '10px' }}>Campagnes D&D</h1>
        <p style={{ opacity: 0.7, marginBottom: '40px' }}>Choisissez votre aventure ou commencez une nouvelle légende.</p>

        <div className="campaign-grid">
          {campaigns.map(c => (
            <div key={c.id} className="campaign-card" onClick={() => navigate(`/campaign/${c.id}`)}>
              <div className="campaign-card-banner">{c.universe === 'Harry Potter' ? '🪄' : '⚔️'}</div>
              <h3>{c.name}</h3>
              <div className="campaign-meta"><span>{c.universe}</span></div>
              <button className="continue-btn">Continuer</button>
            </div>
          ))}

          <div className="campaign-card add-new" onClick={() => setIsCreatingCampaign(true)}>
            <div className="add-icon">+</div>
            <h3>Nouvelle Campagne</h3>
            <p>Explorer un nouvel univers</p>
          </div>
        </div>
      </div>

      {isCreatingCampaign && (
        <div className="modal-overlay" onClick={() => setIsCreatingCampaign(false)}>
          <div className="premium-modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="premium-modal-title">Démarrer une Aventure</h2>
            <div className="premium-form-group">
              <label className="premium-label">Nom de la Campagne</label>
              <input type="text" className="premium-input-field" placeholder="Ex: L'Héritage de Poudlard" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} />
            </div>
            <div className="premium-form-group">
              <label className="premium-label">Univers</label>
              <select className="premium-input-field" value={newCampaignUniverse} onChange={e => setNewCampaignUniverse(e.target.value)} style={{ appearance: 'none', background: 'rgba(0,0,0,0.4)' }}>
                <option value="D&D 5e">D&D 5e (Médiéval Fantastique)</option>
                <option value="Harry Potter">Harry Potter (Magie Moderne)</option>
                <option value="Cyberpunk">Cyberpunk</option>
                <option value="Star Wars">Star Wars</option>
              </select>
            </div>
            <div className="premium-actions">
              <button className="premium-btn-lancer" onClick={createNewCampaign} disabled={isCreating || !newCampaignName.trim()}>{isCreating ? "Création..." : "Lancer"}</button>
              <button className="premium-btn-annuler" onClick={() => setIsCreatingCampaign(false)} disabled={isCreating}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- COMPONENT: CAMPAIGN VIEW (LAYOUT + DATA FETCHING) ---
const CampaignView = ({ language, setLanguage, mode }: { language: 'FR' | 'EN' | 'IT', setLanguage: any, mode: 'landing' | 'live' }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null)
  const [activeGrimoire, setActiveGrimoire] = useState<any>(null)
  const [isMapVisible, setIsMapVisible] = useState(false)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const curT = translations[language]

  // Détection du rôle via URL (?player=diaz)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const player = params.get('player')
    if (player) setCurrentRole(player)
  }, [location.search])

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!supabase || !id) return
      setIsLoading(true)
      
      const fetchInitial = async () => {
        try {
          const { data: camp } = await supabase!.from('campaigns').select('*').eq('id', id).single()
          const { data: chars } = await supabase!.from('characters').select('*').eq('campaign_id', id)
          const { data: quests } = await supabase!.from('quests').select('*').eq('campaign_id', id)
          const { data: sessions } = await supabase!.from('sessions').select('*').eq('campaign_id', id).order('session_number', { ascending: true })

          if (camp) {
            const merged = {
              campaignName: camp.name,
              universe: camp.universe,
              dm: camp.dm_name,
              summary: camp.summary,
              sessionNumber: camp.session_number,
              currentLocation: camp.current_location,
              currentTimeOfDay: camp.current_time_of_day,
              currentScene: {
                description: camp.scene_description,
                image: camp.scene_image,
                isGenerating: camp.is_generating
              },
              partyStatus: (chars || []).map(c => ({ id: c.id.split('_').pop(), name: c.name, hp: c.hp_current, status: "Prêt" })),
              characters: (chars || []).map(c => ({
                id: c.id.split('_').pop(),
                name: c.name,
                race: c.race,
                class: c.class,
                level: c.level,
                hp: { current: c.hp_current, max: c.hp_max },
                xp: { current: c.xp_current, next: c.xp_next },
                spellSlots: c.spell_slots || { current: 0, max: 0 },
                stats: c.stats,
                inventory: c.inventory,
                grimoire: c.grimoire,
                features: c.features,
                ideals: c.ideals,
                bonds: c.bonds,
                image: c.image,
                description: c.description
              })),
              activeQuests: (quests || []).map(q => ({ title: q.title, description: q.description, priority: q.priority })),
              sessions: (sessions || []).map(s => ({
                id: s.session_number,
                title: s.title,
                date: s.date,
                summary: s.summary,
                story: s.story,
                highlights: s.highlights
              })),
              recentEvents: ["Chargement de la campagne..."]
            }
            setData(merged)
          }
        } catch (e) { console.error(e) }
        setIsLoading(false)
      }

      fetchInitial()

      // Realtime sub if live
      if (mode === 'live') {
        const sub = supabase!.channel(`live-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `id=eq.${id}` }, () => fetchInitial()).subscribe()
        return () => { supabase!.removeChannel(sub) }
      }
    }

    fetchCampaign()
  }, [id, mode])

  // Chat listener
  useEffect(() => {
    if (!supabase || mode !== 'live') return
    const fetchMsgs = async () => {
      const { data } = await supabase!.from('messages').select('*').order('created_at', { ascending: true })
      if (data) setMessages(data)
    }
    fetchMsgs()
    const channel = supabase!.channel('chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const newMsg = payload.new
      setMessages(prev => [...prev, newMsg])
      const audioMatch = newMsg.content.match(/\[AUDIO:(.*?)\]/)
      if (audioMatch?.[1]) new Audio(audioMatch[1]).play().catch(e => console.error(e))
    }).subscribe()
    return () => { supabase!.removeChannel(channel) }
  }, [mode])

  const sendMessage = async (text: string, receiverId: string) => {
    if (!supabase || !currentRole) return
    await supabase.from('messages').insert([{ sender_id: currentRole, receiver_id: receiverId, content: text.trim() }])
  }

  if (isLoading) return (
    <div className="campaign-selection-overlay">
      <div className="spinner"></div>
      <p style={{ fontFamily: 'Cinzel', color: 'var(--accent)', marginTop: '20px' }}>Chargement de l'aventure...</p>
    </div>
  )

  if (!data) return (
    <div className="campaign-selection-overlay">
      <h2>Campagne introuvable</h2>
      <Link to="/" style={{ color: 'var(--accent)' }}>Retour à la sélection</Link>
    </div>
  )

  // --- RENDU LIVE ---
  if (mode === 'live') {
    return (
      <div className="app">
        {selectedCharacter && <CharacterSheet char={data.characters.find((c: any) => c.id === selectedCharacter.id)} onClose={() => setSelectedCharacter(null)} getMod={getMod} />}
        {activeGrimoire && <Grimoire char={data.characters.find((c: any) => c.id === activeGrimoire.id)} onClose={() => setActiveGrimoire(null)} curT={curT} />}
        <MapModal isOpen={isMapVisible} onClose={() => setIsMapVisible(false)} curT={curT} />

        <div className="live-game-toolbar">
          <div className="toolbar-left">
            <button className="toolbar-btn" onClick={() => setIsMapVisible(true)}><span>🗺️</span> {curT.map}</button>
            <div style={{ margin: '0 10px', width: '1px', height: '20px', background: 'var(--accent-muted)' }}></div>
            <div className="toolbar-info-item">
              <span className="label">{curT.session}</span>
              <span style={{ color: 'var(--accent)', fontSize: '1.2rem', fontFamily: 'var(--font-display)', marginLeft: '5px', fontWeight: 'bold' }}>{data.sessionNumber}</span>
            </div>
          </div>
          <div className="toolbar-center">
            <div className="toolbar-info-item"><span>📍</span><span>{data.currentLocation}</span></div>
            <span style={{ opacity: 0.3 }}>|</span>
            <div className="toolbar-info-item"><span>🕰️</span><span>{data.currentTimeOfDay}</span></div>
          </div>
          <div className="toolbar-right">
            <LanguageSwitcher language={language} setLanguage={setLanguage} />
            <div style={{ margin: '0 10px', width: '1px', height: '20px', background: 'var(--accent-muted)' }}></div>
            <button className="toolbar-btn danger" onClick={() => navigate(`/campaign/${id}`)}>{curT.quit}</button>
          </div>
        </div>

        <div className="live-view-container">
          <div className="live-main-grid">
            <div className="live-sidebar">
              <div className="sidebar-panel">
                <h4>{curT.partyStatus}</h4>
                <div className="party-status-list">
                  {(data.partyStatus || []).map((char: any) => {
                    const originalChar = data.characters.find((c: any) => c.id === char.id)
                    const hpPercent = (char.hp / (originalChar?.hp.max || 10)) * 100
                    return (
                      <div key={char.id} className="status-row" onClick={() => setSelectedCharacter(char)}>
                        <div className="status-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{originalChar?.name || char.id}</span>
                            <button onClick={(e) => { e.stopPropagation(); setActiveGrimoire(char); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>📜</button>
                          </div>
                          <span style={{ color: hpPercent < 30 ? '#ff4d4d' : '#2ecc71' }}>{char.hp} PV</span>
                        </div>
                        <div className="hp-bar-bg"><div className="hp-bar-fill" style={{ width: `${hpPercent}%`, backgroundColor: hpPercent < 30 ? '#ff4d4d' : '#2ecc71' }}></div></div>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>État: {char.status}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="sidebar-panel">
                <h4>{curT.questLog}</h4>
                <div className="quest-list">
                  {data.activeQuests?.map((q: any, i: number) => (
                    <div key={i} className={`quest-item priority-${q.priority}`}><div className="quest-title">{q.title}</div><div className="quest-desc">{q.description}</div></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="live-scene-card">
              <div className="live-image-wrapper">
                {data.currentScene.isGenerating && <div className="generating-overlay"><div className="spinner"></div><p>{curT.visualizing}</p></div>}
                <img src={data.currentScene.image} alt="Scène" style={{ opacity: data.currentScene.isGenerating ? 0.3 : 1 }} onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1516035054744-d474c5209db5?auto=format&fit=crop&q=80&w=800' }} />
              </div>
              <div className="live-caption-box"><p className="live-description">{data.currentScene.description}</p></div>
            </div>
            <div className="live-chat-column"><CommonChat messages={messages} currentRole={currentRole} data={data} curT={curT} sendMessage={sendMessage} supabase={supabase} /></div>
          </div>
        </div>
      </div>
    )
  }

  // --- RENDU LANDING ---
  return (
    <div className="app">
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
                <div style={{ marginBottom: '30px', fontSize: '1rem', fontStyle: 'italic', color: '#888', textAlign: 'center' }}>{selectedSession.summary}</div>
                {selectedSession.story && (
                  <div className="carousel-container">
                    <div className="carousel-main">
                      <button className="carousel-control prev" onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))} disabled={currentStep === 0}>‹</button>
                      <div className="carousel-viewport">
                        <div className="story-step active" key={currentStep}>
                          <div className="story-img-container"><img src={selectedSession.story[currentStep].url} alt="Scene" /></div>
                          <p className="story-caption">{selectedSession.story[currentStep].text}</p>
                        </div>
                      </div>
                      <button className="carousel-control next" onClick={() => setCurrentStep(prev => Math.min(selectedSession.story.length - 1, prev + 1))} disabled={currentStep === selectedSession.story.length - 1}>›</button>
                    </div>
                  </div>
                )}
              </section>
              <section style={{ marginTop: '60px', borderTop: '1px solid #222', paddingTop: '40px' }}>
                <h3 style={{ color: '#d4af37', fontFamily: 'Cinzel', textAlign: 'center', marginBottom: '30px' }}>Points Marquants</h3>
                <ul className="session-highlights" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                  {selectedSession.highlights?.map((h: string, i: number) => <li key={i}>{h}</li>)}
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', top: '30px', left: '40px', zIndex: 10 }}>
        <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.8rem', letterSpacing: '1px', fontWeight: 'bold', transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>← CHANGER DE CAMPAGNE</Link>
      </div>
      
      <div style={{ position: 'absolute', top: '25px', right: '40px', zIndex: 10 }}>
        <LanguageSwitcher language={language} setLanguage={setLanguage} isHome />
      </div>

      <section className="hero" style={data.currentScene?.image ? { backgroundImage: `linear-gradient(rgba(10, 10, 12, 0.7), rgba(10, 10, 12, 0.9)), url(${data.currentScene.image})` } : {}}>
        <div className="container">
          <h1 className="hero-title">{data.campaignName}</h1>
          <p className="hero-subtitle">{data.summary}</p>
          <div className="dm-badge" style={{ marginTop: '20px', color: '#d4af37', fontFamily: 'Cinzel', fontSize: '1.2rem' }}>{curT.dm}: {data.dm}</div>
          <button className="premium-join-btn" onClick={() => navigate(`/campaign/${id}/live${location.search}`)}>{curT.backToDirect}</button>
          <div className="scroll-indicator" style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', opacity: '0.6' }}>
            <span style={{ fontSize: '2rem', display: 'block', animation: 'bounce 2s infinite' }}>↓</span>
          </div>
        </div>
      </section>

      <div className="container">
        <h2 className="section-title">{curT.adventurers}</h2>
        <div className="character-grid">
          {(data.characters || []).map((char: any) => (
            <div className="character-card" key={char.id}>
              <div className="char-img-container" style={{ position: 'relative', height: '320px', overflow: 'hidden' }}>
                <img src={char.image} alt={char.name} className="char-img" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400' }} />
                <div className="char-overlay" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '20px', background: 'linear-gradient(transparent, rgba(10,10,12,0.95))' }}>
                  <h3>{char.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#d4af37', textTransform: 'uppercase' }}>{char.race} {char.class} - Niveau {char.level}</div>
                </div>
              </div>
              <div className="char-info">
                <p style={{ fontSize: '0.9rem', minHeight: '60px', color: '#a0a0a0' }}>{char.description}</p>
                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ flex: 1, height: '6px', background: '#333', borderRadius: '3px', position: 'relative' }}>
                    <div style={{ position: 'absolute', height: '100%', background: char.hp.current / char.hp.max < 0.3 ? '#ff4d4d' : '#2ecc71', width: `${(char.hp.current / char.hp.max) * 100}%`, borderRadius: '3px' }}></div>
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

        {data.sessions?.length > 0 && (
          <>
            <h2 className="section-title">Chroniques</h2>
            <div className="session-list">
              {data.sessions.map((session: any) => (
                <div className="session-card" key={session.id} onClick={() => setSelectedSession(session)} style={{ cursor: 'pointer' }}>
                  <div className="session-img-display" style={{ position: 'relative' }}>
                    <div className="session-img-container"><img src={session.story ? session.story[0].url : session.images?.[0]} alt={session.title} /></div>
                  </div>
                  <div className="session-content">
                    <div style={{ color: '#d4af37', fontFamily: 'Cinzel', fontSize: '0.9rem', marginBottom: '10px' }}>Session {session.id} - {session.date}</div>
                    <h3>{session.title}</h3>
                    <p className="session-summary">{session.summary}</p>
                    <ul className="session-highlights">{session.highlights?.map((h: string, i: number) => <li key={i}>{h}</li>)}</ul>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <footer style={{ background: '#111', padding: '60px 0', textAlign: 'center', marginTop: '100px', borderTop: '1px solid #222' }}>
        <p style={{ color: '#555', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Synchronisation Cloud Realtime {supabase ? 'Active' : 'Désactivée'}</p>
      </footer>
    </div>
  )
}

function App() {
  const [language, setLanguage] = useState<'FR' | 'EN' | 'IT'>('FR')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CampaignSelector />} />
        <Route path="/campaign/:id" element={<CampaignView language={language} setLanguage={setLanguage} mode="landing" />} />
        <Route path="/campaign/:id/live" element={<CampaignView language={language} setLanguage={setLanguage} mode="live" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
