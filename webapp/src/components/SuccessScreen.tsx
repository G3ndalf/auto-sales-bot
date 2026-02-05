/**
 * SuccessScreen.tsx — Экран успешной отправки объявления.
 *
 * Используется в: CreateCarAd, CreatePlateAd.
 * Scale-up анимация галочки + fade-in текста.
 */

import { motion } from 'framer-motion'
import { CheckCircle } from '@solar-icons/react'

interface SuccessScreenProps {
  /** Объявление опубликовано (с фото) или на модерации */
  published: boolean
  /** Hash для навигации "В каталог" (например '#/cars' или '#/plates') */
  catalogHash: string
}

export default function SuccessScreen({ published, catalogHash }: SuccessScreenProps) {
  return (
    <div className="form-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3 p-4"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.15 }}
          style={{ filter: 'drop-shadow(0 4px 16px rgba(245, 158, 11, 0.4))' }}
        >
          <CheckCircle size={64} weight="BoldDuotone" style={{ color: '#F59E0B' }} />
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-[1.4em]"
        >
          {published ? 'Объявление опубликовано!' : 'Отправлено на модерацию!'}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.3 }}
          className="text-[#9CA3AF]"
        >
          {published ? 'Ваше объявление уже в каталоге' : 'Мы проверим и опубликуем'}
        </motion.p>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.3 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary mt-4"
          onClick={() => { window.location.hash = catalogHash }}
        >
          В каталог
        </motion.button>
      </motion.div>
    </div>
  )
}
