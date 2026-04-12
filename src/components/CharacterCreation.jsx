import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, User, Sword, Book, Shield, Zap, RefreshCw } from 'lucide-react'
import { aiService } from '../services/ai'
import { db } from '../services/supabase'

export default function CharacterCreation({ isOpen, onClose, worldContext, onComplete, campaignId }) {
  const [step, setStep] = useState('suggestions')
  const [suggestions, setSuggestions] = useState([])
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [customData, setCustomData] = useState({
    name: '',
    race: '',
    class: '',
    background: '',
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  })
  const [loading, setLoading] = useState(false)
  const [dvc, setDvc] = useState('')

  useEffect(() => {
    if (isOpen && worldContext) {
      loadSuggestions()
    }
  }, [isOpen, worldContext])

  const loadSuggestions = async () => {
    setLoading(true)
    try {
      const data = await aiService.suggestCharacterOptions(worldContext)
      setSuggestions(data)
      setStep('suggestions')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSuggestion = (char) => {
    setCustomData(char)
    setStep('details')
  }

  const handleGenerateDVC = async () => {
    setLoading(true)
    try {
      const { dvc: generatedDvc } = await aiService.generateCharacterDVC(
        customData, 
        worldContext.archetype.style_guide_dvc || 'Style épique D&D'
      )
      setDvc(generatedDvc)
      setStep('review')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await db.supabase.auth.getUser()

      const character = {
        campaign_id: campaignId,
        user_id: user.id,
        name: customData.name,
        race: customData.race,
        class: customData.class,
        stats: customData.stats,
        dvc: dvc,
        hp_max: 10 + (Math.floor((customData.stats.con - 10) / 2)),
        hp_current: 10 + (Math.floor((customData.stats.con - 10) / 2))
      }
      
      const { data, error } = await db.supabase
        .from('characters')
        .insert([character])
        .select()
        .single()
      
      if (error) throw error
      onComplete(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-4xl w-full relative">
        <button onClick={onClose} className="absolute -top-12 -right-12 text-white/30 hover:text-white">
          <X size={32} />
        </button>

        <div className="text-center mb-12">
          <span className="text-gold uppercase tracking-[0.3em] text-[10px] font-bold">Le Creuset des Légendes</span>
          <h2 className="text-5xl serif text-white mt-4">Forgez votre Destinée</h2>
        </div>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-20"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles size={48} className="text-gold" />
              </motion.div>
              <p className="mt-6 text-gold/60 font-mono animate-pulse">L'Oracle consulte les écheveaux du temps...</p>
            </motion.div>
          )}

          {!loading && step === 'suggestions' && (
            <motion.div 
              key="suggestions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {suggestions.map((s, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleSelectSuggestion(s)}
                  className="bg-neutral-900/50 border border-white/10 p-6 rounded-xl cursor-pointer hover:border-gold/50 transition-all group"
                >
                  <div className="text-gold mb-4 opacity-50 group-hover:opacity-100 transition-opacity">
                    {s.class === 'Mage' ? <Book /> : s.class === 'Guerrier' ? <Sword /> : <Shield />}
                  </div>
                  <h3 className="text-xl serif text-white mb-2">{s.name}</h3>
                  <div className="text-[10px] text-gold uppercase tracking-widest mb-4">{s.race} • {s.class}</div>
                  <p className="text-sm text-neutral-400 leading-relaxed mb-6">{s.description}</p>
                  <button className="w-full py-2 border border-gold/20 text-gold text-[10px] uppercase tracking-widest group-hover:bg-gold group-hover:text-black transition-all">Incarner</button>
                </motion.div>
              ))}
              <div 
                onClick={() => setStep('details')}
                className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-6 hover:border-white/30 cursor-pointer text-white/30 hover:text-white"
              >
                <RefreshCw />
                <span className="mt-4 text-[10px] uppercase tracking-widest">Concept Personnalisé</span>
              </div>
            </motion.div>
          )}

          {!loading && step === 'details' && (
            <motion.div 
              key="details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-neutral-900/50 border border-white/10 p-12 rounded-2xl"
            >
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] text-gold uppercase tracking-widest block mb-2">Nom du Héros</label>
                    <input 
                      type="text" 
                      value={customData.name}
                      onChange={(e) => setCustomData({...customData, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 p-3 rounded text-white focus:border-gold/50 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gold uppercase tracking-widest block mb-2">Race</label>
                      <input 
                        type="text" 
                        value={customData.race}
                        onChange={(e) => setCustomData({...customData, race: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 p-3 rounded text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gold uppercase tracking-widest block mb-2">Classe</label>
                      <input 
                        type="text" 
                        value={customData.class}
                        onChange={(e) => setCustomData({...customData, class: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 p-3 rounded text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(customData.stats).map(([stat, val]) => (
                    <div key={stat}>
                      <label className="text-[10px] text-white/30 uppercase tracking-widest block mb-2">{stat}</label>
                      <div className="bg-white/5 p-3 rounded text-center text-xl serif text-gold">{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-12 flex justify-end">
                <button 
                  onClick={handleGenerateDVC}
                  className="bg-gold text-black px-12 py-4 uppercase tracking-[0.2em] font-bold hover:scale-105 transition-transform"
                >
                  CRISTALLISER L'APPARENCE
                </button>
              </div>
            </motion.div>
          )}

          {!loading && step === 'review' && (
            <motion.div 
              key="review"
              className="text-center space-y-8"
            >
              <div className="style-guide-panel max-w-2xl mx-auto">
                <h5 className="text-gold mb-2">Description Visuelle de l'IA</h5>
                <p className="serif text-xl italic leading-relaxed text-white/80">"{dvc}"</p>
              </div>

              <div className="flex justify-center gap-6">
                 <button onClick={() => setStep('details')} className="px-8 py-3 border border-white/20 text-white/50 text-[10px] uppercase tracking-widest">Modifier</button>
                 <button 
                  onClick={handleSave}
                  className="bg-gold text-black px-12 py-4 uppercase tracking-[0.2em] font-bold hover:scale-105 transition-transform"
                >
                  INCARNER LA LÉGENDE
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
