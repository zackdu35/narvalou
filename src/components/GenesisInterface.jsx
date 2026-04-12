import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function GenesisInterface({ isOpen, onClose }) {
  const [step, setStep] = useState('input')
  const [prompt, setPrompt] = useState('')

  const handleStartGenese = () => {
    if (!prompt.trim()) return
    setStep('generating')
    setTimeout(() => setStep('complete'), 3000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] architect-modal"
        >
          <button 
            onClick={onClose}
            className="btn-close-architect"
          >
            <X size={48} strokeWidth={1} />
          </button>

          {step === 'input' && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{ 
                width: '100%', 
                maxWidth: '900px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                textAlign: 'center' 
              }}
            >
              <h2 className="text-gold uppercase tracking-[0.5em] text-sm mb-12">Genèse d'un Monde</h2>
              
              <textarea 
                autoFocus
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décrivez l'Inimaginable..."
                className="architect-input"
                rows={1}
                style={{ height: 'auto', minHeight: '120px' }}
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

          {step === 'generating' && (
            <div className="flex flex-col items-center gap-8">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles size={64} className="text-gold" />
              </motion.div>
              <h2 className="text-white font-serif text-3xl tracking-widest animate-pulse">L'ARCHITECTE TISSE LA RÉALITÉ...</h2>
            </div>
          )}

          {step === 'complete' && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-12"
            >
              <h2 className="text-6xl text-gold font-serif">L'Univers est Né</h2>
              <p className="text-neutral-500 tracking-[0.2em] uppercase">Votre récit vous attend au creux du néant.</p>
              <button 
                onClick={onClose}
                className="btn-architect"
              >
                ÉVEILLÉ
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
