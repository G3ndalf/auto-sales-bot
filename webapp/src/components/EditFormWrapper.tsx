/**
 * EditFormWrapper.tsx — Общая обёртка для форм редактирования объявлений
 *
 * Содержит:
 * - Loading spinner
 * - Success экран с анимацией
 * - Not found состояние
 * - Предупреждение о модерации
 * - Отображение ошибок формы
 * - Кнопка сохранения
 */

import { forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, DangerTriangle, Refresh, Pen, Diskette } from '@solar-icons/react'
import FormErrors from './FormErrors'

interface EditFormWrapperProps {
  /** Заголовок формы (например, "Авто" или "Номер") */
  title: string
  /** Загрузка данных */
  loading: boolean
  /** Успешно сохранено */
  saved: boolean
  /** Объявление не найдено */
  notFound: boolean
  /** Режим админа */
  isAdmin: boolean
  /** Ошибки формы */
  formErrors: string[]
  /** Отправка формы */
  submitting: boolean
  /** Все обязательные поля заполнены */
  allRequired: boolean
  /** Обработчик сохранения */
  onSubmit: () => void
  /** Содержимое формы */
  children: React.ReactNode
}

const EditFormWrapper = forwardRef<HTMLDivElement, EditFormWrapperProps>(
  function EditFormWrapper(
    {
      title,
      loading,
      saved,
      notFound,
      formErrors,
      submitting,
      allRequired,
      onSubmit,
      children,
    },
    errorsRef
  ) {
    // ===== Загрузка =====
    if (loading) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            color: '#6b7280',
            fontSize: '16px',
            backgroundColor: '#f5f5f5',
          }}
        >
          <Refresh
            size={16}
            weight="BoldDuotone"
            className="animate-spin"
          />{' '}
          Загрузка объявления...
        </div>
      )
    }

    // ===== Не найдено =====
    if (notFound) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            color: '#ef4444',
            fontSize: '16px',
            backgroundColor: '#f5f5f5',
          }}
        >
          Объявление не найдено
        </div>
      )
    }

    // ===== Рендер формы =====
    return (
      <div className="form-page">
        <h1>
          <Pen
            size={18}
            weight="BoldDuotone"
            style={{ display: 'inline', verticalAlign: 'middle' }}
          />{' '}
          Редактирование — {title}
        </h1>

        {/* ⚠️ Предупреждение о повторной модерации */}
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '10px',
            backgroundColor: '#FFA50022',
            border: '1px solid #FFA50044',
            color: '#FFA500',
            fontSize: '13px',
            lineHeight: '1.4',
          }}
        >
          <DangerTriangle
            size={16}
            weight="BoldDuotone"
            style={{ display: 'inline', verticalAlign: 'middle' }}
          />{' '}
          После редактирования объявление будет отправлено на повторную модерацию
        </div>

        {/* Ошибки формы */}
        <FormErrors ref={errorsRef} errors={formErrors} />

        {/* Содержимое формы (секции с полями) */}
        {children}

        {/* Кнопка сохранения */}
        <div className="submit-section">
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.p
                key="saved"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{
                  textAlign: 'center',
                  color: '#4CAF50',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                <CheckCircle
                  size={16}
                  weight="BoldDuotone"
                  style={{
                    display: 'inline',
                    verticalAlign: 'middle',
                    color: '#4CAF50',
                  }}
                />{' '}
                Изменения сохранены! Объявление отправлено на модерацию.
              </motion.p>
            ) : (
              <motion.button
                key="submit"
                whileTap={{ scale: 0.95 }}
                className={`btn btn-gradient ${!allRequired ? 'btn-disabled' : ''}`}
                onClick={onSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  'Сохранение...'
                ) : (
                  <>
                    <Diskette size={16} weight="BoldDuotone" /> Сохранить изменения
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }
)

export default EditFormWrapper
