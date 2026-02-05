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
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { useBackButton } from '../hooks/useBackButton'
import { api } from '../api'
import type { PlateAdFull } from '../api'

export default function EditPlateAd() {
  /** Назад ведёт на "Мои объявления" */
  useBackButton('/my-ads')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // ===== Состояние формы (аналогично CreatePlateAd) =====
  const [plateNumber, setPlateNumber] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
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
        setCity(data.city || '')
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
        color: 'var(--tg-theme-hint-color)',
        fontSize: '16px',
      }}>
        Загрузка...
      </div>
    )
  }

  // ===== Рендер формы =====
  return (
    <div className="form-page">
      <h1>✏️ Редактирование — Номер</h1>

      {/* ⚠️ Предупреждение о повторной модерации */}
      <div style={{
        padding: '12px 16px',
        marginBottom: '16px',
        borderRadius: '10px',
        backgroundColor: '#FFA50022',
        border: '1px solid #FFA50044',
        color: '#FFA500',
        fontSize: '13px',
        lineHeight: '1.4',
      }}>
        ⚠️ После редактирования объявление будет отправлено на повторную модерацию
      </div>

      {/* Ошибки формы */}
      {formErrors.length > 0 && (
        <div ref={errorsRef} className="form-errors">
          <div className="form-errors__title">Исправьте ошибки:</div>
          <ul className="form-errors__list">
            {formErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Section: Номерной знак (аналогично CreatePlateAd) */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon">🔢</span>
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
        </div>
      </div>

      {/* Section: Местоположение и контакты */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon">📍</span>
          <span>Местоположение и контакты</span>
        </div>

        <div className="form-group">
          <label>{TEXTS.LABEL_CITY}</label>
          <select value={city} onChange={e => setCity(e.target.value)}>
            <option value="">{TEXTS.PLACEHOLDER_SELECT}</option>
            {TEXTS.CITIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

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
        {saved ? (
          <p style={{
            textAlign: 'center',
            color: '#4CAF50',
            fontSize: '16px',
            fontWeight: 600,
          }}>
            ✅ Изменения сохранены! Объявление отправлено на модерацию.
          </p>
        ) : (
          <button
            className={`btn btn-gradient ${!allRequired ? 'btn-disabled' : ''}`}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Сохранение...' : '💾 Сохранить изменения'}
          </button>
        )}
      </div>
    </div>
  )
}
