/**
 * EditPlateAd.tsx — Страница редактирования объявления номера
 *
 * Загружает данные существующего объявления через api.getPlateAd(id),
 * заполняет форму (аналогичную CreatePlateAd) и позволяет сохранить
 * изменения через PUT /api/ads/plate/{id}.
 *
 * После сохранения объявление отправляется на повторную модерацию.
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Hashtag, MapPoint, CheckCircle, DangerTriangle, Refresh, Pen, Diskette } from '@solar-icons/react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { useBackButton } from '../hooks/useBackButton'
import { api } from '../api'
import type { PlateAdFull } from '../api'

/* Анимации формы: stagger-появление полей сверху вниз */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}
const fieldItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export default function EditPlateAd() {
  /** Назад ведёт на "Мои объявления" */
  useBackButton('/my-ads')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // ===== Состояние формы (аналогично CreatePlateAd) =====
  const [plateNumber, setPlateNumber] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')

  // ===== Состояние UI =====
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const errorsRef = useRef<HTMLDivElement>(null)

  /**
   * Загружаем данные объявления номера и заполняем форму.
   * Используем api.getPlateAd(id) — тот же эндпоинт что и для просмотра.
   */
  useEffect(() => {
    if (!id) return

    api.getPlateAd(parseInt(id, 10))
      .then((data: PlateAdFull) => {
        // Pre-fill все поля из существующего объявления
        setPlateNumber(data.plate_number || '')
        setPrice(data.price ? String(data.price) : '')
        setDescription(data.description || '')
        const loadedCity = data.city || ''
        setCity(loadedCity)
        // Автоопределение региона по загруженному городу
        const foundRegion = TEXTS.REGIONS.find(r =>
          (r.cities as readonly string[]).includes(loadedCity)
        )
        if (foundRegion) setRegion(foundRegion.name)
        setPhone(data.contact_phone || '')
        setTelegram(data.contact_telegram || '')
      })
      .catch(() => {
        setFormErrors(['Не удалось загрузить объявление'])
      })
      .finally(() => setLoading(false))
  }, [id])

  /** Все обязательные поля заполнены */
  const allRequired = plateNumber && price && city && phone

  /**
   * Сохранение изменений через PUT /api/ads/plate/{id}.
   * После успешного сохранения — переход на "Мои объявления".
   */
  const handleSubmit = async () => {
    if (!allRequired) {
      setFormErrors(['Заполните все обязательные поля: номер, цена, город, телефон'])
      setTimeout(() => {
        errorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }
    if (!id) return

    const adData: Record<string, unknown> = {
      plate_number: plateNumber.trim(),
      price: parseInt(price),
      description: description.trim(),
      city,
      contact_phone: phone.trim(),
      contact_telegram: telegram.trim() || null,
    }

    setSubmitting(true)
    setFormErrors([])

    try {
      await api.updatePlateAd(parseInt(id, 10), adData)
      setSaved(true)
      // После сохранения — возвращаемся к списку
      setTimeout(() => navigate('/my-ads'), 1200)
    } catch (e: unknown) {
      setSubmitting(false)
      setFormErrors([e instanceof Error ? e.message : 'Ошибка сохранения'])
      setTimeout(() => {
        errorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
    }
  }

  // ===== Загрузка =====
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        color: '#6b7280',
        fontSize: '16px',
        backgroundColor: '#f5f5f5',
      }}>
        <Refresh size={16} weight="BoldDuotone" className="animate-spin" /> Загрузка объявления...
      </div>
    )
  }

  // ===== Рендер формы =====
  return (
    <div className="form-page">
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Pen size={18} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle' }} /> Редактирование — Номер
      </motion.h1>

      {/* ⚠️ Предупреждение о повторной модерации */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06 }}
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
        <DangerTriangle size={16} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle' }} /> После редактирования объявление будет отправлено на повторную модерацию
      </motion.div>

      {/* Ошибки формы с анимацией slide-down / fade-in */}
      <AnimatePresence>
        {formErrors.length > 0 && (
          <motion.div
            key="form-errors"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div ref={errorsRef} className="form-errors">
              <div className="form-errors__title">Исправьте ошибки:</div>
              <ul className="form-errors__list">
                {formErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section: Номерной знак — stagger-появление полей */}
      <motion.div className="form-section" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fieldItem} className="form-section__header">
          <span className="form-section__icon"><Hashtag size={16} weight="BoldDuotone" /></span>
          <span>Номерной знак</span>
        </motion.div>

        <motion.div variants={fieldItem} className="form-group">
          <label>{TEXTS.LABEL_PLATE_NUMBER}</label>
          <input
            type="text"
            value={plateNumber}
            onChange={e => setPlateNumber(e.target.value.toUpperCase())}
            placeholder="А777АА 07"
            className="plate-input"
          />
        </motion.div>

        <motion.div variants={fieldItem} className="form-group">
          <label>{TEXTS.LABEL_PRICE}</label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="50000"
          />
        </motion.div>

        <motion.div variants={fieldItem} className="form-group">
          <label>{TEXTS.LABEL_DESCRIPTION}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={CONFIG.MAX_DESCRIPTION_LENGTH}
            placeholder="Дополнительная информация о номере..."
          />
          {/* Счётчик символов — плавная смена цвета через CSS transition */}
          <span className={`block text-right text-[0.8em] mt-1 transition-colors duration-200 ${
            description.length > 900 ? 'text-[#EF4444]' : description.length > 750 ? 'text-[#F59E0B]' : 'text-[#6B7280]'
          }`}>
            {description.length}/1000
          </span>
        </motion.div>
      </motion.div>

      {/* Section: Местоположение и контакты — stagger-появление полей */}
      <motion.div className="form-section" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fieldItem} className="form-section__header">
          <span className="form-section__icon"><MapPoint size={16} weight="BoldDuotone" /></span>
          <span>Местоположение и контакты</span>
        </motion.div>

        {/* Выбор региона */}
        <motion.div variants={fieldItem} className="form-group">
          <label>Регион</label>
          <select
            value={region}
            onChange={e => { setRegion(e.target.value); setCity('') }}
          >
            <option value="">Выберите регион...</option>
            {TEXTS.REGIONS.map(r => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
        </motion.div>

        {/* Выбор города (фильтруется по региону) */}
        <motion.div variants={fieldItem} className="form-group">
          <label>{TEXTS.LABEL_CITY}</label>
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            disabled={!region}
          >
            <option value="">{region ? 'Выберите город...' : 'Сначала выберите регион'}</option>
            {region && TEXTS.REGIONS.find(r => r.name === region)?.cities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
            {region && <option value="Другой">Другой</option>}
          </select>
        </motion.div>

        <motion.div variants={fieldItem} className="form-row">
          <div className="form-group">
            <label>{TEXTS.LABEL_PHONE}</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+7..."
            />
          </div>
          <div className="form-group">
            <label>{TEXTS.LABEL_TELEGRAM}</label>
            <input
              type="text"
              value={telegram}
              onChange={e => setTelegram(e.target.value)}
              placeholder="@username"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Кнопка сохранения */}
      <div className="submit-section">
        <AnimatePresence mode="wait">
          {saved ? (
            /* Анимация подтверждения сохранения */
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
              <CheckCircle size={16} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle', color: '#4CAF50' }} /> Изменения сохранены! Объявление отправлено на модерацию.
            </motion.p>
          ) : (
            /* Тактильная обратная связь на кнопке сохранения */
            <motion.button
              key="submit"
              whileTap={{ scale: 0.95 }}
              className={`btn btn-gradient ${!allRequired ? 'btn-disabled' : ''}`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Сохранение...' : <><Diskette size={16} weight="BoldDuotone" /> Сохранить изменения</>}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
