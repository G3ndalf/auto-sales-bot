import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Garage, Banknote, MapPoint } from '@solar-icons/react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { selectStyle } from '../constants/theme'
import { useBackButton } from '../hooks/useBackButton'
import { submitAd, SubmitError, getUsername, getFullName } from '../api'
import PhotoUploader from '../components/PhotoUploader'
import FormErrors from '../components/FormErrors'
import SuccessScreen from '../components/SuccessScreen'
import DuplicateWarning from '../components/DuplicateWarning'
import RegionCitySelector from '../components/RegionCitySelector'
import { normalizePhone } from '../utils/format'
import { BRANDS } from '../data/brands'

const COLORS = ['Белый', 'Чёрный', 'Серый', 'Серебристый', 'Красный', 'Синий', 'Голубой', 'Зелёный', 'Жёлтый', 'Оранжевый', 'Коричневый', 'Бежевый', 'Фиолетовый', 'Бордовый', 'Золотой']

export default function CreateCarAd() {
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [isOtherBrand, setIsOtherBrand] = useState(false)
  const [isOtherModel, setIsOtherModel] = useState(false)
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [transmission, setTransmission] = useState('')
  const [color, setColor] = useState('')
  const [isOtherColor, setIsOtherColor] = useState(false)
  const [hasGbo, setHasGbo] = useState(false)
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [photoIds, setPhotoIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [published, setPublished] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [errorType, setErrorType] = useState<'validation' | 'rate_limit' | 'duplicate' | 'generic' | null>(null)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const errorsRef = useRef<HTMLDivElement>(null)

  useBackButton('/')

  useEffect(() => {
    window.Telegram?.WebApp?.disableClosingConfirmation?.()
  }, [])

  const touch = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  // Validation state for each required field
  const fieldState = (value: string, field: string): 'idle' | 'valid' | 'invalid' => {
    if (!touched[field] && !value) return 'idle'
    return value.trim() ? 'valid' : 'invalid'
  }

  const allRequired = brand && model && year && price && city && phone

  /** Собирает данные формы в объект для отправки */
  const buildAdData = (force = false) => {
    return {
      type: 'car_ad',
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year),
      mileage: parseInt(mileage) || 0,
      transmission,
      color: color.trim(),
      has_gbo: hasGbo,
      price: parseInt(price),
      description: description.trim(),
      region,
      city,
      contact_phone: phone.trim(),
      username: getUsername(),
      full_name: getFullName(),
      photo_ids: photoIds.length > 0 ? photoIds : undefined,
      ...(force ? { force: true } : {}),
    }
  }

  /** Отправка объявления на сервер */
  const doSubmit = async (adData: Record<string, unknown>) => {
    setSubmitting(true)
    setFormErrors([])
    setErrorType(null)
    setShowDuplicateWarning(false)

    try {
      const result = await submitAd(adData)
      setSent(true)
      if (photoIds.length > 0 && (result as Record<string, unknown>).published) {
        setPublished(true)
      }
    } catch (e: unknown) {
      setSubmitting(false)
      if (e instanceof SubmitError) {
        if (e.type === 'duplicate') {
          // Показываем предупреждение вместо ошибки
          setShowDuplicateWarning(true)
          return
        }
        setErrorType(e.type)
        if (e.type === 'validation' && e.errors) {
          setFormErrors(e.errors)
        } else {
          setFormErrors([e.message])
        }
      } else {
        setErrorType('generic')
        setFormErrors([e instanceof Error ? e.message : String(e)])
      }
      setTimeout(() => {
        errorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
    }
  }

  const handleSubmit = async () => {
    setTouched({ brand: true, model: true, year: true, price: true, city: true, phone: true })
    if (!allRequired) return
    await doSubmit(buildAdData(false))
  }

  /** Повторная отправка с force=true — пользователь подтвердил дубликат */
  const handleForceSubmit = async () => {
    await doSubmit(buildAdData(true))
  }

  const fc = (field: string, value: string) => {
    const s = fieldState(value, field)
    return `form-field ${s === 'valid' ? 'field-valid' : s === 'invalid' ? 'field-invalid' : ''}`
  }

  // Duplicate warning screen — предупреждение о похожем объявлении
  if (showDuplicateWarning) {
    return (
      <DuplicateWarning
        onBack={() => setShowDuplicateWarning(false)}
        onForce={handleForceSubmit}
        submitting={submitting}
      />
    )
  }

  // Success screen — scale-up галочка + fade-in текст
  if (sent) {
    return <SuccessScreen published={published} catalogHash="#/cars" />
  }

  return (
    <div className="form-page">
      <h1>{TEXTS.CAR_FORM_TITLE}</h1>

      {/* Ошибки валидации с анимацией slide-down / fade-in */}
      <FormErrors ref={errorsRef} errors={formErrors} errorType={errorType} />

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

        {/* Toggle ГБО — кастомный, т.к. нативный checkbox глючит в TG WebView */}
        <div
          className="form-group"
          onClick={() => setHasGbo(!hasGbo)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          <div style={{
            width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
            background: hasGbo ? '#F59E0B' : 'var(--bg-tertiary)',
            transition: 'background 0.2s',
            position: 'relative',
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '10px',
              background: '#fff', position: 'absolute', top: '2px',
              left: hasGbo ? '22px' : '2px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </div>
          <span style={{ fontSize: '15px' }}>Установлено ГБО</span>
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

        <div>
          <PhotoUploader
            maxPhotos={CONFIG.MAX_CAR_PHOTOS}
            photoIds={photoIds}
            onPhotosChange={setPhotoIds}
          />
        </div>
      </div>

      {/* Section: Контакты */}
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
        </div>
      </div>

      <div className="submit-section">
        <motion.button
          whileTap={{ scale: 0.95 }}
          className={`btn btn-gradient ${!allRequired ? 'btn-disabled' : ''}`}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? TEXTS.BTN_SUBMITTING : TEXTS.BTN_SUBMIT}
        </motion.button>
      </div>
    </div>
  )
}
