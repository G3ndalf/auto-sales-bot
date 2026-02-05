import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Garage, Banknote, MapPoint, CheckCircle, DangerTriangle, Refresh, Fuel } from '@solar-icons/react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { useBackButton } from '../hooks/useBackButton'
import { submitAd, SubmitError } from '../api'
import PhotoUploader from '../components/PhotoUploader'
import { BRANDS } from '../data/brands'

export default function CreateCarAd() {
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [isOtherBrand, setIsOtherBrand] = useState(false)
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [engineVolume, setEngineVolume] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [hasGas, setHasGas] = useState(false)
  const [transmission, setTransmission] = useState('')
  const [color, setColor] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
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
    const finalFuel = hasGas && fuelType ? `${fuelType}` : fuelType
    return {
      type: 'car_ad',
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

  // Duplicate warning screen — предупреждение о похожем объявлении (bounce-in + shake)
  if (showDuplicateWarning) {
    return (
      <div className="form-page">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3 p-4"
        >
          {/* Shake-анимация иконки предупреждения */}
          <motion.div
            animate={{ x: [0, -8, 8, -8, 8, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <DangerTriangle size={48} weight="BoldDuotone" style={{ color: '#F59E0B' }} />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="text-[1.3em] text-[#F59E0B]"
          >
            Похожее объявление уже существует
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            className="text-[#9CA3AF] max-w-[280px] leading-normal"
          >
            Вы уже подавали похожее объявление за последние 7 дней. Возможно, стоит отредактировать существующее.
          </motion.p>
          <div className="flex gap-3 mt-4">
            <button
              className="btn bg-[#1F2937] text-[#F9FAFB]"
              onClick={() => setShowDuplicateWarning(false)}
            >
              ← Назад
            </button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="btn btn-gradient"
              onClick={handleForceSubmit}
              disabled={submitting}
            >
              {submitting ? 'Отправка...' : 'Всё равно опубликовать'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Success screen — scale-up галочка + fade-in текст
  if (sent) {
    return (
      <div className="form-page">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3 p-4"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.15 }}
            style={{ filter: 'drop-shadow(0 4px 16px rgba(245, 158, 11, 0.4))' }}
          >
            <CheckCircle size={64} weight="BoldDuotone" style={{ color: '#F59E0B' }} />
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="text-[1.4em]"
          >
            {published ? 'Объявление опубликовано!' : 'Отправлено на модерацию!'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.3 }}
            className="text-[#9CA3AF]"
          >
            {published ? 'Ваше объявление уже в каталоге' : 'Мы проверим и опубликуем'}
          </motion.p>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.3 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary mt-4"
            onClick={() => window.Telegram?.WebApp?.close()}
          >
            Закрыть
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="form-page">
      <h1>{TEXTS.CAR_FORM_TITLE}</h1>

      {/* Ошибки валидации с анимацией slide-down / fade-in */}
      <AnimatePresence>
        {formErrors.length > 0 && (
          <motion.div
            key="form-errors"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div
              ref={errorsRef}
              className={`form-errors ${errorType === 'rate_limit' ? 'form-errors--rate-limit' : ''}`}
            >
              {errorType === 'rate_limit' ? (
                <div className="form-errors__title"><Refresh size={16} weight="BoldDuotone" className="animate-spin" /> {formErrors[0]}</div>
              ) : (
                <>
                  <div className="form-errors__title">Исправьте ошибки:</div>
                  <ul className="form-errors__list">
                    {formErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <select
                className={fc('model', model)}
                value={model}
                onChange={e => { setModel(e.target.value); touch('model') }}
                disabled={!brand}
              >
                <option value="">{brand ? 'Выберите модель' : 'Сначала выберите марку'}</option>
                {(BRANDS.find(b => b.name === brand)?.models ?? []).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
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

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={hasGas}
            onChange={e => setHasGas(e.target.checked)}
          />
          <span className="checkbox-label"><Fuel size={16} weight="BoldDuotone" /> Установлено ГБО (газ)</span>
        </label>
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

        <div className="form-group">
          <label className="required">Регион</label>
          <select
            className={fc('region', region)}
            value={region}
            onChange={e => { setRegion(e.target.value); setCity(''); touch('region') }}
          >
            <option value="">Выберите регион...</option>
            {TEXTS.REGIONS.map(r => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="required">{TEXTS.LABEL_CITY}</label>
          <select
            className={fc('city', city)}
            value={city}
            onChange={e => { setCity(e.target.value); touch('city') }}
            disabled={!region}
          >
            <option value="">{region ? 'Выберите город...' : 'Сначала выберите регион'}</option>
            {region && TEXTS.REGIONS.find(r => r.name === region)?.cities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
            {region && <option value="Другой">Другой</option>}
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
