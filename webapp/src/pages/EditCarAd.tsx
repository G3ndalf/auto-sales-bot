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
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Garage, Banknote, MapPoint, CheckCircle, DangerTriangle, Refresh, Pen, Diskette } from '@solar-icons/react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { selectStyle } from '../constants/theme'
import { useBackButton } from '../hooks/useBackButton'
import { api } from '../api'
import type { CarAdFull } from '../api'
import { normalizePhone } from '../utils/format'
import FormErrors from '../components/FormErrors'
import RegionCitySelector from '../components/RegionCitySelector'
import { BRANDS } from '../data/brands'

const COLORS = ['Белый', 'Чёрный', 'Серый', 'Серебристый', 'Красный', 'Синий', 'Голубой', 'Зелёный', 'Жёлтый', 'Оранжевый', 'Коричневый', 'Бежевый', 'Фиолетовый', 'Бордовый', 'Золотой']

export default function EditCarAd() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  /** Режим админа — если ?admin=true, используем admin endpoint без повторной модерации */
  const isAdmin = searchParams.get('admin') === 'true'
  
  /** Назад ведёт на "Мои объявления" или админку */
  useBackButton(isAdmin ? '/admin-panel' : '/my-ads')

  // ===== Состояние формы (аналогично CreateCarAd) =====
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [isOtherBrand, setIsOtherBrand] = useState(false)
  const [isOtherModel, setIsOtherModel] = useState(false)
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [transmission, setTransmission] = useState('')
  const [color, setColor] = useState('')
  const [isOtherColor, setIsOtherColor] = useState(false)
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
        const loadedBrand = data.brand || ''
        setBrand(loadedBrand)

        const loadedModel = data.model || ''
        setModel(loadedModel)

        if (loadedBrand && !BRANDS.some(b => b.name === loadedBrand)) {
          setIsOtherBrand(true)
        } else if (loadedBrand && loadedModel) {
          // Проверяем, есть ли модель в списке моделей бренда
          const brandData = BRANDS.find(b => b.name === loadedBrand)
          if (brandData && !brandData.models.includes(loadedModel)) {
            setIsOtherModel(true)
          }
        }

        setYear(data.year ? String(data.year) : '')
        setMileage(data.mileage ? String(data.mileage) : '')
        setTransmission(data.transmission || '')

        const loadedColor = data.color || ''
        setColor(loadedColor)
        if (loadedColor && !COLORS.includes(loadedColor)) {
          setIsOtherColor(true)
        }

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

    const adData: Record<string, unknown> = {
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year),
      mileage: parseInt(mileage) || 0,
      transmission,
      color: color.trim(),
      price: parseInt(price),
      description: description.trim(),
      city,
      contact_phone: phone.trim(),
      contact_telegram: telegram.trim() || null,
    }

    setSubmitting(true)
    setFormErrors([])

    try {
      await api.updateCarAd(parseInt(id, 10), adData, isAdmin)
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
        <Refresh size={16} weight="BoldDuotone" className="animate-spin" /> Загрузка объявления...
      </div>
    )
  }

  // ===== Рендер формы =====
  return (
    <div className="form-page">
      <h1>
        <Pen size={18} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle' }} /> Редактирование — Авто
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

      {/* Section: Основное */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon"><Garage size={16} weight="BoldDuotone" /></span>
          <span>Основное</span>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="required">{TEXTS.LABEL_BRAND}</label>
            <select
              className={fc('brand', brand)}
              style={selectStyle}
              value={isOtherBrand ? '__other' : brand}
              onChange={e => {
                const v = e.target.value
                if (v === '__other') {
                  setIsOtherBrand(true)
                  setBrand('')
                  setModel('')
                } else {
                  setIsOtherBrand(false)
                  setBrand(v)
                  setModel('')
                }
                setIsOtherModel(false)
                touch('brand')
              }}
            >
              <option value="">Выберите марку</option>
              {BRANDS.map(b => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
              <option value="__other">Другая</option>
            </select>
            {isOtherBrand && (
              <input
                className={fc('brand', brand)}
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                onBlur={() => touch('brand')}
                placeholder="Введите марку..."
                style={{ marginTop: 8 }}
              />
            )}
          </div>
          <div className="form-group">
            <label className="required">{TEXTS.LABEL_MODEL}</label>
            {isOtherBrand ? (
              <input
                className={fc('model', model)}
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                onBlur={() => touch('model')}
                placeholder="Введите модель..."
              />
            ) : (
              <>
                <select
                  className={fc('model', model)}
                  style={selectStyle}
                  value={isOtherModel ? '__other' : model}
                  onChange={e => {
                    const v = e.target.value
                    if (v === '__other') {
                      setIsOtherModel(true)
                      setModel('')
                    } else {
                      setIsOtherModel(false)
                      setModel(v)
                    }
                    touch('model')
                  }}
                  disabled={!brand}
                >
                  <option value="">{brand ? 'Выберите модель' : 'Сначала выберите марку'}</option>
                  {(BRANDS.find(b => b.name === brand)?.models ?? []).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="__other">Другая</option>
                </select>
                {isOtherModel && (
                  <input
                    className={fc('model', model)}
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    onBlur={() => touch('model')}
                    placeholder="Введите модель..."
                    style={{ marginTop: 8 }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="required">{TEXTS.LABEL_YEAR}</label>
            <select
              className={fc('year', year)}
              style={selectStyle}
              value={year}
              onChange={e => { setYear(e.target.value); touch('year') }}
            >
              <option value="">Год выпуска</option>
              {Array.from({ length: 2026 - 1980 + 1 }, (_, i) => 2026 - i).map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
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
            <label>{TEXTS.LABEL_COLOR}</label>
            <select
              className="form-field"
              style={selectStyle}
              value={isOtherColor ? '__other' : color}
              onChange={e => {
                const v = e.target.value
                if (v === '__other') {
                  setIsOtherColor(true)
                  setColor('')
                } else {
                  setIsOtherColor(false)
                  setColor(v)
                }
              }}
            >
              <option value="">Выберите цвет</option>
              {COLORS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__other">Другой</option>
            </select>
            {isOtherColor && (
              <input
                className="form-field"
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="Введите цвет..."
                style={{ marginTop: 8 }}
              />
            )}
          </div>
          <div className="form-group">
            <label>{TEXTS.LABEL_TRANSMISSION}</label>
            <select
              className="form-field"
              style={selectStyle}
              value={transmission}
              onChange={e => setTransmission(e.target.value)}
            >
              <option value="">{TEXTS.PLACEHOLDER_SELECT}</option>
              {TEXTS.TRANSMISSIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section: Цена и описание */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon"><Banknote size={16} weight="BoldDuotone" /></span>
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
          <span className={`block text-right text-[0.8em] mt-1 transition-colors duration-200 ${
            description.length > 900 ? 'text-[#EF4444]' : description.length > 750 ? 'text-[#F59E0B]' : 'text-[#6B7280]'
          }`}>
            {description.length}/1000
          </span>
        </div>
      </div>

      {/* Section: Город и контакты */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon"><MapPoint size={16} weight="BoldDuotone" /></span>
          <span>Город и контакты</span>
        </div>

        {/* Регион и город — общий компонент */}
        <RegionCitySelector
          region={region}
          city={city}
          onRegionChange={v => { setRegion(v); touch('region') }}
          onCityChange={v => { setCity(v); touch('city') }}
          regionClassName={fieldState(region, 'region') === 'valid' ? 'field-valid' : fieldState(region, 'region') === 'invalid' ? 'field-invalid' : ''}
          cityClassName={fieldState(city, 'city') === 'valid' ? 'field-valid' : fieldState(city, 'city') === 'invalid' ? 'field-invalid' : ''}
        />

        <div className="form-row">
          <div className="form-group">
            <label className="required">{TEXTS.LABEL_PHONE}</label>
            <input
              className={fc('phone', phone)}
              type="tel"
              value={phone}
              onChange={e => setPhone(normalizePhone(e.target.value))}
              onBlur={() => touch('phone')}
              placeholder="8-999-123-45-67"
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
