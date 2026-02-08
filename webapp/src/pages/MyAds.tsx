/**
 * MyAds.tsx — Страница "Мои объявления"
 *
 * Показывает все объявления текущего пользователя с табами "Авто" / "Номера".
 * Каждая карточка рендерится через общий компонент AdCard,
 * который включает фото, название, цену, статус-бейдж и кнопки действий.
 *
 * Анимации: stagger карточки (через listStagger из constants/animations),
 * pulse бейдж «На модерации» (внутри AdCard), мягкий transition табов.
 *
 * API: GET /api/user/{telegram_id}/ads → {cars: UserAd[], plates: UserAd[]}
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api, getUserId } from '../api'
import type { UserAd } from '../api'
import { useBackButton } from '../hooks/useBackButton'
import { ClipboardList, Garage, Hashtag } from '@solar-icons/react'
import { listStagger } from '../constants/animations'
import AdCard from '../components/AdCard'
import EmptyState from '../components/EmptyState'

/** Тип текущего таба */
type Tab = 'cars' | 'plates'

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

  /** Пометить объявление как проданное — с confirm + error handling */
  const markAsSold = async (adType: string, adId: number) => {
    if (!window.confirm('Отметить как проданное? Объявление будет снято с публикации.')) return
    const uid = getUserId()
    if (!uid) return
    try {
      const initData = window.Telegram?.WebApp?.initData
      const headers: Record<string, string> = {}
      if (initData) headers['X-Telegram-Init-Data'] = initData
      const res = await fetch(`/api/ads/${adType}/${adId}/sold?user_id=${uid}`, { method: 'POST', headers })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      loadAds()
    } catch {
      alert('Ошибка при отметке "Продано". Попробуйте ещё раз.')
    }
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

  /** Текущий список объявлений (в зависимости от таба) */
  const currentAds = tab === 'cars' ? cars : plates

  // ===== Рендер =====

  return (
    <div style={{ padding: '16px 0', paddingBottom: 100, minHeight: '100vh' }}>
      {/* Заголовок страницы */}
      <h1 style={{ fontSize: '1.4em', fontWeight: 800, margin: '0 0 16px', textAlign: 'center', padding: '0 16px' }}>
        <ClipboardList size={22} weight="BoldDuotone" /> Мои объявления
      </h1>

      {/* Табы: Авто / Номера — с мягким transition индикатора */}
      <div style={{ display: 'flex', gap: 0, background: '#111827', borderRadius: 12, padding: 4, margin: '0 12px 16px', position: 'relative' }}>
        {(['cars', 'plates'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: 10, border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: 'transparent',
              color: tab === t ? '#0B0F19' : '#9CA3AF',
              position: 'relative',
              zIndex: 1,
              transition: 'color 0.2s ease',
            }}
          >
            {t === 'cars' ? <><Garage size={16} weight="BoldDuotone" /> Авто</> : <><Hashtag size={16} weight="BoldDuotone" /> Номера</>}
            {(t === 'cars' ? cars : plates).length > 0 && ` (${(t === 'cars' ? cars : plates).length})`}
          </button>
        ))}
        {/* Анимированный индикатор активного таба */}
        <motion.div
          style={{
            position: 'absolute',
            top: 4,
            bottom: 4,
            width: 'calc(50% - 4px)',
            borderRadius: 10,
            background: '#F59E0B',
            zIndex: 0,
          }}
          animate={{ left: tab === 'cars' ? 4 : 'calc(50% + 0px)' }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      </div>

      {/* F8: Состояние загрузки — показываем текст вместо пустого экрана */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#9CA3AF', fontSize: 14 }}>
          Загрузка...
        </div>
      )}

      {/* Ошибка загрузки */}
      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#EF4444', fontSize: 14 }}>
          {error}
          <br />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={loadAds}
            style={{ marginTop: 12, padding: '8px 20px', border: 'none', borderRadius: 8, background: '#F59E0B', color: '#0B0F19', fontSize: 14, cursor: 'pointer' }}
          >
            Повторить
          </motion.button>
        </div>
      )}

      {/* Пустой список */}
      {!loading && !error && currentAds.length === 0 && (
        <div>
          <EmptyState
            icon={tab === 'cars' ? <Garage size={48} weight="BoldDuotone" /> : <Hashtag size={48} weight="BoldDuotone" />}
            message={tab === 'cars'
              ? 'Нет объявлений\nПодайте объявление о продаже авто'
              : 'Нет объявлений\nПодайте объявление о продаже номера'}
          />
          <div style={{ textAlign: 'center' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(tab === 'cars' ? '/car/new' : '/plate/new')}
              style={{ marginTop: 0, padding: '10px 24px', border: 'none', borderRadius: 10, background: '#F59E0B', color: '#0B0F19', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              + Подать объявление
            </motion.button>
          </div>
        </div>
      )}

      {/* Карточки объявлений — stagger fade-in + slide-up через AdCard */}
      <AnimatePresence>
        {!loading && !error && currentAds.length > 0 && (
          <motion.div
            key={tab}
            className="ads-list"
            variants={listStagger}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            {currentAds.map((ad) => (
              <AdCard
                key={`${ad.ad_type}-${ad.id}`}
                id={ad.id}
                adType={ad.ad_type}
                price={ad.price}
                city={ad.city}
                photo={ad.photo}
                viewCount={0}
                brand={ad.brand}
                model={ad.model}
                plateNumber={ad.plate_number}
                title={
                  ad.ad_type === 'car'
                    ? `${ad.brand || ''} ${ad.model || ''}`.trim() || 'Автомобиль'
                    : ad.plate_number || 'Номер'
                }
                status={ad.status}
                onEdit={['pending', 'approved'].includes(ad.status) ? () => handleEdit(ad.ad_type, ad.id) : undefined}
                onDelete={() => handleDelete(ad.ad_type, ad.id)}
                onMarkSold={ad.status === 'approved' ? () => markAsSold(ad.ad_type, ad.id) : undefined}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
