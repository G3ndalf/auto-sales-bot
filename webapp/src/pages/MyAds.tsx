/**
 * MyAds.tsx — Страница "Мои объявления"
 *
 * Показывает все объявления текущего пользователя с табами "Авто" / "Номера".
 * Каждая карточка содержит фото, название, цену, статус-бейдж и кнопки
 * редактирования/удаления.
 *
 * Анимации: stagger карточки, pulse бейдж «На модерации», whileTap кнопки,
 * мягкий transition табов
 *
 * API: GET /api/user/{telegram_id}/ads → {cars: UserAd[], plates: UserAd[]}
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api, getUserId } from '../api'
import type { UserAd } from '../api'
import { useBackButton } from '../hooks/useBackButton'
import { SkeletonList } from '../components/Skeleton'
import { ClipboardList, Garage, Hashtag, Pen, Tag, TrashBinMinimalistic, CheckCircle, ClockCircle, CloseCircle } from '@solar-icons/react'

/** Тип текущего таба */
type Tab = 'cars' | 'plates'

/**
 * Конфигурация бейджей статусов:
 * - pending (На проверке) — оранжевый
 * - approved (Активно) — зелёный
 * - rejected (Отклонено) — красный
 */
const STATUS_CONFIG: Record<string, { label: string; icon: JSX.Element; bg: string; color: string }> = {
  pending: { label: 'На проверке', icon: <ClockCircle size={14} weight="BoldDuotone" />, bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  approved: { label: 'Активно', icon: <CheckCircle size={14} weight="BoldDuotone" />, bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
  rejected: { label: 'Отклонено', icon: <CloseCircle size={14} weight="BoldDuotone" />, bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
  sold: { label: 'Продано', icon: <Tag size={14} weight="BoldDuotone" />, bg: 'rgba(139,92,246,0.15)', color: '#8B5CF6' },
}

/* Stagger-контейнер для списка карточек */
const listContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
}

/* Элемент списка — fade-in + slide-up */
const listItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
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

      {/* Состояние загрузки */}
      {loading && <SkeletonList count={3} />}

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
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#9CA3AF' }}>
          <div style={{ marginBottom: 12 }}>
            {tab === 'cars' ? <Garage size={48} weight="BoldDuotone" /> : <Hashtag size={48} weight="BoldDuotone" />}
          </div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>Нет объявлений</div>
          <div style={{ fontSize: 14 }}>
            {tab === 'cars'
              ? 'Подайте объявление о продаже авто'
              : 'Подайте объявление о продаже номера'}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(tab === 'cars' ? '/car/new' : '/plate/new')}
            style={{ marginTop: 16, padding: '10px 24px', border: 'none', borderRadius: 10, background: '#F59E0B', color: '#0B0F19', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            + Подать объявление
          </motion.button>
        </div>
      )}

      {/* Карточки объявлений — stagger fade-in + slide-up */}
      <AnimatePresence>
        {!loading && !error && currentAds.length > 0 && (
          <motion.div
            key={tab}
            className="ads-list"
            variants={listContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            {currentAds.map((ad, i) => {
              const status = STATUS_CONFIG[ad.status] || STATUS_CONFIG.pending
              const title = (ad as unknown as Record<string, string>).title
                || (ad.ad_type === 'car'
                  ? `${ad.brand || ''} ${ad.model || ''}`.trim() || 'Автомобиль'
                  : ad.plate_number || 'Номер')

              return (
                <motion.div
                  key={`${ad.ad_type}-${ad.id}`}
                  variants={listItem}
                  
                  style={{ background: 'var(--section-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}
                >
                  {/* Верхняя часть: фото 90×90 + инфо (как в каталоге) */}
                  <div style={{ display: 'flex', gap: 12, padding: 10 }}>
                    {/* Фото — квадрат с закруглёнными углами */}
                    <div className="ad-card-photo">
                      {ad.photo ? (
                        <img src={api.photoUrl(ad.photo)} alt={title} loading="lazy" />
                      ) : (
                        <div className="no-photo">
                          {ad.ad_type === 'car' ? <Garage size={16} weight="BoldDuotone" /> : <Hashtag size={16} weight="BoldDuotone" />}
                        </div>
                      )}
                    </div>

                    {/* Текстовая информация */}
                    <div className="ad-card-info">
                      <div className="ad-card-title">{title}</div>
                      <div className="ad-card-price">{formatPrice(ad.price)}</div>
                      <div className="ad-card-location">📍 {ad.city}</div>
                      {/* Бейдж статуса — мягкий pulse для «На модерации» */}
                      <motion.span
                        animate={ad.status === 'pending' ? { opacity: [1, 0.6, 1] } : {}}
                        transition={ad.status === 'pending' ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                        style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 6,
                          fontSize: 12, fontWeight: 600, alignSelf: 'flex-start',
                          backgroundColor: status.bg, color: status.color,
                        }}
                      >
                        {status.icon} {status.label}
                      </motion.span>
                    </div>
                  </div>

                  {/* Кнопки действий — whileTap {{ scale: 0.9 }} */}
                  <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(ad.ad_type, ad.id)}
                      style={{ flex: 1, padding: 10, border: 'none', background: 'transparent', color: '#F59E0B', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRight: '1px solid var(--border)' }}
                    >
                      <Pen size={14} weight="BoldDuotone" /> Изменить
                    </motion.button>

                    {ad.status === 'approved' && (
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => markAsSold(ad.ad_type, ad.id)}
                        style={{ flex: 1, padding: 10, border: 'none', background: 'transparent', color: '#8B5CF6', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRight: '1px solid var(--border)' }}
                      >
                        <Tag size={14} weight="BoldDuotone" /> Продано
                      </motion.button>
                    )}

                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(ad.ad_type, ad.id)}
                      style={{ flex: 1, padding: 10, border: 'none', background: 'transparent', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      <TrashBinMinimalistic size={14} weight="BoldDuotone" /> Удалить
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
