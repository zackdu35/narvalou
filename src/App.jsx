import { useState, useEffect } from 'react'
import { Plus, Play, Sparkles, LogOut, User as UserIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import GenesisInterface from './components/GenesisInterface'
import CharacterCreation from './components/CharacterCreation'
import Auth from './components/Auth'
import { db } from './services/supabase'


function CampaignCard({ title, description, image, type, onPlay, isJoined, btnLabel }) {
  return (
    <motion.div 
      className="campaign-card"
      whileHover={{ scale: 1.02 }}
    >
      <img src={image || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1600"} alt={title} />
      <div className="card-overlay">
        <span className="text-[10px] text-gold uppercase tracking-[0.3em] font-bold mb-2">{type}</span>
        <h3>{title}</h3>
        <p>{description}</p>
        <button onClick={onPlay} className="btn-play" style={{ alignSelf: 'flex-end' }}>
          {btnLabel || (isJoined ? 'REPRENDRE' : 'REJOINDRE')}
        </button>
      </div>
    </motion.div>
  )
}

function GameInterface({ campaign, character, onExit }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="game-layout"
    >
      <header className="game-topbar">
        <div className="flex items-center gap-6">
          <span className="text-gold serif text-xl">{campaign.name || campaign.title}</span>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="text-[10px] uppercase tracking-widest opacity-50">Personnage : {character?.name} ({character?.class})</span>
        </div>
        <button onClick={onExit} className="text-white/30 hover:text-white flex items-center gap-2 text-[10px] tracking-widest">
          <LogOut size={14} /> QUITTER
        </button>
      </header>
      
      <div className="game-content">
        <aside className="game-sidebar-left">
           <div className="p-6 space-y-8">
              <div className="space-y-4">
                 <h4 className="text-[10px] text-gold uppercase tracking-widest">État du Héros</h4>
                 <div className="flex gap-4 items-center p-4 bg-white/5 rounded-lg border border-white/5">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 border border-gold/30 flex items-center justify-center text-gold">
                       <UserIcon size={20} />
                    </div>
                    <div className="flex-1">
                       <div className="text-sm font-bold">{character?.name}</div>
                       <div className="text-[9px] uppercase tracking-tighter text-gold/60">{character?.race} {character?.class}</div>
                       <div className="h-1.5 w-full bg-neutral-900 rounded-full mt-2 overflow-hidden border border-white/5">
                          <div className="h-full bg-red-500/80" style={{ width: `${(character?.hp_current / character?.hp_max) * 100}%` }} />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </aside>

        <main className="game-main">
           <div className="scene-container">
              <img src={campaign.image || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1600"} alt="Scene" className="scene-image" />
              <div className="scene-overlay" />
              <div className="scene-narration">
                 <p className="serif text-2xl leading-relaxed">
                   L'air vibre d'une énergie ancienne. Vous vous tenez prêt pour votre prochaine action dans ce monde en expansion...
                 </p>
              </div>
           </div>
        </main>

        <aside className="game-sidebar-right">
           <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              <div className="text-gold/50 text-[10px] text-center uppercase tracking-widest py-4">Synchronisation Temporelle</div>
              <div className="chat-msg mj">
                 <span className="text-gold font-bold block mb-1">Architecte MJ</span>
                 Le destin vous a ramené ici, {character?.name}. Que souhaitez-vous accomplir ?
              </div>
           </div>
           <div className="p-4 border-t border-white/5 bg-black/40">
              <input type="text" placeholder="Décrivez votre action..." className="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-sm focus:outline-none focus:border-gold/50 transition-all" />
           </div>
        </aside>
      </div>
    </motion.div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [view, setView] = useState('lobby') // 'lobby', 'create', 'join', 'game'
  const [campaigns, setCampaigns] = useState([])
  const [userCharacters, setUserCharacters] = useState([])
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [activeCharacter, setActiveCharacter] = useState(null)
  const [isGenesisOpen, setIsGenesisOpen] = useState(false)
  const [isCharacterCreationOpen, setIsCharacterCreationOpen] = useState(false)
  const [currentWorldContext, setCurrentWorldContext] = useState(null)
  const [currentCampaignId, setCurrentCampaignId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session])

  const checkSession = async () => {
    const user = await db.auth.getUser()
    setSession(user)
    setLoading(false)
  }

  const loadData = async () => {
    try {
      const campData = await db.campaigns.list()
      setCampaigns(campData)
      const { data: chars, error } = await db.supabase
        .from('characters')
        .select('*')
        .eq('user_id', session.id)
      if (!error) setUserCharacters(chars || [])
    } catch (err) {
      console.error(err)
    }
  }

  const legacyWorlds = [
    { id: 'legacy-1', title: "Hogwarts", type: "Wizarding World", description: "Une magie plus ancienne que les fondateurs s'éveille dans les profondeurs de Poudlard.", image: "/campaigns/potter.png" },
    { id: 'legacy-2', title: "Azeroth", type: "Warcraft", description: "L'ombre du Vide s'étend sur les îles flottantes, menaçant l'équilibre du monde.", image: "/campaigns/wow.png" },
    { id: 'legacy-3', title: "Runeterra", type: "League of Legends", description: "Le conflit entre Piltover et Zaun atteint son apogée technologique.", image: "/campaigns/runeterra.png" },
    { id: 'legacy-4', title: "Wall Maria", type: "Attack on Titan", description: "Face à l'immensité des Titans, l'humanité joue sa dernière carte au crépuscule.", image: "/campaigns/snk.png" },
    { id: 'legacy-5', title: "Forgotten Realms", type: "D&D Classic", description: "Les anciens wyrms se réveillent pour réclamer leur héritage de feu et de sang.", image: "/campaigns/dnd.png" }
  ]

  const handleStartAdventure = (campaign, character) => {
    setActiveCampaign(campaign)
    setActiveCharacter(character)
    setView('game')
    setIsGenesisOpen(false)
    setIsCharacterCreationOpen(false)
  }

  const handleCampaignClick = async (camp) => {
    try {
      const existingChar = userCharacters.find(c => c.campaign_id === camp.id)
      if (existingChar) {
        handleStartAdventure(camp, existingChar)
      } else {
        setCurrentCampaignId(camp.id)
        const worldData = await db.campaigns.get(camp.id)
        setCurrentWorldContext({
          archetype: { title: worldData.worlds[0]?.archetype, style_guide_dvc: worldData.worlds[0]?.style_guide_dvc },
          campaignId: camp.id
        })
        setIsCharacterCreationOpen(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSignOut = async () => {
    await db.auth.signOut()
    setSession(null)
    setView('lobby')
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
       <Sparkles className="text-gold animate-pulse" size={48} />
    </div>
  )

  if (!session) return <Auth onSession={setSession} />

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <AnimatePresence mode="wait">
        {view === 'lobby' && (
          <motion.div 
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lobby-container"
          >
            <div className="lobby-header">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="premium-title-group"
              >
                <h1>L'Éveil</h1>
                <p className="subtitle">Franchissez le Seuil</p>
              </motion.div>
            </div>

            <div className="lobby-portals">
              <motion.div 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={() => setView('create')}
                className="lobby-portal"
              >
                <div className="portal-bg" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1542332213-31f87348057f?auto=format&fit=crop&q=80&w=1200)' }} />
                <div className="portal-overlay" />
                <div className="portal-content">
                  <div className="portal-icon">
                    <Sparkles size={40} />
                  </div>
                  <h2>Architecte</h2>
                  <p>Invoquez les lois de la Genèse pour forger un monde unique issu de vos songes.</p>
                  <div className="portal-btn">Créer une Campagne</div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => setView('join')}
                className="lobby-portal"
              >
                <div className="portal-bg" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1200)' }} />
                <div className="portal-overlay" />
                <div className="portal-content">
                  <div className="portal-icon">
                    <Play size={40} fill="currentColor" />
                  </div>
                  <h2>Héros</h2>
                   <p>Incarnez une légende, traversez les royaumes et scellez votre destin dans le récit.</p>
                   <div className="portal-btn">Rejoindre une Campagne</div>
                </div>
              </motion.div>
            </div>

            <div className="lobby-footer">
              <button onClick={handleSignOut} className="btn-logout-premium">Déconnexion</button>
            </div>
          </motion.div>
        )}

        {view === 'create' && (
          <motion.div 
            key="create"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="container pb-32"
          >
            <div className="subview-header">
               <div className="header-glow" />
               <button onClick={() => setView('lobby')} className="btn-back-premium">← Retour</button>
               <h1>Genèse</h1>
               <p className="subtitle text-gold">Invoquez votre univers</p>
            </div>

            <div className="space-y-24">
               <section className="flex flex-col items-center">
                  <div className="grid justify-center">
                    <motion.div 
                      className="campaign-card create-card h-[400px]"
                      onClick={() => setIsGenesisOpen(true)}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Sparkles size={48} className="text-gold" />
                      <h3 className="serif text-2xl">Univers Sur-Mesure</h3>
                      <p className="text-sm opacity-60 leading-relaxed max-w-[200px] mx-auto">Collaborez avec l'Architecte pour créer un monde unique à partir de vos idées.</p>
                    </motion.div>

                    {legacyWorlds.map((world) => (
                      <CampaignCard 
                        key={world.id}
                        title={world.title}
                        description={world.description}
                        image={world.image}
                        type="Préréglage"
                        btnLabel="ÉVEILLER"
                        onPlay={() => {
                          // Simulation de sélection de preset
                           handleStartAdventure({ ...world, name: world.title }, { name: "Pionnier", race: "Inconnu", class: "Explorateur", hp_current: 10, hp_max: 10 })
                        }}
                      />
                    ))}
                  </div>
               </section>
            </div>
          </motion.div>
        )}

        {view === 'join' && (
          <motion.div 
            key="join"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="container pb-32"
          >
            <div className="subview-header">
               <div className="header-glow" />
               <button onClick={() => setView('lobby')} className="btn-back-premium">← Retour</button>
               <h1>Bibliothèque</h1>
               <p className="subtitle text-gold">Mondes Éveillés</p>
            </div>

            <div className="flex flex-col items-center">
              {campaigns.length === 0 ? (
                <div className="col-span-full py-32 text-center border border-dashed border-white/5 rounded-lg">
                   <p className="text-white/20 uppercase tracking-widest text-xs">Aucun monde n'a encore été créé dans ce plan.</p>
                </div>
              ) : (
                campaigns.map((camp) => (
                  <CampaignCard 
                    key={camp.id}
                    title={camp.name}
                    description={camp.description}
                    type={camp.owner_id === session.id ? "Maître du Monde" : "Aventure"}
                    isJoined={userCharacters.some(c => c.campaign_id === camp.id)}
                    onPlay={() => handleCampaignClick(camp)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}

        {view === 'game' && (
          <GameInterface 
            campaign={activeCampaign} 
            character={activeCharacter}
            onExit={() => {
              setView('join')
              loadData()
            }} 
          />
        )}
      </AnimatePresence>

      <GenesisInterface 
        isOpen={isGenesisOpen} 
        onClose={() => setIsGenesisOpen(false)}
        onStartAdventure={(data) => {
           setCurrentWorldContext(data)
           setCurrentCampaignId(data.campaignId)
           setIsGenesisOpen(false)
           setIsCharacterCreationOpen(true)
           loadData()
        }}
      />

      <CharacterCreation 
        isOpen={isCharacterCreationOpen}
        onClose={() => setIsCharacterCreationOpen(false)}
        worldContext={currentWorldContext}
        campaignId={currentCampaignId}
        onComplete={(char) => {
          db.campaigns.get(currentCampaignId).then(campData => {
            handleStartAdventure(campData, char)
          })
        }}
      />
    </div>
  )
}

export default App

