import { useState, useEffect } from 'react'
import { Plus, Play, Sparkles, LogOut, User as UserIcon, Orbit } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import GenesisInterface from './components/GenesisInterface'
import CharacterCreation from './components/CharacterCreation'
import LiveSession from './components/LiveSession'
import Auth from './components/Auth'
import { db, supabase } from './services/supabase'
import { aiService } from './services/ai'
import { CONFIG } from './config'


function CampaignCard({ id, title, description, image, type, onPlay, isJoined, btnLabel, showCode }) {
  const copyCode = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    alert("Code de campagne copié ! Partagez-le avec vos compagnons.");
  };

  return (
    <motion.div 
      className="campaign-card"
      whileHover={{ scale: 1.02 }}
    >
      <img src={image || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1600"} alt={title} />
      <div className="card-overlay">
        <div className="card-header-actions">
          <span className="text-[10px] text-gold uppercase tracking-[0.3em] font-bold">{type}</span>
          {showCode && (
            <button 
              onClick={copyCode}
              className="btn-copy-code-premium"
            >
              <div className="copy-icon-pulse" />
              COPIER LE CODE
            </button>
          )}
        </div>
        <h3>{title}</h3>
        <p>{description}</p>
        <button onClick={onPlay} className="btn-play-premium">
          {btnLabel || (isJoined ? 'REPRENDRE' : 'REJOINDRE')}
        </button>
      </div>
    </motion.div>
  );
}

function GameInterface({ campaign, character, onExit }) {
  const [messages, setMessages] = useState([
    { role: 'mj', content: `Le destin vous a ramené ici, ${character?.name}. Que souhaitez-vous accomplir dans ce monde de "${campaign.name}" ?`, sender: 'Architecte MJ' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, sender: character.name }]);
    setLoading(true);

    try {
      const response = await aiService.generateResponse(campaign, character, messages, userMsg);
      setMessages(prev => [...prev, { 
        role: 'mj', 
        content: response.content, 
        sender: response.sender || 'Architecte MJ' 
      }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: 'mj', 
        content: "L'Oracle est momentanément perturbé... (Erreur IA)", 
        sender: 'Système' 
      }]);
    } finally {
      setLoading(false);
    }
  };

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
                 <div className="flex gap-4 items-center p-4 bg-white/10 rounded-lg border border-gold/20">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 border border-gold/30 flex items-center justify-center text-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]">
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
                   {messages.filter(m => m.role === 'mj').slice(-1)[0]?.content.substring(0, 150)}...
                 </p>
              </div>
           </div>
        </main>

        <aside className="game-sidebar-right">
           <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="text-gold/50 text-[10px] text-center uppercase tracking-widest py-4 border-b border-white/5">Journal d'Aventure</div>
              {messages.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.role === 'mj' ? 'mj' : 'user'}`}>
                   <span className="text-gold font-bold block mb-1 text-[10px] uppercase tracking-wider">{msg.sender}</span>
                   <p className="text-sm leading-relaxed opacity-90">{msg.content}</p>
                </div>
              ))}
              {loading && <div className="text-[10px] text-gold animate-pulse text-center">L'Architecte réfléchit...</div>}
           </div>
           <div className="p-4 border-t border-white/5 bg-black/40">
              <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Décrivez votre action..." 
                  className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-lg text-sm focus:outline-none focus:border-gold/50 transition-all font-light" 
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gold p-2 hover:scale-110 transition-transform"
                >
                  <Sparkles size={18} />
                </button>
              </div>
           </div>
        </aside>
      </div>
    </motion.div>
  )
}

function PasswordGuard({ onUnlock }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === CONFIG.SITE_PASSWORD) {
      localStorage.setItem('site_unlocked', 'true');
      onUnlock();
    } else {
      setError(true);
      setInput('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="password-guard">
      <div className="password-guard-overlay" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10"
      >
        <div className="premium-title-group mb-12">
          <h1 style={{ fontSize: '3rem' }}>Halt Avanturier !</h1>
          <p className="subtitle">L'Accès est Réservé</p>
        </div>

        <form onSubmit={handleSubmit} className="password-input-group">
          <input 
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="password-input"
            autoFocus
            placeholder="········"
          />
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="password-error"
              >
                Accès refusé. Le destin n'est pas encore écrit.
              </motion.div>
            )}
          </AnimatePresence>
          <div className="password-hint">Entrez le mot de passe pour franchir le seuil</div>
        </form>
      </motion.div>
    </div>
  );
}

function App() {
  const [isUnlocked, setIsUnlocked] = useState(localStorage.getItem('site_unlocked') === 'true')
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
  const [searchCode, setSearchCode] = useState('')

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
      const { data: chars, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', session.id)
      if (!error) setUserCharacters(chars || [])
    } catch (err) {
      console.error(err)
    }
  }

  const legacyWorlds = [
    { 
      id: 'legacy-1', 
      title: "Hogwarts", 
      type: "Wizarding World", 
      description: "Une magie plus ancienne que les fondateurs s'éveille dans les profondeurs de Poudlard.", 
      image: "/campaigns/potter.png",
      map_url: "/maps/potter.png",
      suggested_classes: ["Sorcier", "Auror", "Botaniste", "Alchimiste", "Magizoologiste", "Professeur", "Mage Noir"],
      suggested_races: ["Sorcier (Sang-Pur)", "Sorcier (Né-Moldu)", "Demi-Géant", "Demi-Vélane"]
    },
    { 
      id: 'legacy-2', 
      title: "Azeroth", 
      type: "Warcraft", 
      description: "L'ombre du Vide s'étend sur les îles flottantes, menaçant l'équilibre du monde.", 
      image: "/campaigns/wow.png",
      map_url: "/maps/wow.png",
      suggested_classes: ["Guerrier", "Mage", "Voleur", "Prêtre", "Chasseur", "Paladin", "Chaman", "Druide"],
      suggested_races: ["Humain", "Orc", "Elfe", "Nain", "Mort-Vivant", "Troll", "Tauren", "Gnome"]
    },
    { 
      id: 'legacy-3', 
      title: "Runeterra", 
      type: "League of Legends", 
      description: "Le conflit entre Piltover et Zaun atteint son apogée technologique.", 
      image: "/campaigns/runeterra.png",
      map_url: "/maps/runeterra.png",
      suggested_classes: ["Combattant", "Mage", "Assassin", "Tireur", "Ingénieur Hextech", "Moine", "Protecteur"],
      suggested_races: ["Humain", "Yordle", "Vastaya", "Augmenté", "Golem", "Créature du Néant"]
    },
    { 
      id: 'legacy-4', 
      title: "Wall Maria", 
      type: "Attack on Titan", 
      description: "Face à l'immensité des Titans, l'humanité joue sa dernière carte au crépuscule.", 
      image: "/campaigns/snk.png",
      map_url: "/maps/snk.png",
      suggested_classes: ["Soldat du Bataillon d'Exploration", "Garde de la Garnison", "Membre des Brigades Spéciales", "Tacticien de Siège", "Médecin de Campagne", "Ingénieur de Manœuvre"],
      suggested_races: ["Humain des Murs", "Réfugié de Maria", "Noble de la Capitale", "Sujet d'Ymir"]
    },
    { 
      id: 'legacy-5', 
      title: "Forgotten Realms", 
      type: "D&D Classic", 
      description: "Les anciens wyrms se réveillent pour réclamer leur héritage de feu et de sang.", 
      image: "/campaigns/dnd.png",
      map_url: "/maps/dnd.png",
      suggested_classes: ["Guerrier", "Magicien", "Roublard", "Clerc", "Paladin", "Rôdeur", "Barde", "Druide", "Sorcier", "Moine"],
      suggested_races: ["Humain", "Elfe", "Nain", "Halfelin", "Drakéide", "Tieffelin", "Gnome", "Demi-Orc"]
    }
  ]

  const handleStartAdventure = (campaign, character) => {
    if (!campaign || !character) {
      console.error('[handleStartAdventure] Missing campaign or character', { campaign, character })
      alert("Erreur : données de campagne ou personnage manquantes. Veuillez réessayer.")
      return
    }
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
        let worldData = null;
        try {
          if (!camp.isLegacy) {
            worldData = await db.campaigns.get(camp.id)
          }
        } catch (e) {
          console.warn("Could not fetch campaign from DB, might be legacy", e)
        }
        
        // On essaye de trouver les données dans les legacy worlds par titre
        const legacy = legacyWorlds.find(w => w.title === (worldData?.name || camp.title || camp.name))
        
        const world = worldData?.worlds?.[0]
        
        setCurrentWorldContext({
          archetype: { 
            title: world?.archetype || legacy?.title || 'Classic Fantasy', 
            style_guide_dvc: world?.style_guide_dvc || legacy?.style_guide_dvc || legacy?.type || 'Style épique D&D',
            suggested_classes: world?.suggested_classes || legacy?.suggested_classes || ["Guerrier", "Magicien", "Roublard", "Clerc"],
            suggested_races: world?.suggested_races || legacy?.suggested_races || ["Humain", "Elfe", "Nain"]
          },
          campaignId: camp.id
        })
        setIsCharacterCreationOpen(true)
      }
    } catch (err) {
      console.error(err)
      alert("Erreur lors de l'accès à la campagne. Vérifiez si elle existe toujours.")
    }
  }

  const handleJoinByCode = async () => {
    if (!searchCode.trim()) return;
    try {
      const camp = await db.campaigns.get(searchCode.trim());
      if (camp) {
        setLoading(true);
        // On récupère le monde associé pour avoir le contexte AI
        const { data: worldData } = await db.supabase
          .from('worlds')
          .select('*')
          .eq('campaign_id', camp.id)
          .maybeSingle();
          
        const legacy = legacyWorlds.find(w => w.title === (camp.title || camp.name))

        setCurrentWorldContext({
          archetype: {
            ...worldData,
            title: worldData?.archetype || camp.title || 'Monde Inconnu',
            suggested_classes: worldData?.suggested_classes || legacy?.suggested_classes || ["Guerrier", "Magicien", "Roublard", "Clerc"],
            suggested_races: worldData?.suggested_races || legacy?.suggested_races || ["Humain", "Elfe", "Nain"]
          },
          campaignId: camp.id
        });
        setCurrentCampaignId(camp.id);
        
        // On vérifie si l'utilisateur a déjà un perso
        const char = userCharacters.find(c => c.campaign_id === camp.id);
        if (char) {
          handleStartAdventure(camp, char);
        } else {
          setIsCharacterCreationOpen(true);
        }
        setLoading(false);
      }
    } catch (err) {
      alert("Aucune campagne trouvée avec ce code.");
    }
  };

  const handleSignOut = async () => {
    await db.auth.signOut()
    setSession(null)
    setView('lobby')
  }

  if (!isUnlocked) return <PasswordGuard onUnlock={() => setIsUnlocked(true)} />

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
       {/* Background Ritual Glow */}
       <div className="absolute w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px] animate-pulse" />
       
       <div className="relative z-10 flex flex-col items-center gap-12">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 1, 0.3],
              rotate: 360
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <Sparkles className="text-gold" size={64} strokeWidth={1} />
            <div className="absolute inset-0 bg-gold/20 blur-xl rounded-full" />
          </motion.div>

          <div className="text-center space-y-4">
             <motion.h2 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-gold uppercase tracking-[0.8em] text-[10px] font-bold"
             >
               Synchronisation Neuronale
             </motion.h2>
             <p className="serif text-white/40 italic text-sm tracking-widest">
                L'Oracle prépare votre destinée...
             </p>
          </div>
       </div>

       {/* Grain effect already in body::before */}
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
                  <p>Invoquez les lois de la Genèse pour forger un monde unique. Vous êtes le Maître du Jeu.</p>
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
                   <p>Rejoignez un monde existant, créez votre légende et vivez l'aventure en tant que joueur.</p>
                   <div className="portal-btn">Rejoindre l'Aventure</div>
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

            <div className="space-y-32 mt-12">
               <section className="flex flex-col items-center">
                  <h2 className="text-[10px] text-gold uppercase tracking-[0.4em] mb-12 opacity-50">Nouvelle Création</h2>
                  <div className="grid justify-center w-full">
                    <motion.div 
                      className="campaign-card create-card"
                      onClick={() => setIsGenesisOpen(true)}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Orbit size={56} strokeWidth={1} className="text-gold mb-6" />
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
                        onPlay={async () => {
                          try {
                            setLoading(true);
                            // On vérifie le nom de la colonne admin_id vs owner_id
                            const newCamp = await db.campaigns.create(world.title, world.description, session.id, { 
                              status: 'lobby',
                              image: world.image,
                              map_url: world.map_url
                            });
                            
                            setCurrentCampaignId(newCamp.id);
                            setCurrentWorldContext({
                              archetype: { 
                                title: world.title, 
                                style_guide_dvc: `Style "${world.type}"`,
                                suggested_classes: world.suggested_classes,
                                suggested_races: world.suggested_races
                              },
                              campaignId: newCamp.id
                            });
                            setIsCharacterCreationOpen(true);
                          } catch (err) {
                            console.error("Erreur d'éveil :", err);
                            alert(`Échec de l'éveil : ${err.message || "Erreur inconnue"}`);
                          } finally {
                            setLoading(false);
                            loadData();
                          }
                        }}
                      />
                    ))}
                  </div>
               </section>

               {campaigns.filter(c => c.admin_id === session.id).length > 0 && (
  <section className="flex flex-col items-center">
     <h2 className="text-[10px] text-gold uppercase tracking-[0.4em] mb-12 opacity-50">Mes Fragments Cristallisés</h2>
     <div className="grid justify-center w-full">
       {campaigns.filter(c => c.admin_id === session.id).map((camp) => (
         <CampaignCard 
           key={camp.id}
           id={camp.id}
           title={camp.name}
           description={camp.description}
           type="Maître du Monde"
           showCode={true}
           btnLabel="GÉRER"
           onPlay={() => handleCampaignClick(camp)}
         />
       ))}
     </div>
  </section>
)}
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
               
               <div className="premium-search-container">
                  <div className="search-glow" />
                  <input 
                   type="text" 
                   placeholder="CODE DE FRAGMENT..."
                   value={searchCode}
                   onChange={(e) => setSearchCode(e.target.value)}
                   className="premium-search-input"
                  />
                  <button 
                   onClick={handleJoinByCode}
                   className="premium-search-btn"
                  >
                    Chercher
                  </button>
                </div>
            </div>

            <div className="campaign-list-container">
              {campaigns.length === 0 ? (
                <div className="grid-full mx-auto w-full max-w-2xl py-32 text-center border border-dashed border-white/5 rounded-lg flex flex-col items-center">
                   <p className="text-white/20 uppercase tracking-widest text-xs mb-6">Aucun monde n'a été découvert dans ce plan.</p>
                   <button onClick={() => setView('create')} className="btn-mini primary">Invoquer un monde</button>
                </div>
              ) : (
                campaigns.map((camp) => (
                  <CampaignCard 
                    key={camp.id}
                    id={camp.id}
                    title={camp.name}
                    description={camp.description}
                    image={camp.image}
                    type={camp.admin_id === session.id ? "Maître du Monde" : "Aventure"}
                    showCode={camp.admin_id === session.id}
                    isJoined={userCharacters.some(c => c.campaign_id === camp.id)}
                    onPlay={() => handleCampaignClick(camp)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}

        {view === 'game' && (
          <LiveSession 
            campaign={activeCampaign} 
            character={activeCharacter}
            session={session}
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
          if (!currentCampaignId) {
            console.error('[onComplete] currentCampaignId is null')
            alert("Erreur : impossible de retrouver la campagne. Retour au lobby.")
            setView('lobby')
            loadData()
            return
          }
          db.campaigns.get(currentCampaignId).then(campData => {
            handleStartAdventure(campData, char)
          }).catch(err => {
            console.error('[onComplete] Failed to fetch campaign:', err)
            alert("Erreur lors du chargement de la campagne. Retour au lobby.")
            setIsCharacterCreationOpen(false)
            setView('lobby')
            loadData()
          })
        }}
      />
    </div>
  )
}

export default App

