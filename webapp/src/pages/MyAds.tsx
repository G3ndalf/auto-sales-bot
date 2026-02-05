/**
 * MyAds.tsx — Страница "Мои объявления"
 *
 * Показывает все объявления текущего пользователя с табами "Авто" / "Номера".
 * Каждая карточка содержит фото, название, цену, статус-бейдж и кнопки
 * редактирования/удаления.
 *
 * API: GET /api/user/{telegram_id}/ads → {cars: UserAd[], plates: UserAd[]}
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api, getUserId } from '../api'
import type { UserAd } from '../api'
import { useBackButton } from '../hooks/useBackButton'

/** Тип текущего таба */
type Tab = 'cars' | 'plates'

/**
 * Конфигурация бейджей статусов:
 * - pending (На проверке) — оранжевый
 * - approved (Активно) — зелёный
 * - rejected (Отклонено) — красный
 */
const STATUS_CONFIG: Record<string, { label: string; emoji: string; bg: string; color: string }> = {
  pending: { label: 'На проверке', emoji: '🟡', bg: '#FFA50033', color: '#FFA500' },
  approved: { label: 'Активно', emoji: '🟢', bg: '#4CAF5033', color: '#4CAF50' },
  rejected: { label: 'Отклонено', emoji: '🔴', bg: '#F4433633', color: '#F44336' },
  sold: { label: 'Продано', emoji: '🟣', bg: '#9C27B033', color: '#9C27B0' },
}

export default function MyAds() {
  /** Навигация назад по BackButton ведёт на главную */
  useBackButton('/')
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('cars')
  const [cars, setCars] = useState<UserAd[]>([])
  const [plates, setPlates] = useState<UserAd[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** Загрузка объявлений пользователя */
  const loadAds = useCallback(async () => {
    const uid = getUserId()
    if (!uid) {
      setError('Не удалось определить пользователя')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await api.getUserAds(uid)
      // API возвращает cars[] и plates[] отдельно, но без поля ad_type.
      // Проставляем ad_type вручную — он нужен для навигации на edit/delete.
      setCars((data.cars || []).map(ad => ({ ...ad, ad_type: 'car' as const })))
      setPlates((data.plates || []).map(ad => ({ ...ad, ad_type: 'plate' as const })))
    } catch {
      setError('Ошибка загрузки объявлений')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAds()
  }, [loadAds])

  /** Пометить объявление как проданное */
  const markAsSold = async (adType: string, adId: number) => {
    const uid = getUserId()
    if (!uid) return
    try {
      await fetch(`/api/ads/${adType}/${adId}/sold?user_id=${uid}`, { method: 'POST' })
      // Перезагрузить список
      loadAds()
    } catch {}
  }

  /**
   * Удаление объявления с подтверждением.
   * После успешного удаления — перезагружаем список.
   */
  const handleDelete = async (adType: 'car' | 'plate', adId: number) => {
    if (!window.confirm('Удалить объявление?')) return

    try {
      await api.deleteAd(adType, adId)
      // Обновляем список после удаления
      await loadAds()
    } catch {
      alert('Ошибка при удалении. Попробуйте ещё раз.')
    }
  }

  /** Переход на страницу редактирования */
  const handleEdit = (adType: 'car' | 'plate', adId: number) => {
    navigate(`/${adType}/${adId}/edit`)
  }

  /** Форматирование цены с разделителями тысяч */
  const formatPrice = (price: number): string => {
    return price.toLocaleString('ru-RU') + ' ₽'
  }

  /** Текущий список объявлений (в зависимости от таба) */
  const currentAds = tab === 'cars' ? cars : plates

  // ===== Рендер =====

  return (
    <div className="p-4 pb-[100px] min-h-screen bg-[var(--tg-theme-bg-color)]">
      {/* Заголовок страницы */}
      <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)] m-0 mb-4 text-center">
        📋 Мои объявления
      </h1>

      {/* Табы: Авто / Номера (аналогично Catalog) */}
      <div className="flex gap-2 mb-4 bg-[var(--tg-theme-secondary-bg-color)] rounded-xl p-1">
        <button
          onClick={() => setTab('cars')}
          className={`flex-1 p-2.5 border-none rounded-[10px] text-sm font-semibold cursor-pointer transition-all duration-200 ${
            tab === 'cars'
              ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
              : 'bg-transparent text-[var(--tg-theme-hint-color)]'
          }`}
        >
          🚗 Авто {cars.length > 0 && `(${cars.length})`}
        </button>
        <button
          onClick={() => setTab('plates')}
          className={`flex-1 p-2.5 border-none rounded-[10px] text-sm font-semibold cursor-pointer transition-all duration-200 ${
            tab === 'plates'
              ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
              : 'bg-transparent text-[var(--tg-theme-hint-color)]'
          }`}
        >
          🔢 Номера {plates.length > 0 && `(${plates.length})`}
        </button>
      </div>

      {/* Состояние загрузки */}
      {loading && (
        <div className="text-center py-10 text-[var(--tg-theme-hint-color)] text-base">
          Загрузка...
        </div>
      )}

      {/* Ошибка загрузки */}
      {error && !loading && (
        <div className="text-center py-10 px-4 text-[#F44336] text-sm">
          {error}
          <br />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={loadAds}
            className="mt-3 px-5 py-2 border-none rounded-lg bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] text-sm cursor-pointer"
          >
            Повторить
          </motion.button>
        </div>
      )}

      {/* Пустой список */}
      {!loading && !error && currentAds.length === 0 && (
        <div className="text-center py-10 px-4 text-[var(--tg-theme-hint-color)]">
          <div className="text-5xl mb-3">
            {tab === 'cars' ? '🚗' : '🔢'}
          </div>
          <div className="text-base mb-2">
            Нет объявлений
          </div>
          <div className="text-sm">
            {tab === 'cars'
              ? 'Подайте объявление о продаже авто'
              : 'Подайте объявление о продаже номера'}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(tab === 'cars' ? '/car/new' : '/plate/new')}
            className="mt-4 px-6 py-2.5 border-none rounded-[10px] bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] text-sm font-semibold cursor-pointer"
          >
            + Подать объявление
          </motion.button>
        </div>
      )}

      {/* Карточки объявлений */}
      {!loading && !error && currentAds.length > 0 && (
        <div className="flex flex-col gap-3">
          {currentAds.map((ad, i) => {
            /** Конфигурация бейджа для текущего статуса */
            const status = STATUS_CONFIG[ad.status] || STATUS_CONFIG.pending

            /** Название: из поля title (API возвращает "brand model" для авто, plate_number для номеров) */
            const title = (ad as unknown as Record<string, string>).title
              || (ad.ad_type === 'car'
                ? `${ad.brand || ''} ${ad.model || ''}`.trim() || 'Автомобиль'
                : ad.plate_number || 'Номер')

            return (
              <motion.div
                key={`${ad.ad_type}-${ad.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="bg-[var(--tg-theme-secondary-bg-color)] rounded-xl overflow-hidden"
              >
                {/* Верхняя часть карточки: фото + информация */}
                <div className="flex gap-3 p-3">
                  {/* Фото или placeholder */}
                  <div className="w-20 h-20 rounded-[10px] bg-[var(--tg-theme-bg-color)] shrink-0 flex items-center justify-center overflow-hidden">
                    {ad.photo ? (
                      <img
                        src={api.photoUrl(ad.photo)}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      /* Emoji-заглушка если фото нет */
                      <span className="text-[32px]">
                        {ad.ad_type === 'car' ? '🚗' : '🔢'}
                      </span>
                    )}
                  </div>

                  {/* Текстовая информация */}
                  <div className="flex-1 min-w-0">
                    {/* Название объявления */}
                    <div className="text-base font-semibold text-[var(--tg-theme-text-color)] mb-1 truncate">
                      {title}
                    </div>

                    {/* Цена */}
                    <div className="text-[15px] font-bold text-[var(--tg-theme-text-color)] mb-1.5">
                      {formatPrice(ad.price)}
                    </div>

                    {/* Город */}
                    <div className="text-[13px] text-[var(--tg-theme-hint-color)] mb-1.5">
                      📍 {ad.city}
                    </div>

                    {/* Бейдж статуса */}
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold"
                      style={{ backgroundColor: status.bg, color: status.color }}
                    >
                      {status.emoji} {status.label}
                    </span>
                  </div>
                </div>

                {/* Кнопки действий */}
                <div className="flex border-t border-[var(--tg-theme-bg-color)]">
                  {/* Кнопка "Редактировать" */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEdit(ad.ad_type, ad.id)}
                    className="flex-1 p-2.5 border-none bg-transparent text-[var(--tg-theme-button-color)] text-sm font-semibold cursor-pointer border-r border-r-[var(--tg-theme-bg-color)]"
                  >
                    ✏️ Редактировать
                  </motion.button>

                  {/* Кнопка "Продано" — только для активных объявлений */}
                  {ad.status === 'approved' && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => markAsSold(ad.ad_type, ad.id)}
                      className="flex-1 p-2.5 border-none bg-transparent text-[#9C27B0] text-sm font-semibold cursor-pointer border-r border-r-[var(--tg-theme-bg-color)]"
                    >
                      🏷️ Продано
                    </motion.button>
                  )}

                  {/* Кнопка "Удалить" */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(ad.ad_type, ad.id)}
                    className="flex-1 p-2.5 border-none bg-transparent text-[#F44336] text-sm font-semibold cursor-pointer"
                  >
                    🗑 Удалить
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
