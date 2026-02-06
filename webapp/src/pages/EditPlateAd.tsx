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
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Hashtag, MapPoint, CheckCircle, DangerTriangle, Refresh, Pen, Diskette } from '@solar-icons/react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { useBackButton } from '../hooks/useBackButton'
import { api } from '../api'
import type { PlateAdFull } from '../api'
import FormErrors from '../components/FormErrors'
import RegionCitySelector from '../components/RegionCitySelector'
import CharCounter from '../components/CharCounter'

export default function EditPlateAd() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  /** Режим админа — если ?admin=true, используем admin endpoint без повторной модерации */
  const isAdmin = searchParams.get('admin') === 'true'
  
  /** Назад ведёт на "Мои объявления" или админку */
  useBackButton(isAdmin ? '/admin-panel' : '/my-ads')

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
      await api.updatePlateAd(parseInt(id, 10), adData, isAdmin)
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
      <h1>
        <Pen size={18} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle' }} /> Редактирование — Номер
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
        <DangerTriangle size={16} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle' }} /> После редактирования объявление будет отправлено на повторную модерацию
      </div>

      {/* Ошибки формы с анимацией slide-down / fade-in */}
      <FormErrors ref={errorsRef} errors={formErrors} />

      {/* Section: Номерной знак */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon"><Hashtag size={16} weight="BoldDuotone" /></span>
          <span>Номерной знак</span>
        </div>

        <div className="form-group">
          <label>{TEXTS.LABEL_PLATE_NUMBER}</label>
          <input
            type="text"
            value={plateNumber}
            onChange={e => setPlateNumber(e.target.value.toUpperCase())}
            placeholder="А777АА 07"
            className="plate-input"
          />
        </div>

        <div className="form-group">
          <label>{TEXTS.LABEL_PRICE}</label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="50000"
          />
        </div>

        <div className="form-group">
          <label>{TEXTS.LABEL_DESCRIPTION}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={CONFIG.MAX_DESCRIPTION_LENGTH}
            placeholder="Дополнительная информация о номере..."
          />
          <div style={{ textAlign: 'right', marginTop: 4 }}>
            <CharCounter value={description} max={1000} />
          </div>
        </div>
      </div>

      {/* Section: Местоположение и контакты */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon"><MapPoint size={16} weight="BoldDuotone" /></span>
          <span>Местоположение и контакты</span>
        </div>

        {/* Регион и город — общий компонент */}
        <RegionCitySelector
          region={region}
          city={city}
          onRegionChange={v => setRegion(v)}
          onCityChange={v => setCity(v)}
        />

        <div className="form-row">
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
        </div>
      </div>

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
              <CheckCircle size={16} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle', color: '#4CAF50' }} /> Изменения сохранены! Объявление отправлено на модерацию.
            </motion.p>
          ) : (
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
