import { motion } from 'framer-motion'

export default function LoreCard({ title, description, onSelect, onRefine, onReroll, isSelected }) {
  return (
    <motion.div 
      className={`lore-card ${isSelected ? 'selected' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
    >
      <h4>{title}</h4>
      <p>{description}</p>
      
      <div className="lore-card-actions">
        <button className="btn-mini primary" onClick={onSelect}>GARDER</button>
        <button className="btn-mini" onClick={onRefine}>AJUSTER</button>
        <button className="btn-mini" onClick={onReroll}>REROLL</button>
      </div>
    </motion.div>
  )
}
