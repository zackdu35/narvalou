import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Sword, Book, Shield, Zap, RefreshCw, Orbit, Infinity as InfinityIcon } from 'lucide-react'
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
  const [portraitUrl, setPortraitUrl] = useState('')

  const handleGenerateDVC = async () => {
    setLoading(true)
    try {
      console.log('Generating identity...');
      const { dvc: generatedDvc } = await aiService.generateCharacterDVC(
        customData, 
        worldContext.archetype.style_guide_dvc || 'Style épique D&D'
      )
      console.log('DVC generated:', generatedDvc);
      setDvc(generatedDvc)
      
      console.log('Generating portrait...');
      const imageUrl = await aiService.generateImage(generatedDvc);
      console.log('Portrait generated:', imageUrl);
      setPortraitUrl(imageUrl)
      
      setStep('review')
    } catch (err) {
      console.error('Flow error:', err)
    } finally {
      console.log('Ending loading state');
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
        portrait_url: portraitUrl,
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
 
        <AnimatePresence>
          {loading && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl"
            >
              {/* ORACLE EYE / IRIS */}
              <div className="relative">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ 
                    opacity: [0.2, 0.5, 0.2], 
                    scale: [1, 1.2, 1],
                    rotate: 360
                  }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="w-64 h-64 border border-gold/10 rounded-full flex items-center justify-center"
                >
                  <div className="w-48 h-48 border-[0.5px] border-gold/20 rounded-full" />
                  <div className="absolute w-32 h-32 border-[0.5px] border-gold/40 rounded-full" />
                </motion.div>

                <motion.div 
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <div className="w-1 h-1 bg-gold rounded-full shadow-[0_0_30px_10px_rgba(212,175,55,0.4)]" />
                  <Orbit size={40} strokeWidth={0.5} className="text-gold absolute" />
                </motion.div>
                
                {/* AMBIENT GLOW */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[100px] pointer-events-none" />
              </div>

              <div className="text-center mt-24 max-w-md">
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-[10px] text-gold uppercase tracking-[0.6em] mb-4 block font-bold">Protocole de Genèse</span>
                  <p className="serif text-2xl italic text-white/80 leading-relaxed">
                    "L'Oracle tisse les fils du destin pour <span className="text-gold">{customData.name || 'votre héros'}</span>..."
                  </p>
                </motion.div>
                
                <div className="flex justify-center gap-1 mt-12">
                   {[0,1,2].map(i => (
                     <motion.div 
                        key={i}
                        animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1 h-1 bg-gold rounded-full"
                     />
                   ))}
                </div>
              </div>
            </motion.div>
          )}
 
 
          {!loading && step === 'details' && (
            <motion.div 
              key="details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="character-sheet-container"
            >
              {/* HEADER SECTION - THE IDENTITY BADGE */}
              <div className="sheet-header">
                <div className="sheet-name-box">
                  <label>Nom du Héros</label>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Eldrin l'Éthéré"
                    value={customData.name}
                    onChange={(e) => setCustomData({...customData, name: e.target.value})}
                    className="sheet-input-name"
                  />
                </div>
                <div className="sheet-meta-grid">
                  <div className="meta-box">
                    <label>Origine / Race</label>
                    <input 
                      type="text" 
                      value={customData.race}
                      onChange={(e) => setCustomData({...customData, race: e.target.value})}
                      placeholder="Humain..."
                    />
                  </div>
                  <div className="meta-box">
                    <label>Voie / Classe</label>
                    <input 
                      type="text" 
                      value={customData.class}
                      onChange={(e) => setCustomData({...customData, class: e.target.value})}
                      placeholder="Guerrier..."
                    />
                  </div>
                  <div className="meta-box">
                    <label>Niveau</label>
                    <div className="meta-value">1</div>
                  </div>
                </div>
              </div>

              {/* MAIN CONTENT AREA */}
              <div className="sheet-body">
                {/* LEFT SIDEBAR - STATS */}
                <div className="sheet-stats-sidebar">
                  {Object.entries(customData.stats).map(([stat, val], i) => {
                    const mod = Math.floor((val - 10) / 2);
                    return (
                      <motion.div 
                        key={stat} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="sheet-stat-box"
                      >
                        <label>{stat.toUpperCase()}</label>
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
                        />
                        <div className="stat-mod">{mod >= 0 ? `+${mod}` : mod}</div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* CENTRAL CONTENT - COMBAT & INFO */}
                <div className="sheet-main-content">
                  <div className="combat-stats-row">
                    <div className="combat-box ac">
                      <label>Armure (CA)</label>
                      <div className="val">{10 + Math.floor((customData.stats.dex - 10) / 2)}</div>
                    </div>
                    <div className="combat-box init">
                      <label>Initiative</label>
                      <div className="val">
                        {Math.floor((customData.stats.dex - 10) / 2) >= 0 ? `+` : ''}
                        {Math.floor((customData.stats.dex - 10) / 2)}
                      </div>
                    </div>
                    <div className="combat-box speed">
                      <label>Vitesse</label>
                      <div className="val">30ft</div>
                    </div>
                    <div className="combat-box hp-max">
                      <label>Points de Vie</label>
                      <div className="hp-indicator">
                        <span className="text-gold">{10 + Math.floor((customData.stats.con - 10) / 2)}</span>
                        <span className="mx-2 opacity-20">/</span>
                        <span className="opacity-40">{10 + Math.floor((customData.stats.con - 10) / 2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sheet-description-area">
                    <div className="info-grid">
                      <div className="oracle-sub-field">
                        <label>Âge</label>
                        <input 
                          type="text" 
                          value={customData.age}
                          onChange={(e) => setCustomData({...customData, age: e.target.value})}
                          placeholder="25 cycles..."
                        />
                      </div>
                      <div className="oracle-sub-field">
                        <label>Sexe / Genre</label>
                        <input 
                          type="text" 
                          value={customData.gender}
                          onChange={(e) => setCustomData({...customData, gender: e.target.value})}
                          placeholder="Féminin..."
                        />
                      </div>
                    </div>

                    <div className="oracle-sub-field mt-6">
                      <label>Apparence & Traits Distinctifs</label>
                      <textarea 
                        value={customData.appearance}
                        onChange={(e) => setCustomData({...customData, appearance: e.target.value})}
                        placeholder="Une cicatrice sur l'œil gauche, une armure de cuir bouilli..."
                        className="sheet-textarea"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="sheet-footer">
                <div className="pool-indicator">
                  <span className="label">Réserve du Creuset</span>
                  <div className={`value ${72 - Object.values(customData.stats).reduce((a,b)=>a+b,0) < 0 ? 'text-red-500' : ''}`}>
                    {72 - Object.values(customData.stats).reduce((a,b)=>a+b,0)}
                  </div>
                </div>
                
                <button 
                  onClick={handleGenerateDVC}
                  disabled={Object.values(customData.stats).reduce((a,b)=>a+b,0) > 72 || !customData.name}
                  className="btn-invoke-hero"
                >
                  <InfinityIcon size={18} className="mr-3" />
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
              className="text-center py-10"
            >
              <div className="max-w-4xl mx-auto">
                <span className="text-gold text-[9px] uppercase tracking-[0.5em] opacity-40">Vision de l'Oracle</span>
                
                <div className="flex flex-col md:flex-row items-center gap-12 mt-12 mb-16">
                  {portraitUrl && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full md:w-1/2 aspect-square rounded-lg overflow-hidden border border-gold/20 shadow-[0_0_50px_rgba(212,175,55,0.1)]"
                    >
                      <img src={portraitUrl} alt="Portrait du Héros" className="w-full h-full object-cover" />
                    </motion.div>
                  )}
                  
                  <div className="flex-1 text-left">
                    <p className="serif text-3xl italic leading-relaxed text-white/90">
                      "{dvc}"
                    </p>
                  </div>
                </div>
                
                <div className="review-actions">
                   <button 
                     onClick={() => setStep('details')} 
                     className="btn-secondary-architect"
                   >
                     RETOURNER AU CREUSET
                   </button>
                   <button 
                    onClick={handleSave}
                    className="btn-architect"
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
