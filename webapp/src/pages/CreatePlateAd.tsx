import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hashtag, MapPoint, CheckCircle, DangerTriangle, Refresh } from '@solar-icons/react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { useBackButton } from '../hooks/useBackButton'
import { submitAd, SubmitError } from '../api'
import PhotoUploader from '../components/PhotoUploader'

export default function CreatePlateAd() {
  const [plateNumber, setPlateNumber] = useState('')
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
    city,
    contact_phone: phone.trim(),
    contact_telegram: telegram.trim() || null,
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

  // Duplicate warning screen — bounce-in + shake иконки
  if (showDuplicateWarning) {
    return (
      <div className="form-page">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3 p-4"
        >
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
            onClick={() => window.location.hash = '#/plates'}
          >
            В каталог
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="form-page">
      <h1>{TEXTS.PLATE_FORM_TITLE}</h1>

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

        <div className="form-group">
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
        </div>

        <div className="form-group">
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
