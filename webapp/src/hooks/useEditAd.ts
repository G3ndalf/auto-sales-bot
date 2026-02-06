/**
 * useEditAd.ts — Общий хук для логики редактирования объявлений
 *
 * Абстрагирует загрузку, сохранение, навигацию и состояния UI
 * для EditCarAd и EditPlateAd.
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useBackButton } from './useBackButton'

export interface UseEditAdOptions<T> {
  /** Тип объявления для отладки/логов */
  adType: 'car' | 'plate'
  /** Загрузка данных объявления по ID */
  loadAd: (id: number) => Promise<T>
  /** Сохранение изменений */
  updateAd: (id: number, data: Record<string, unknown>, isAdmin: boolean) => Promise<unknown>
}

export interface UseEditAdResult<T> {
  /** ID объявления из URL */
  id: string | undefined
  /** Режим админа (?admin=true) */
  isAdmin: boolean
  /** Загрузка данных */
  loading: boolean
  /** Отправка формы */
  submitting: boolean
  /** Успешно сохранено */
  saved: boolean
  /** Ошибки формы */
  formErrors: string[]
  /** Оригинальные данные объявления */
  originalData: T | null
  /** Ref для скролла к ошибкам */
  errorsRef: React.RefObject<HTMLDivElement | null>
  /** Обработчик сохранения */
  handleSubmit: (adData: Record<string, unknown>) => Promise<void>
  /** Установка ошибок */
  setFormErrors: React.Dispatch<React.SetStateAction<string[]>>
}

export function useEditAd<T>({
  loadAd,
  updateAd,
}: UseEditAdOptions<T>): UseEditAdResult<T> {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  /** Режим админа — если ?admin=true */
  const isAdmin = searchParams.get('admin') === 'true'

  /** Назад ведёт на "Мои объявления" или админку */
  useBackButton(isAdmin ? '/admin-panel' : '/my-ads')

  // ===== Состояние UI =====
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [originalData, setOriginalData] = useState<T | null>(null)
  const errorsRef = useRef<HTMLDivElement | null>(null)

  /**
   * Загружаем данные объявления при монтировании
   */
  useEffect(() => {
    if (!id) return

    loadAd(parseInt(id, 10))
      .then((data: T) => {
        setOriginalData(data)
      })
      .catch(() => {
        setFormErrors(['Не удалось загрузить объявление'])
      })
      .finally(() => setLoading(false))
  }, [id, loadAd])

  /**
   * Обработчик сохранения изменений
   */
  const handleSubmit = async (adData: Record<string, unknown>) => {
    if (!id) return

    setSubmitting(true)
    setFormErrors([])

    try {
      await updateAd(parseInt(id, 10), adData, isAdmin)
      setSaved(true)
      // После сохранения — возвращаемся к списку (админка или мои объявления)
      setTimeout(() => navigate(isAdmin ? '/admin-panel' : '/my-ads'), 1200)
    } catch (e: unknown) {
      setSubmitting(false)
      setFormErrors([e instanceof Error ? e.message : 'Ошибка сохранения'])
      setTimeout(() => {
        errorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
    }
  }

  return {
    id,
    isAdmin,
    loading,
    submitting,
    saved,
    formErrors,
    originalData,
    errorsRef,
    handleSubmit,
    setFormErrors,
  }
}
