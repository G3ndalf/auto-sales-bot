/**
 * AdCard.tsx — Унифицированная карточка объявления.
 *
 * Используется в: CarsList, PlatesList, Favorites, MyAds.
 * Заменяет 4 разных inline-реализации карточки.
 *
 * Режимы:
 * - Каталог авто: фото + марка модель + год + детали + город + просмотры + цена
 * - Каталог номеров: plate-number-display + цена + город + просмотры
 * - Избранное: фото + title + город + просмотры + цена (оба типа)
 * - Мои объявления: фото + title + цена + город + статус-бейдж + кнопки действий
 */

import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Garage, Hashtag, MapPoint, Eye, Pen, Tag,
  TrashBinMinimalistic, ClockCircle, CheckCircle, CloseCircle,
} from '@solar-icons/react'
import { api } from '../api'
import { formatPrice } from '../utils/format'
import { listItem } from '../constants/animations'

/* ─── Конфигурация статус-бейджей (для MyAds) ─── */

const STATUS_CONFIG: Record<string, {
  label: string
  icon: React.ReactNode
  bg: string
  color: string
}> = {
  pending: {
    label: 'На проверке',
    icon: <ClockCircle size={14} weight="BoldDuotone" />,
    bg: 'rgba(245,158,11,0.15)',
    color: '#F59E0B',
  },
  approved: {
    label: 'Активно',
    icon: <CheckCircle size={14} weight="BoldDuotone" />,
    bg: 'rgba(16,185,129,0.15)',
    color: '#10B981',
  },
  rejected: {
    label: 'Отклонено',
    icon: <CloseCircle size={14} weight="BoldDuotone" />,
    bg: 'rgba(239,68,68,0.15)',
    color: '#EF4444',
  },
  sold: {
    label: 'Продано',
    icon: <Tag size={14} weight="BoldDuotone" />,
    bg: 'rgba(139,92,246,0.15)',
    color: '#8B5CF6',
  },
}

/* ─── Типы пропсов ─── */

interface AdCardProps {
  /** ID объявления */
  id: number
  /** Тип: авто или номер */
  adType: 'car' | 'plate'
  /** Цена в рублях */
  price: number
  /** Город */
  city: string
  /** file_id первого фото (null если нет фото) */
  photo: string | null
  /** Количество просмотров */
  viewCount: number

  /* ── Поля авто (только для adType='car') ── */
  brand?: string
  model?: string
  year?: number
  mileage?: number
  fuelType?: string
  transmission?: string

  /* ── Поля номера (только для adType='plate') ── */
  plateNumber?: string

  /* ── Общие override'ы ── */
  /** Заголовок (override для Favorites, MyAds) */
  title?: string

  /* ── Режим "Мои объявления" ── */
  status?: string
  onEdit?: () => void
  onDelete?: () => void
  onMarkSold?: () => void
}

/* ─── Компонент ─── */

export default function AdCard(props: AdCardProps) {
  const {
    id, adType, price, city, photo, viewCount,
    brand, model, year, mileage, fuelType, transmission,
    plateNumber, title, status, onEdit, onDelete, onMarkSold,
  } = props

  const navigate = useNavigate()
  const isMyAds = !!status
  const link = `/${adType}/${id}`

  /* Заголовок карточки */
  const displayTitle = title
    || (adType === 'car' ? `${brand || ''} ${model || ''}`.trim() || 'Автомобиль' : plateNumber || 'Номер')

  /* ── Рендер фото-блока (или plate-number-display) ── */
  const photoBlock = adType === 'plate' && !isMyAds ? (
    /* Номера в каталоге: специальный блок с номером */
    <div className="plate-number-display">{plateNumber}</div>
  ) : (
    /* Стандартный блок с фото (авто, избранное, мои) */
    <div className="ad-card-photo">
      {photo ? (
        <img src={api.photoUrl(photo)} alt={displayTitle} loading="lazy" />
      ) : (
        <div className="no-photo">
          {adType === 'car'
            ? <Garage size={24} weight="BoldDuotone" />
            : <Hashtag size={24} weight="BoldDuotone" />}
        </div>
      )}
    </div>
  )

  /* ── Рендер info-блока ── */
  const infoBlock = (
    <div className="ad-card-info">
      <div className="ad-card-title">{displayTitle}</div>

      {/* Год выпуска — только для авто в каталоге */}
      {adType === 'car' && year && !isMyAds && (
        <div className="ad-card-year">{year} г.</div>
      )}

      {/* Детали — только для авто в каталоге */}
      {adType === 'car' && !isMyAds && mileage !== undefined && (
        <div className="ad-card-details">
          {mileage.toLocaleString('ru-RU')} км • {transmission}
        </div>
      )}

      {/* Город + просмотры */}
      <div className="ad-card-location">
        <MapPoint size={14} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle' }} />
        {' '}{city}
        <span style={{
          color: '#9CA3AF', fontSize: '0.85em', marginLeft: 6,
          display: 'inline-flex', alignItems: 'center', gap: 2, verticalAlign: 'middle',
        }}>
          <Eye size={14} weight="BoldDuotone" /> {viewCount}
        </span>
      </div>

      {/* Цена */}
      <div className="ad-card-price">{formatPrice(price)}</div>

      {/* Статус-бейдж (только в MyAds) */}
      {status && STATUS_CONFIG[status] && (
        <motion.span
          animate={status === 'pending' ? { opacity: [1, 0.6, 1] } : {}}
          transition={status === 'pending' ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
          style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: 6,
            fontSize: 12, fontWeight: 600,
            backgroundColor: STATUS_CONFIG[status].bg,
            color: STATUS_CONFIG[status].color,
          }}
        >
          {STATUS_CONFIG[status].icon} {STATUS_CONFIG[status].label}
        </motion.span>
      )}
    </div>
  )

  /* ── Кнопки действий (только MyAds) ── */
  const actionsBlock = isMyAds ? (
    <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
      {onEdit && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={onEdit}
          style={{ flex: 1, padding: 10, border: 'none', background: 'transparent', color: '#F59E0B', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRight: '1px solid var(--border)' }}>
          <Pen size={14} weight="BoldDuotone" /> Изменить
        </motion.button>
      )}
      {status === 'approved' && onMarkSold && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={onMarkSold}
          style={{ flex: 1, padding: 10, border: 'none', background: 'transparent', color: '#8B5CF6', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRight: '1px solid var(--border)' }}>
          <Tag size={14} weight="BoldDuotone" /> Продано
        </motion.button>
      )}
      {onDelete && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={onDelete}
          style={{ flex: 1, padding: 10, border: 'none', background: 'transparent', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <TrashBinMinimalistic size={14} weight="BoldDuotone" /> Удалить
        </motion.button>
      )}
    </div>
  ) : null

  /* ── Обёртка: Link для каталога/избранного, div для MyAds ── */
  if (isMyAds) {
    return (
      <motion.div variants={listItem}
        style={{ background: 'var(--section-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 12, padding: 10 }}>
          {photoBlock}
          {infoBlock}
        </div>
        {actionsBlock}
      </motion.div>
    )
  }

  /* Каталог / Избранное — кликабельная карточка */
  const className = adType === 'plate' && !title ? 'ad-card plate-card' : 'ad-card'

  return (
    <motion.div variants={listItem}>
      <Link to={link} className={className}>
        {photoBlock}
        {infoBlock}
      </Link>
    </motion.div>
  )
}
