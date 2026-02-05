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
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [errorType, setErrorType] = useState<'validation' | 'rate_limit' | 'duplicate' | 'generic' | null>(null)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const errorsRef = useRef<HTMLDivElement>(null)

  useBackButton('/')

  // Disable close confirmation so sendData() closes cleanly
  useEffect(() => {
    window.Telegram?.WebApp?.disableClosingConfirmation?.()
  }, [])

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
    if (!plateNumber || !price || !city || !phone) {
      setErrorType('validation')
      setFormErrors(['Заполните все обязательные поля: номер, цена, город, телефон'])
      setTimeout(() => {
        errorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
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
          <span className={`block text-right text-[0.8em] mt-1 transition-colors duration-200 ${
            description.length > 900 ? 'text-[#EF4444]' : description.length > 750 ? 'text-[#F59E0B]' : 'text-[#6B7280]'
          }`}>
            {description.length}/1000
          </span>
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
        </div>
      </div>

      <div className="submit-section">
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="btn btn-gradient"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? TEXTS.BTN_SUBMITTING : TEXTS.BTN_SUBMIT}
        </motion.button>
      </div>
    </div>
  )
}
