import { useState } from 'react'
import { Plus, Play, Sparkles, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import GenesisInterface from './components/GenesisInterface'

function CampaignCard({ title, description, image, type, onPlay }) {
  return (
    <motion.div 
      className="campaign-card"
      whileHover={{ scale: 1.02 }}
    >
      <img src={image} alt={title} />
      <div className="card-overlay">
        <span className="text-[10px] text-gold uppercase tracking-[0.3em] font-bold mb-2">{type}</span>
        <h3>{title}</h3>
        <p>{description}</p>
        <button onClick={onPlay} className="btn-play" style={{ alignSelf: 'flex-end' }}>ÉVEILLÉ</button>
      </div>
    </motion.div>
  )
}

function GameInterface({ campaign, onExit }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="game-layout"
    >
      <header className="game-topbar">
        <div className="flex items-center gap-6">
          <span className="text-gold serif text-xl">{campaign.title}</span>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="text-[10px] uppercase tracking-widest opacity-50">Lieu : {campaign.type}</span>
        </div>
        <button onClick={onExit} className="text-white/30 hover:text-white flex items-center gap-2 text-[10px] tracking-widest">
          <LogOut size={14} /> QUITTER
        </button>
      </header>
      
      <div className="game-content">
        <aside className="game-sidebar-left">
           <div className="p-6 space-y-8">
              <div className="space-y-4">
                 <h4 className="text-[10px] text-gold uppercase tracking-widest">Compagnons</h4>
                 <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 border border-gold/30" />
                    <div>
                       <div className="text-xs font-bold">Aelwyn</div>
                       <div className="h-1 w-24 bg-neutral-900 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[80%]" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </aside>

        <main className="game-main">
           <div className="scene-container">
              <img src={campaign.image} alt="Scene" className="scene-image" />
              <div className="scene-overlay" />
              <div className="scene-narration">
                 <p className="serif text-2xl leading-relaxed">
                   Le silence pèse sur la cité suspendue. Alors que vous approchez du Grand Condensateur, l'air commence à vibrer d'une énergie bleutée. Quelque chose s'est éveillé dans les profondeurs de la machine...
                 </p>
              </div>
           </div>
        </main>

        <aside className="game-sidebar-right">
           <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              <div className="text-gold/50 text-[10px] text-center uppercase tracking-widest py-4">Session Commencée</div>
              <div className="chat-msg mj">
                 <span className="text-gold font-bold block mb-1">MJ Architecte</span>
                 Bienvenue dans votre récit. Que souhaitez-vous faire ?
              </div>
           </div>
           <div className="p-4 border-t border-white/5">
              <input type="text" placeholder="Décrivez votre action..." className="w-full bg-white/5 border border-white/10 p-3 rounded text-sm focus:outline-none focus:border-gold/50" />
           </div>
        </aside>
      </div>
    </motion.div>
  )
}

function App() {
  const [view, setView] = useState('selection')
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [isGenesisOpen, setIsGenesisOpen] = useState(false)

  const campaigns = [
    {
      id: 1,
      title: "Hogwarts",
      type: "The Forgotten Vault",
      description: "Une magie plus ancienne que les fondateurs s'éveille dans les profondeurs de Poudlard.",
      image: "/campaigns/potter.png"
    },
    {
      id: 2,
      title: "Azeroth",
      type: "Echoes of the Void",
      description: "L'ombre du Vide s'étend sur les îles flottantes, menaçant l'équilibre du monde.",
      image: "/campaigns/wow.png"
    },
    {
      id: 3,
      title: "Runeterra",
      type: "Hextech Rebellion",
      description: "Le conflit entre Piltover et Zaun atteint son apogée technologique.",
      image: "/campaigns/runeterra.png"
    },
    {
      id: 4,
      title: "Wall Maria",
      type: "The Crimson Sunset",
      description: "Face à l'immensité des Titans, l'humanité joue sa dernière carte au crépuscule.",
      image: "/campaigns/snk.png"
    },
    {
      id: 5,
      title: "Forgotten Realms",
      type: "The Dragon's Legacy",
      description: "Les anciens wyrms se réveillent pour réclamer leur héritage de feu et de sang.",
      image: "/campaigns/dnd.png"
    }
  ]

  const handleStartAdventure = (campaign) => {
    setActiveCampaign(campaign)
    setView('game')
    setIsGenesisOpen(false)
  }

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {view === 'selection' ? (
          <motion.main 
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="container pt-32"
          >
            <div className="grid">
              {campaigns.map((camp) => (
                <CampaignCard 
                  key={camp.id} 
                  {...camp} 
                  onPlay={() => handleStartAdventure(camp)}
                />
              ))}

              <motion.div 
                className="campaign-card create-card"
                onClick={() => setIsGenesisOpen(true)}
                whileHover={{ scale: 1.02 }}
              >
                <Plus size={48} className="text-gold" />
                <h3 className="serif">Nouveau Monde</h3>
                <p className="text-sm opacity-60 leading-relaxed">Réclamez l'aide de l'Architecte IA pour forger une nouvelle épopée.</p>
              </motion.div>
            </div>
          </motion.main>
        ) : (
          <GameInterface 
            campaign={activeCampaign} 
            onExit={() => setView('selection')} 
          />
        )}
      </AnimatePresence>

      <GenesisInterface 
        isOpen={isGenesisOpen} 
        onClose={() => setIsGenesisOpen(false)}
        onStartAdventure={(data) => handleStartAdventure({
          title: "Nouvel Univers",
          type: data.archetype.title,
          image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1600",
          description: "Un monde forgé par l'Architecte."
        })}
      />

    </div>
  )
}

export default App

