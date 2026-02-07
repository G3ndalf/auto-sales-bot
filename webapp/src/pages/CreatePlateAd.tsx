import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Hashtag, MapPoint } from '@solar-icons/react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { useBackButton } from '../hooks/useBackButton'
import { submitAd, SubmitError, getUsername, getFullName } from '../api'
import PhotoUploader from '../components/PhotoUploader'
import FormErrors from '../components/FormErrors'
import SuccessScreen from '../components/SuccessScreen'
import DuplicateWarning from '../components/DuplicateWarning'
import RegionCitySelector from '../components/RegionCitySelector'
import CharCounter from '../components/CharCounter'
import { normalizePhone } from '../utils/format'

export default function CreatePlateAd() {
  const [plateNumber, setPlateNumber] = useState('')
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

  // F9: Включаем подтверждение закрытия когда форма заполнена
  useEffect(() => {
    const hasData = !!(plateNumber || price || description || phone || photoIds.length)
    if (hasData) {
      window.Telegram?.WebApp?.enableClosingConfirmation?.()
    } else {
      window.Telegram?.WebApp?.disableClosingConfirmation?.()
    }
  }, [plateNumber, price, description, phone, photoIds])

  const touch = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const fieldState = (value: string, field: string): 'idle' | 'valid' | 'invalid' => {
    if (!touched[field] && !value) return 'idle'
    return value.trim() ? 'valid' : 'invalid'
  }

  const fc = (field: string, value: string) => {
    const s = fieldState(value, field)
    return `form-field ${s === 'valid' ? 'field-valid' : s === 'invalid' ? 'field-invalid' : ''}`
  }

  const allRequired = plateNumber && price && city && phone

  /** Собирает данные формы */
  const buildAdData = (force = false) => ({
    type: 'plate_ad',
    plate_number: plateNumber.trim(),
    price: parseInt(price),
    description: description.trim(),
    region,
    city,
    contact_phone: phone.trim(),
    username: getUsername(),
    full_name: getFullName(),
    photo_ids: photoIds.length > 0 ? photoIds : undefined,
    ...(force ? { force: true } : {}),
  })

  /** Отправка на сервер */
  const doSubmit = async (adData: Record<string, unknown>) => {
    setSubmitting(true)
    setFormErrors([])
    setErrorType(null)
    setShowDuplicateWarning(false)

    try {
      const result = await submitAd(adData)
      // F9: Отключаем подтверждение закрытия после успешной отправки
      window.Telegram?.WebApp?.disableClosingConfirmation?.()
      setSent(true)
      if (photoIds.length > 0 && (result as Record<string, unknown>).published) {
        setPublished(true)
      }
    } catch (e: unknown) {
      setSubmitting(false)
      if (e instanceof SubmitError) {
        if (e.type === 'duplicate') {
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
    if (submitting) return // F5: Prevent double-submit
    setSubmitting(true) // F5: Block immediately
    setTouched({ plateNumber: true, price: true, city: true, phone: true })
    if (!plateNumber || !price || !city || !phone) {
      setSubmitting(false)
      setErrorType('validation')
      setFormErrors(['Заполните все обязательные поля: номер, цена, город, телефон'])
      setTimeout(() => {
        errorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }
    const priceNum = parseInt(price)
    if (priceNum > CONFIG.MAX_PLATE_PRICE) {
      setSubmitting(false)
      setErrorType('validation')
      setFormErrors([`Максимальная цена для номеров — ${CONFIG.MAX_PLATE_PRICE.toLocaleString('ru-RU')} ₽`])
      setTimeout(() => errorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      return
    }
    await doSubmit(buildAdData(false))
  }

  /** Повторная отправка с force=true */
  const handleForceSubmit = async () => {
    await doSubmit(buildAdData(true))
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
    return <SuccessScreen published={published} catalogHash="#/plates" />
  }

  return (
    <div className="form-page">
      <h1>{TEXTS.PLATE_FORM_TITLE}</h1>

      {/* Ошибки валидации с анимацией slide-down / fade-in */}
      <FormErrors ref={errorsRef} errors={formErrors} errorType={errorType} />

      {/* Section: Номер */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon"><Hashtag size={16} weight="BoldDuotone" /></span>
          <span>Номерной знак</span>
        </div>

        <div className="form-group">
          <label className="required">{TEXTS.LABEL_PLATE_NUMBER}</label>
          <input
            type="text"
            value={plateNumber}
            onChange={e => setPlateNumber(e.target.value.toUpperCase())}
            onBlur={() => touch('plateNumber')}
            placeholder="А777АА 07"
            className={`plate-input ${fieldState(plateNumber, 'plateNumber') === 'valid' ? 'field-valid' : fieldState(plateNumber, 'plateNumber') === 'invalid' ? 'field-invalid' : ''}`}
          />
        </div>

        <div className="form-group">
          <label className="required">{TEXTS.LABEL_PRICE}</label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            onBlur={() => touch('price')}
            placeholder="50000"
            className={fc('price', price)}
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

        <div>
          <PhotoUploader
            maxPhotos={CONFIG.MAX_PLATE_PHOTOS}
            photoIds={photoIds}
            onPhotosChange={setPhotoIds}
          />
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
          onRegionChange={v => { setRegion(v); touch('region') }}
          onCityChange={v => { setCity(v); touch('city') }}
          regionClassName={fieldState(region, 'region') === 'valid' ? 'field-valid' : fieldState(region, 'region') === 'invalid' ? 'field-invalid' : ''}
          cityClassName={fieldState(city, 'city') === 'valid' ? 'field-valid' : fieldState(city, 'city') === 'invalid' ? 'field-invalid' : ''}
        />

        <div className="form-row">
          <div className="form-group">
            <label className="required">{TEXTS.LABEL_PHONE}</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(normalizePhone(e.target.value))}
              onBlur={() => touch('phone')}
              placeholder="8-999-123-45-67"
              className={fc('phone', phone)}
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
