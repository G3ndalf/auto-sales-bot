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
    <div style={{
      padding: '16px',
      paddingBottom: '100px', /* отступ для DockBar */
      minHeight: '100vh',
      backgroundColor: 'var(--tg-theme-bg-color)',
    }}>
      {/* Заголовок страницы */}
      <h1 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: 'var(--tg-theme-text-color)',
        margin: '0 0 16px 0',
        textAlign: 'center',
      }}>
        📋 Мои объявления
      </h1>

      {/* Табы: Авто / Номера (аналогично Catalog) */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        backgroundColor: 'var(--tg-theme-secondary-bg-color)',
        borderRadius: '12px',
        padding: '4px',
      }}>
        <button
          onClick={() => setTab('cars')}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            backgroundColor: tab === 'cars' ? 'var(--tg-theme-button-color)' : 'transparent',
            color: tab === 'cars' ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-hint-color)',
          }}
        >
          🚗 Авто {cars.length > 0 && `(${cars.length})`}
        </button>
        <button
          onClick={() => setTab('plates')}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            backgroundColor: tab === 'plates' ? 'var(--tg-theme-button-color)' : 'transparent',
            color: tab === 'plates' ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-hint-color)',
          }}
        >
          🔢 Номера {plates.length > 0 && `(${plates.length})`}
        </button>
      </div>

      {/* Состояние загрузки */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '40px 0',
          color: 'var(--tg-theme-hint-color)',
          fontSize: '16px',
        }}>
          Загрузка...
        </div>
      )}

      {/* Ошибка загрузки */}
      {error && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '40px 16px',
          color: '#F44336',
          fontSize: '14px',
        }}>
          {error}
          <br />
          <button
            onClick={loadAds}
            style={{
              marginTop: '12px',
              padding: '8px 20px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Повторить
          </button>
        </div>
      )}

      {/* Пустой список */}
      {!loading && !error && currentAds.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px 16px',
          color: 'var(--tg-theme-hint-color)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {tab === 'cars' ? '🚗' : '🔢'}
          </div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            Нет объявлений
          </div>
          <div style={{ fontSize: '14px' }}>
            {tab === 'cars'
              ? 'Подайте объявление о продаже авто'
              : 'Подайте объявление о продаже номера'}
          </div>
          <button
            onClick={() => navigate(tab === 'cars' ? '/car/new' : '/plate/new')}
            style={{
              marginTop: '16px',
              padding: '10px 24px',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Подать объявление
          </button>
        </div>
      )}

      {/* Карточки объявлений */}
      {!loading && !error && currentAds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentAds.map((ad) => {
            /** Конфигурация бейджа для текущего статуса */
            const status = STATUS_CONFIG[ad.status] || STATUS_CONFIG.pending

            /** Название: из поля title (API возвращает "brand model" для авто, plate_number для номеров) */
            const title = (ad as unknown as Record<string, string>).title
              || (ad.ad_type === 'car'
                ? `${ad.brand || ''} ${ad.model || ''}`.trim() || 'Автомобиль'
                : ad.plate_number || 'Номер')

            return (
              <div
                key={`${ad.ad_type}-${ad.id}`}
                style={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                {/* Верхняя часть карточки: фото + информация */}
                <div style={{ display: 'flex', gap: '12px', padding: '12px' }}>
                  {/* Фото или placeholder */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--tg-theme-bg-color)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {ad.photo ? (
                      <img
                        src={api.photoUrl(ad.photo)}
                        alt={title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      /* Emoji-заглушка если фото нет */
                      <span style={{ fontSize: '32px' }}>
                        {ad.ad_type === 'car' ? '🚗' : '🔢'}
                      </span>
                    )}
                  </div>

                  {/* Текстовая информация */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Название объявления */}
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--tg-theme-text-color)',
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {title}
                    </div>

                    {/* Цена */}
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--tg-theme-text-color)',
                      marginBottom: '6px',
                    }}>
                      {formatPrice(ad.price)}
                    </div>

                    {/* Город */}
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--tg-theme-hint-color)',
                      marginBottom: '6px',
                    }}>
                      📍 {ad.city}
                    </div>

                    {/* Бейдж статуса */}
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: status.bg,
                      color: status.color,
                    }}>
                      {status.emoji} {status.label}
                    </span>
                  </div>
                </div>

                {/* Кнопки действий */}
                <div style={{
                  display: 'flex',
                  borderTop: '1px solid var(--tg-theme-bg-color)',
                }}>
                  {/* Кнопка "Редактировать" */}
                  <button
                    onClick={() => handleEdit(ad.ad_type, ad.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--tg-theme-button-color)',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRight: '1px solid var(--tg-theme-bg-color)',
                    }}
                  >
                    ✏️ Редактировать
                  </button>

                  {/* Кнопка "Продано" — только для активных объявлений */}
                  {ad.status === 'approved' && (
                    <button
                      onClick={() => markAsSold(ad.ad_type, ad.id)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#9C27B0',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderRight: '1px solid var(--tg-theme-bg-color)',
                      }}
                    >
                      🏷️ Продано
                    </button>
                  )}

                  {/* Кнопка "Удалить" */}
                  <button
                    onClick={() => handleDelete(ad.ad_type, ad.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#F44336',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🗑 Удалить
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
