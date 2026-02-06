import { motion } from 'framer-motion'
import { DangerCircle } from '@solar-icons/react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

/**
 * ErrorState — состояние ошибки с иконкой DangerCircle
 * и кнопкой "Повторить".
 */
export default function ErrorState({
  message = 'Не удалось загрузить данные',
  onRetry,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        textAlign: 'center',
        padding: '40px 16px',
        color: '#9CA3AF',
      }}
    >
      <p style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
        <DangerCircle size={48} weight="BoldDuotone" />
      </p>
      <p style={{ marginBottom: 16 }}>{message}</p>
      {onRetry && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onRetry}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            fontSize: '0.9em',
            fontWeight: 600,
            background: '#1F2937',
            color: '#F9FAFB',
            border: '1.5px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
          }}
        >
          🔄 Повторить
        </motion.button>
      )}
    </motion.div>
  )
}
