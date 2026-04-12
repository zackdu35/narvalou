import { useState } from 'react'
import { Plus, Play, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import GenesisInterface from './components/GenesisInterface'

function CampaignCard({ title, description, image, type }) {
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
        <button className="btn-play" style={{ alignSelf: 'flex-end' }}>ÉVEILLÉ</button>
      </div>
    </motion.div>
  )
}

function App() {
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

  return (
    <div className="min-h-screen">
      <main className="container pt-32">
        <div className="grid">
          {campaigns.map((camp) => (
            <CampaignCard key={camp.id} {...camp} />
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
      </main>

      <GenesisInterface 
        isOpen={isGenesisOpen} 
        onClose={() => setIsGenesisOpen(false)} 
      />

    </div>
  )
}

export default App
