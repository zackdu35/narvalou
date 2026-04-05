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

  // --- RENDU LIVE ---
  if (isLiveMode && liveData) {
    return (
      <div className="app">
        <button className="live-toggle-btn active" onClick={() => setIsLiveMode(false)}>
          <span className="live-indicator-dot pulsing"></span>
          QUITTER LE LIVE
        </button>

        <div className="live-view-container">
          <div className="container" style={{ marginBottom: '40px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Session en direct sur Vercel</h1>
            <div className="live-location">
              <span style={{ fontSize: '1.2rem' }}>📍</span> {liveData.currentLocation}
            </div>
          </div>

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
                  "{liveData.currentScene.description}"
                </p>
              </div>
            </div>

            <div className="live-sidebar">
              <div className="sidebar-panel">
                <h4>Statut du Groupe (Cloud Synchronized)</h4>
                <div className="party-status-list">
                  {liveData.partyStatus.map((char: any) => {
                    const originalChar = data.characters.find(c => c.id === char.id)
                    const hpPercent = (char.hp / (originalChar?.hp.max || 10)) * 100
                    return (
                      <div key={char.id} className="status-row">
                        <div className="status-header">
                          <span>{originalChar?.name || char.id}</span>
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
          <span className="live-indicator-dot"></span>
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
