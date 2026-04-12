import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Orbit, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { db } from '../services/supabase'

export default function Auth({ onSession }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState(import.meta.env.VITE_LOGIN_TEST || '')
  const [password, setPassword] = useState(import.meta.env.VITE_PASSWORD_TEST || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        const { user } = await db.auth.signIn(email, password)
        onSession(user)
      } else {
        const { user } = await db.auth.signUp(email, password)
        onSession(user)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-overlay" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="auth-container"
      >
        <div className="auth-header">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
            style={{ marginBottom: '1.5rem', display: 'inline-block' }}
          >
            <Orbit size={48} strokeWidth={1} className="text-gold" />
          </motion.div>
          <h1>L'Oracle</h1>
          <p className="text-gold uppercase tracking-[0.5em] font-bold" style={{ fontSize: '9px', opacity: 0.5 }}>Maître du Jeu IA</p>
        </div>

        <div className="auth-card">
          <form onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label className="auth-label">Adresse Email</label>
              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon" size={18} />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-form-group">
              <label className="auth-label">Mot de Passe</label>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" size={18} />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="auth-error"
                >
                  <AlertCircle size={14} />
                  <span>Accès refusé : {error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={loading}
              className="btn-auth"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? "S'identifier" : "Créer un compte"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="auth-toggle">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="btn-toggle"
            >
              {isLogin ? "Nouveau ici ? S'inscrire" : "Déjà membre ? Se connecter"}
            </button>
          </div>
        </div>

        <div className="auth-footer">
          <p>
            En continuant, vous acceptez les conditions de l'Architecte.<br/>
            Une épopée immersive vous attend.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
