import { useState, useEffect, useRef } from 'react'
import { X, Sparkles, Terminal, BookOpen, Map, Users, Zap, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import TechnicalLog from './TechnicalLog'
import LoreCard from './LoreCard'
import { aiService } from '../services/ai'
import { db, supabase } from '../services/supabase'


export default function GenesisInterface({ isOpen, onClose, onStartAdventure }) {
  const [step, setStep] = useState('input')
  const [prompt, setPrompt] = useState('')
  const [logs, setLogs] = useState([])
  const [archetypes, setArchetypes] = useState([])
  const [selectedArchetype, setSelectedArchetype] = useState(null)
  const [pillars, setPillars] = useState([])
  const [currentPillarIndex, setCurrentPillarIndex] = useState(0)
  const [hookData, setHookData] = useState(null)
  const [error, setError] = useState(null)
  const [createdCampaignId, setCreatedCampaignId] = useState(null)
  
  const logEndRef = useRef(null)

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }])
  }

  useEffect(() => {
    if (isOpen) {
      setStep('input')
      setPrompt('')
      setLogs([{ message: 'Système Architecte initialisé...', type: 'info' }])
      setArchetypes([])
      setSelectedArchetype(null)
      setPillars([])
      setCurrentPillarIndex(0)
      setHookData(null)
      setError(null)
      setCreatedCampaignId(null)
    }
  }, [isOpen])

  const handleStartGenese = async () => {
    if (!prompt.trim()) return
    setStep('analyzing')
    setError(null)
    addLog(`Analyse de la semence : "${prompt}"`, 'process')
    
    try {
      addLog('Extraction des structures narratives...', 'process')
      const generatedArchetypes = await aiService.generateArchetypes(prompt)
      setArchetypes(generatedArchetypes)
      addLog(`${generatedArchetypes.length} archétypes générés avec succès.`, 'gen')
      setStep('archetypes')
    } catch (err) {
      setError("Désolé, l'Architecte est temporairement indisponible.")
      addLog("Erreur critique : Échec de la communication neuronale.", 'error')
      setStep('input')
    }
  }

  const handleArchetypeSelect = async (arch) => {
    setSelectedArchetype(arch)
    addLog(`Archétype sélectionné : ${arch.title}`, 'info')
    setStep('generating-pillars')
    addLog('Construction des piliers du monde...', 'process')
    
    try {
       const generatedPillars = await aiService.generatePillars(arch, prompt)
       setPillars(generatedPillars)
       addLog('Piliers du monde érigés.', 'gen')
       setStep('pillars')
    } catch (err) {
       setError("L'Architecte n'a pas pu stabiliser la réalité.")
       addLog("Erreur système lors de la génération des piliers.", 'error')
       setStep('archetypes')
    }
  }

  const handleNextPillar = async () => {
    if (currentPillarIndex < pillars.length - 1) {
      setCurrentPillarIndex(prev => prev + 1)
      addLog(`Pilier ${pillars[currentPillarIndex].category} validé.`, 'info')
    } else {
      setStep('generating-hook')
      addLog('Calcul du point d\'entrée narratif...', 'process')
      try {
        const generatedHook = await aiService.generateHook(selectedArchetype, pillars, prompt)
        setHookData(generatedHook)
        addLog('Point d\'entrée narratif cristallisé.', 'gen')
        setStep('hook')
      } catch (err) {
        addLog("Erreur mineure : Échec de la synthèse du hook. Utilisation d'un point d'ancrage par défaut.", 'process')
        setHookData({
          location: { title: "L'Auberge de la Croisée", description: "Un simple refuge..." },
          npc: { name: "Le Tavernier", description: "Inquiet..." },
          quest: { title: "Un premier pas", description: "Tout commence ici." }
        })
        setStep('hook')
      }
    }
  }

  const handleFinishHook = async () => {
    setStep('visualizing')
    addLog('Synthèse visuelle de l\'univers...', 'gen')
    
    try {
      addLog('Archivage du monde dans les registres Supabase...', 'process')
      
      // 1. Créer la campagne avec le propriétaire
      const { data: { user } } = await supabase.auth.getUser()
      const campaign = await db.campaigns.create(
        selectedArchetype.title, 
        `Un monde basé sur : ${prompt}`,
        user.id,
        { status: 'lobby' }
      )
      setCreatedCampaignId(campaign.id)
      
      // 2. Créer le monde (on pourra l'étendre avec plus de fonctions dans supabase.js)
      const { data: world, error: worldError } = await supabase
        .from('worlds')
        .insert([{
          campaign_id: campaign.id,
          archetype: selectedArchetype.title,
          lore_summary: selectedArchetype.description,
          style_guide_dvc: `Style optimisé pour ${selectedArchetype.title}. Atmosphère épique.`,
          suggested_classes: selectedArchetype.suggested_classes,
          suggested_races: selectedArchetype.suggested_races
        }])
        .select()
        .single()
      
      if (worldError) throw worldError

      // 3. Créer les régions
      const regionsPromises = pillars.map(p => 
        supabase.from('regions').insert([{
          world_id: world.id,
          name: p.title,
          description: p.description
        }])
      )
      await Promise.all(regionsPromises)

      addLog('Univers cristallisé dans la base de données.', 'info')
      setStep('complete')
      addLog('Genèse terminée avec succès.', 'info')
      
      // On enrichit l'archetype avec les classes suggérées pour le CharacterCreation
      const enrichedArchetype = {
        ...selectedArchetype,
        suggested_classes: selectedArchetype.suggested_classes || ["Guerrier", "Magicien", "Roublard", "Clerc"]
      }
      setSelectedArchetype(enrichedArchetype)

    } catch (err) {
      console.error(err)
      addLog('Erreur lors de la sauvegarde de l\'univers.', 'error')
      setError("La sauvegarde a échoué, mais vous pouvez continuer en mode éphémère.")
      setStep('complete')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] architect-modal"
          style={{ padding: 0 }}
        >
          <div className="architect-layout">
            <aside className="architect-sidebar">
              <div className="flex items-center gap-3 mb-8 text-gold">
                <Terminal size={18} />
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Flux de Données</span>
              </div>
              <TechnicalLog logs={logs} />
            </aside>

            <main className="architect-main">
              <button onClick={onClose} className="btn-close-architect">
                <X size={48} strokeWidth={1} />
              </button>

              <AnimatePresence mode="wait">
                {step === 'input' && (
                  <motion.div 
                    key="input"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="flex flex-col items-center text-center max-w-[800px]"
                  >
                    <h2 className="text-gold uppercase tracking-widest text-sm mb-24">Genèse d'un Monde</h2>
                    
                    {error && (
                      <div className="flex items-center gap-2 text-red-500 mb-6 font-mono text-sm">
                        <AlertTriangle size={16} /> {error}
                      </div>
                    )}

                    <textarea 
                      autoFocus
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Décrivez l'Inimaginable..."
                      className="architect-input"
                      rows={1}
                    />
                    <button 
                      onClick={handleStartGenese}
                      disabled={!prompt.trim()}
                      className="btn-architect"
                    >
                      ÉVEILLÉ
                    </button>
                  </motion.div>
                )}

                {(step === 'analyzing' || step === 'generating-pillars' || step === 'generating-hook' || step === 'visualizing') && (
                  <motion.div 
                    key="animating"
                    className="flex flex-col items-center gap-8"
                  >
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles size={64} className="text-gold" />
                    </motion.div>
                    <h2 className="text-white font-serif text-3xl tracking-widest animate-pulse">
                      {step === 'analyzing' ? "L'ARCHITECTE ANALYSE LA SEMENCE..." : 
                       step === 'generating-pillars' ? "L'ARCHITECTE ÉRIGE LES PILIERS..." : 
                       step === 'generating-hook' ? "L'ARCHITECTE TISSE LES DESTINÉES..." : 
                       "L'ARCHITECTE TISSE L'HORIZON..." }
                    </h2>
                  </motion.div>
                )}

                {step === 'archetypes' && (
                  <motion.div 
                    key="archetypes"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full max-w-[1200px]"
                  >
                    <h3 className="text-gold text-center serif text-4xl mb-24">Choisissez un Archétype</h3>

                    <div className="lore-card-container">
                      {archetypes.map((arch) => (
                        <div key={arch.id} onClick={() => handleArchetypeSelect(arch)} className="cursor-pointer">
                          <LoreCard 
                            title={arch.title}
                            description={arch.description}
                            onSelect={() => handleArchetypeSelect(arch)}
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 'pillars' && pillars.length > 0 && (
                  <motion.div 
                    key="pillars"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center w-full max-w-[600px]"
                  >
                     <span className="text-gold uppercase tracking-widest text-[10px] mb-8">Construction des Piliers : {pillars[currentPillarIndex].category}</span>
                     <LoreCard 
                        title={pillars[currentPillarIndex].title}
                        description={pillars[currentPillarIndex].description}
                        onSelect={handleNextPillar}
                     />
                     <div className="mt-8 flex gap-2">
                        {pillars.map((_, i) => (
                           <div key={i} className={`h-1 w-8 rounded-full ${i <= currentPillarIndex ? 'background-gold' : 'bg-neutral-800'}`} 
                                style={{ backgroundColor: i <= currentPillarIndex ? 'var(--gold)' : '#333' }} />
                        ))}
                     </div>
                  </motion.div>
                )}

                {step === 'hook' && hookData && (
                  <motion.div 
                    key="hook"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col items-center w-full max-w-[600px]"
                  >
                     <span className="text-gold uppercase tracking-widest text-[10px] mb-8">Le Point de Départ : L'Inévitable</span>
                     <LoreCard 
                        title={hookData.location.title}
                        description={`${hookData.location.description} Vous y rencontrerez ${hookData.npc.name}. Votre première quête : ${hookData.quest.title}.`}
                        onSelect={handleFinishHook}
                     />
                     <div className="mt-6 text-center italic text-sm opacity-50 max-w-sm">
                        "C'est ici que votre récit s'ancre dans la réalité."
                     </div>
                  </motion.div>
                )}

                {step === 'complete' && (
                  <motion.div 
                    key="complete"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center space-y-12"
                  >
                    <div className="visual-preview">
                      <img src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1600" alt="World Preview" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    </div>
                    
                    <div className="style-guide-panel">
                       <h5>Directives Visuelles (DVC)</h5>
                       <p>"DVC optimisée pour {selectedArchetype?.title}. Atmosphère épique et mystique."</p>
                    </div>

                    <h2 className="text-6xl text-gold font-serif">L'Univers est Né</h2>
                    <p className="text-neutral-500 tracking-[0.2em] uppercase">Votre récit commence maintenant.</p>
                    <button 
                      onClick={() => onStartAdventure({ archetype: selectedArchetype, campaignId: createdCampaignId, pillars: pillars, prompt: prompt })}
                      className="btn-architect"
                    >
                      COMMENCER L'AVENTURE
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


