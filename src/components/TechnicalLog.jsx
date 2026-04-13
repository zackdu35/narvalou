import { motion } from 'framer-motion'

const logVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
}

export default function TechnicalLog({ logs }) {
  return (
    <div className="console-log">
      {logs.map((log, index) => (
        <motion.div 
          key={index}
          className={`console-entry ${log.type}`}
          variants={logVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3 }}
        >
          <span>[{log.type.toUpperCase()}]</span>
          <span>{log.message}</span>
        </motion.div>
      ))}
    </div>
  )
}
