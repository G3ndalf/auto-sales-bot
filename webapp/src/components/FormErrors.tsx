/**
 * FormErrors.tsx — Блок ошибок формы с анимацией slide-down.
 *
 * Используется в: CreateCarAd, CreatePlateAd, EditCarAd, EditPlateAd.
 * Заменяет 4 одинаковых inline-реализации.
 */

import { forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Refresh } from '@solar-icons/react'

interface FormErrorsProps {
  /** Список текстов ошибок */
  errors: string[]
  /** Тип ошибки (влияет на стиль) */
  errorType?: 'validation' | 'rate_limit' | 'duplicate' | 'generic' | null
}

const FormErrors = forwardRef<HTMLDivElement, FormErrorsProps>(
  ({ errors, errorType }, ref) => {
    return (
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            key="form-errors"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div
              ref={ref}
              className={`form-errors ${errorType === 'rate_limit' ? 'form-errors--rate-limit' : ''}`}
            >
              {errorType === 'rate_limit' ? (
                <div className="form-errors__title">
                  <Refresh size={16} weight="BoldDuotone" className="animate-spin" /> {errors[0]}
                </div>
              ) : (
                <>
                  <div className="form-errors__title">Исправьте ошибки:</div>
                  <ul className="form-errors__list">
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  },
)

FormErrors.displayName = 'FormErrors'
export default FormErrors
