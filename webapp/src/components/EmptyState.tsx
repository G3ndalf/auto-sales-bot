import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon?: React.ReactNode
  message: string
}

/**
 * EmptyState — пустое состояние по центру с иконкой и сообщением.
 * Анимация fade-in.
 */
export default function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
        color: '#9CA3AF',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div style={{ marginBottom: 12, opacity: 0.6 }}>
          {icon}
        </div>
      )}
      <p style={{ margin: 0, fontSize: '1em', whiteSpace: 'pre-line' }}>{message}</p>
    </motion.div>
  )
}
