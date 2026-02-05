/**
 * DuplicateWarning.tsx — Экран предупреждения о дубликате объявления.
 *
 * Используется в: CreateCarAd, CreatePlateAd.
 * Bounce-in + shake анимация иконки предупреждения.
 */

import { motion } from 'framer-motion'
import { DangerTriangle } from '@solar-icons/react'

interface DuplicateWarningProps {
  /** Вернуться к форме */
  onBack: () => void
  /** Отправить с force=true */
  onForce: () => void
  /** Идёт отправка */
  submitting: boolean
}

export default function DuplicateWarning({ onBack, onForce, submitting }: DuplicateWarningProps) {
  return (
    <div className="form-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3 p-4"
      >
        {/* Shake-анимация иконки */}
        <motion.div
          animate={{ x: [0, -8, 8, -8, 8, 0] }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <DangerTriangle size={48} weight="BoldDuotone" style={{ color: '#F59E0B' }} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="text-[1.3em] text-[#F59E0B]"
        >
          Похожее объявление уже существует
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="text-[#9CA3AF] max-w-[280px] leading-normal"
        >
          Вы уже подавали похожее объявление за последние 7 дней.
          Возможно, стоит отредактировать существующее.
        </motion.p>

        <div className="flex gap-3 mt-4">
          <button className="btn bg-[#1F2937] text-[#F9FAFB]" onClick={onBack}>
            ← Назад
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="btn btn-gradient"
            onClick={onForce}
            disabled={submitting}
          >
            {submitting ? 'Отправка...' : 'Всё равно опубликовать'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
