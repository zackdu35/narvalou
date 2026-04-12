import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, User, Sword, Book, Shield, Zap, RefreshCw } from 'lucide-react'
import { aiService } from '../services/ai'
import { db } from '../services/supabase'

export default function CharacterCreation({ isOpen, onClose, worldContext, onComplete, campaignId }) {
  const [step, setStep] = useState('details')
  const [customData, setCustomData] = useState({
    name: '',
    race: '',
    class: '',
    gender: '',
    age: '',
    appearance: '',
    background: '',
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  })
  const [loading, setLoading] = useState(false)
  const [dvc, setDvc] = useState('')

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
        gender: customData.gender,
        age: customData.age,
        appearance: customData.appearance,
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
    <div className="character-creation-overlay">
      <div className="mx-auto w-full max-w-5xl relative z-10">
        <button onClick={onClose} className="btn-close-architect">
          <X size={40} strokeWidth={1} />
        </button>
 
        <div className="text-center mb-16">
          <motion.span 
            initial={{ opacity: 0, letterSpacing: '1em' }}
            animate={{ opacity: 0.4, letterSpacing: '0.5em' }}
            className="text-gold uppercase text-[9px] font-bold"
          >
            Le Creuset des Légendes
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-7xl serif text-white mt-4 tracking-tighter"
          >
            Forgez votre Destinée
          </motion.h2>
          <div className="h-px w-24 bg-gold/30 mx-auto mt-8" />
        </div>
 
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-32"
            >
              <div className="search-glow" style={{ opacity: 0.3, width: '300px', height: '300px' }} />
              <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Sparkles size={80} strokeWidth={0.5} className="text-gold" />
              </motion.div>
              <p className="mt-16 text-gold/40 font-serif italic text-xl tracking-wide">L'Oracle consulte les écheveaux du temps...</p>
            </motion.div>
          )}
 
 
          {!loading && step === 'details' && (
            <motion.div 
              key="details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="trinity-container"
            >
              {/* COLONNE 1 : IDENTITÉ */}
              <div className="trinity-column">
                <div className="oracle-identity">
                  <label className="text-gold text-[8px] uppercase tracking-[0.4em] opacity-60 mb-4 block">Identité</label>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="NOM DU HÉROS"
                    value={customData.name}
                    onChange={(e) => setCustomData({...customData, name: e.target.value})}
                    className="oracle-input-hero !text-6xl"
                  />
                  
                  <div className="flex flex-col gap-6 mt-8">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="oracle-sub-field">
                           <label>Origine</label>
                           <input 
                             type="text" 
                             value={customData.race}
                             onChange={(e) => setCustomData({...customData, race: e.target.value})}
                             placeholder="RACE..."
                           />
                        </div>
                        <div className="oracle-sub-field">
                           <label>Voie</label>
                           <input 
                             type="text" 
                             value={customData.class}
                             onChange={(e) => setCustomData({...customData, class: e.target.value})}
                             placeholder="CLASSE..."
                           />
                        </div>
                     </div>
 
                     <div className="grid grid-cols-2 gap-6">
                        <div className="oracle-sub-field">
                           <label>Âge</label>
                           <input 
                             type="text" 
                             value={customData.age}
                             onChange={(e) => setCustomData({...customData, age: e.target.value})}
                             placeholder="25 CYCLES..."
                           />
                        </div>
                        <div className="oracle-sub-field">
                           <label>Sexe / Genre</label>
                           <input 
                             type="text" 
                             value={customData.gender}
                             onChange={(e) => setCustomData({...customData, gender: e.target.value})}
                             placeholder="IDENTITÉ..."
                           />
                        </div>
                     </div>
 
                     <div className="oracle-sub-field mt-4">
                        <label>Traits Distinctifs (Apparence)</label>
                        <textarea 
                          value={customData.appearance}
                          onChange={(e) => setCustomData({...customData, appearance: e.target.value})}
                          placeholder="YEUX D'OR, CICATRICE, ARMURE DE RELIQUE..."
                          className="premium-input-line !h-32 !resize-none"
                        />
                     </div>
                  </div>
                </div>
              </div>
 
              {/* COLONNE 2 : STATS (CONSTELLATION) */}
              <div className="trinity-column border-x border-white/5 px-8">
                <label className="text-gold text-[8px] uppercase tracking-[0.4em] opacity-60 mb-4 block text-center">Essence</label>
                <div className="grid grid-cols-1 gap-6">
                  {Object.entries(customData.stats).map(([stat, val], i) => (
                    <motion.div 
                      key={stat} 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="constellation-node"
                    >
                      <label>{stat}</label>
                      <input 
                        type="number"
                        min="3"
                        max="20"
                        value={val}
                        onChange={(e) => {
                          let newVal = parseInt(e.target.value) || 0;
                          if (newVal > 20) newVal = 20;
                          setCustomData({
                            ...customData,
                            stats: { ...customData.stats, [stat]: newVal }
                          });
                        }}
                        className="oracle-stat-input !text-3xl"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
 
              {/* COLONNE 3 : MONDE / LORE */}
              <div className="trinity-column">
                <label className="text-gold text-[8px] uppercase tracking-[0.4em] opacity-60 mb-4 block">Échos du Monde</label>
                <div className="lore-content">
                  {worldContext?.description || "Un monde de brume et de mystère s'étend devant vous... Le destin de cette terre attend d'être écrit par vos actes."}
                  
                  {worldContext?.archetypes && (
                    <div className="mt-12 pt-8 border-t border-white/5">
                      <h4 className="text-gold text-[8px] uppercase tracking-[0.3em] mb-4">Légendes de l'Archetype</h4>
                      <div className="flex flex-wrap gap-2">
                         <span className="lore-tag">{worldContext.archetypes.name}</span>
                         <span className="lore-tag">DIFFICULTÉ {worldContext.archetypes.difficulty || 'ÉPIQUE'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
 
              {/* ACTION FINALE */}
              <div className="flex flex-col items-center justify-center w-full mt-12" style={{ gridColumn: '1 / -1' }}>
                <div className="mb-4 text-center">
                  <span className="text-[9px] text-white/40 uppercase tracking-[0.5em]">Énergie du Creuset</span>
                  <div className={`text-4xl serif mt-2 transition-colors ${72 - Object.values(customData.stats).reduce((a,b)=>a+b,0) < 0 ? 'text-red-500' : 'text-white'}`}>
                    {72 - Object.values(customData.stats).reduce((a,b)=>a+b,0)}
                  </div>
                </div>
                
                <button 
                  onClick={handleGenerateDVC}
                  disabled={Object.values(customData.stats).reduce((a,b)=>a+b,0) > 72}
                  className="btn-oracle-invoke"
                  style={{ opacity: Object.values(customData.stats).reduce((a,b)=>a+b,0) > 72 ? 0.2 : 1 }}
                >
                  Invoquer l'Apparence
                </button>
              </div>
            </motion.div>
          )}
 
          {!loading && step === 'review' && (
            <motion.div 
              key="review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="max-w-3xl mx-auto">
                <span className="text-gold text-[9px] uppercase tracking-[0.5em] opacity-40">Vision de l'Oracle</span>
                <p className="serif text-4xl italic leading-relaxed text-white/90 mt-8 mb-16">
                  "{dvc}"
                </p>
                
                <div className="flex justify-center gap-12">
                   <button onClick={() => setStep('details')} className="btn-mini hover:text-gold transition-colors italic serif text-lg opacity-40 hover:opacity-100">Retourner au Creuset</button>
                   <button 
                    onClick={handleSave}
                    className="btn-architect"
                    style={{ margin: 0 }}
                  >
                    PRENDRE VIE
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
