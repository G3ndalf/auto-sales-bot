/**
 * EditCarAd.tsx — Страница редактирования объявления авто
 *
 * Загружает данные существующего объявления через api.getCarAd(id),
 * заполняет форму (аналогичную CreateCarAd) и позволяет сохранить
 * изменения через PUT /api/ads/car/{id}.
 *
 * После сохранения объявление отправляется на повторную модерацию.
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { useBackButton } from '../hooks/useBackButton'
import { api } from '../api'
import type { CarAdFull } from '../api'

export default function EditCarAd() {
  /** Назад ведёт на "Мои объявления" */
  useBackButton('/my-ads')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // ===== Состояние формы (аналогично CreateCarAd) =====
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [engineVolume, setEngineVolume] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [hasGas, setHasGas] = useState(false)
  const [transmission, setTransmission] = useState('')
  const [color, setColor] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')

  // ===== Состояние UI =====
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [formErrors, setFormErrors] = useState<string[]>([])
  const errorsRef = useRef<HTMLDivElement>(null)

  /**
   * Загружаем данные объявления и заполняем форму.
   * Используем api.getCarAd(id) — тот же эндпоинт что и для просмотра.
   */
  useEffect(() => {
    if (!id) return

    api.getCarAd(parseInt(id, 10))
      .then((data: CarAdFull) => {
        // Pre-fill все поля из существующего объявления
        setBrand(data.brand || '')
        setModel(data.model || '')
        setYear(data.year ? String(data.year) : '')
        setMileage(data.mileage ? String(data.mileage) : '')
        setEngineVolume(data.engine_volume ? String(data.engine_volume) : '')
        setFuelType(data.fuel_type || '')
        setTransmission(data.transmission || '')
        setColor(data.color || '')
        setPrice(data.price ? String(data.price) : '')
        setDescription(data.description || '')
        setCity(data.city || '')
        setPhone(data.contact_phone || '')
        setTelegram(data.contact_telegram || '')

        // Проверяем наличие ГБО в описании
        if (data.description?.includes('ГБО')) {
          setHasGas(true)
        }
      })
      .catch(() => {
        setFormErrors(['Не удалось загрузить объявление'])
      })
      .finally(() => setLoading(false))
  }, [id])

  /** Отметить поле как "тронутое" для валидации */
  const touch = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  /** Состояние валидации поля */
  const fieldState = (value: string, field: string): 'idle' | 'valid' | 'invalid' => {
    if (!touched[field] && !value) return 'idle'
    return value.trim() ? 'valid' : 'invalid'
  }

  /** Все обязательные поля заполнены */
  const allRequired = brand && model && year && price && city && phone

  /**
   * Сохранение изменений через PUT /api/ads/car/{id}.
   * После успешного сохранения — переход на "Мои объявления".
   */
  const handleSubmit = async () => {
    // Показать валидацию на всех обязательных полях
    setTouched({ brand: true, model: true, year: true, price: true, city: true, phone: true })

    if (!allRequired) return
    if (!id) return

    const finalFuel = hasGas && fuelType ? `${fuelType}` : fuelType

    const adData: Record<string, unknown> = {
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year),
      mileage: parseInt(mileage) || 0,
      engine_volume: parseFloat(engineVolume) || 0,
      fuel_type: finalFuel,
      transmission,
      color: color.trim(),
      price: parseInt(price),
      description: (description.trim() + (hasGas ? '\n⛽ Установлено ГБО' : '')).trim(),
      city,
      contact_phone: phone.trim(),
      contact_telegram: telegram.trim() || null,
    }

    setSubmitting(true)
    setFormErrors([])

    try {
      await api.updateCarAd(parseInt(id, 10), adData)
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

  /** CSS-класс поля формы (используем существующие классы) */
  const fc = (field: string, value: string) => {
    const s = fieldState(value, field)
    return `form-field ${s === 'valid' ? 'field-valid' : s === 'invalid' ? 'field-invalid' : ''}`
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
        ⏳ Загрузка объявления...
      </div>
    )
  }

  // ===== Рендер формы =====
  return (
    <div className="form-page">
      <h1>✏️ Редактирование — Авто</h1>

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

      {/* Section: Основное (аналогично CreateCarAd) */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon">🚗</span>
          <span>Основное</span>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="required">{TEXTS.LABEL_BRAND}</label>
            <input
              className={fc('brand', brand)}
              type="text"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              onBlur={() => touch('brand')}
              placeholder="LADA, BMW..."
            />
          </div>
          <div className="form-group">
            <label className="required">{TEXTS.LABEL_MODEL}</label>
            <input
              className={fc('model', model)}
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              onBlur={() => touch('model')}
              placeholder="Vesta, X5..."
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="required">{TEXTS.LABEL_YEAR}</label>
            <input
              className={fc('year', year)}
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              onBlur={() => touch('year')}
              min={CONFIG.MIN_YEAR}
              max={CONFIG.MAX_YEAR}
              placeholder="2020"
            />
          </div>
          <div className="form-group">
            <label>{TEXTS.LABEL_MILEAGE}</label>
            <input
              className="form-field"
              type="number"
              value={mileage}
              onChange={e => setMileage(e.target.value)}
              placeholder="50000"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{TEXTS.LABEL_ENGINE}</label>
            <input
              className="form-field"
              type="number"
              step="0.1"
              value={engineVolume}
              onChange={e => setEngineVolume(e.target.value)}
              placeholder="1.6"
            />
          </div>
          <div className="form-group">
            <label>{TEXTS.LABEL_COLOR}</label>
            <input
              className="form-field"
              type="text"
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder="Чёрный"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{TEXTS.LABEL_FUEL}</label>
            <select className="form-field" value={fuelType} onChange={e => setFuelType(e.target.value)}>
              <option value="">{TEXTS.PLACEHOLDER_SELECT}</option>
              {TEXTS.FUEL_TYPES.map(ft => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{TEXTS.LABEL_TRANSMISSION}</label>
            <select className="form-field" value={transmission} onChange={e => setTransmission(e.target.value)}>
              <option value="">{TEXTS.PLACEHOLDER_SELECT}</option>
              {TEXTS.TRANSMISSIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Чекбокс ГБО */}
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={hasGas}
            onChange={e => setHasGas(e.target.checked)}
          />
          <span className="checkbox-label">⛽ Установлено ГБО (газ)</span>
        </label>
      </div>

      {/* Section: Цена и описание */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon">💰</span>
          <span>Цена и описание</span>
        </div>

        <div className="form-group">
          <label className="required">{TEXTS.LABEL_PRICE}</label>
          <input
            className={fc('price', price)}
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            onBlur={() => touch('price')}
            placeholder="500000"
          />
        </div>

        <div className="form-group">
          <label>{TEXTS.LABEL_DESCRIPTION}</label>
          <textarea
            className="form-field"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={CONFIG.MAX_DESCRIPTION_LENGTH}
            placeholder="Дополнительная информация..."
          />
        </div>
      </div>

      {/* Section: Город и контакты */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon">📍</span>
          <span>Город и контакты</span>
        </div>

        <div className="form-group">
          <label className="required">{TEXTS.LABEL_CITY}</label>
          <select
            className={fc('city', city)}
            value={city}
            onChange={e => { setCity(e.target.value); touch('city') }}
          >
            <option value="">{TEXTS.PLACEHOLDER_SELECT}</option>
            {TEXTS.CITIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="required">{TEXTS.LABEL_PHONE}</label>
            <input
              className={fc('phone', phone)}
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onBlur={() => touch('phone')}
              placeholder="+7..."
            />
          </div>
          <div className="form-group">
            <label>{TEXTS.LABEL_TELEGRAM}</label>
            <input
              className="form-field"
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
