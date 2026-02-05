import { useState, useEffect, useRef } from 'react'
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
  const [errorType, setErrorType] = useState<'validation' | 'rate_limit' | 'generic' | null>(null)
  const errorsRef = useRef<HTMLDivElement>(null)

  useBackButton('/')

  // Disable close confirmation so sendData() closes cleanly
  useEffect(() => {
    window.Telegram?.WebApp?.disableClosingConfirmation?.()
  }, [])

  const handleSubmit = async () => {
    if (!plateNumber || !price || !city || !phone) {
      setErrorType('validation')
      setFormErrors(['Заполните все обязательные поля: номер, цена, город, телефон'])
      setTimeout(() => {
        errorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }

    const adData = {
      type: 'plate_ad',
      plate_number: plateNumber.trim(),
      price: parseInt(price),
      description: description.trim(),
      city,
      contact_phone: phone.trim(),
      contact_telegram: telegram.trim() || null,
      photo_ids: photoIds.length > 0 ? photoIds : undefined,
    }

    setSubmitting(true)
    setFormErrors([])
    setErrorType(null)

    try {
      const result = await submitAd(adData)
      setSent(true)
      // Если фото были загружены, сервер может опубликовать сразу
      if (photoIds.length > 0 && (result as Record<string, unknown>).published) {
        setPublished(true)
      }
      // Не закрываем автоматически — показываем success screen с кнопкой
    } catch (e: unknown) {
      setSubmitting(false)
      if (e instanceof SubmitError) {
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

  // Success screen — заменяет всю форму
  if (sent) {
    return (
      <div className="form-page">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', textAlign: 'center',
          gap: '12px', padding: '16px', animation: 'scaleIn 0.4s ease-out',
        }}>
          <span style={{ fontSize: '64px' }}>✅</span>
          <h2 style={{ fontSize: '1.4em' }}>
            {published ? 'Объявление опубликовано!' : 'Отправлено на модерацию!'}
          </h2>
          <p style={{ color: 'var(--hint)' }}>
            {published ? 'Ваше объявление уже в каталоге' : 'Мы проверим и опубликуем'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.Telegram?.WebApp?.close()}
            style={{ marginTop: '16px' }}
          >
            Закрыть
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="form-page">
      <h1>{TEXTS.PLATE_FORM_TITLE}</h1>

      {formErrors.length > 0 && (
        <div
          ref={errorsRef}
          className={`form-errors ${errorType === 'rate_limit' ? 'form-errors--rate-limit' : ''}`}
        >
          {errorType === 'rate_limit' ? (
            <div className="form-errors__title">⏳ {formErrors[0]}</div>
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
      )}

      {/* Section: Номер */}
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
          {/* Счётчик символов */}
          <span style={{
            display: 'block', textAlign: 'right', fontSize: '0.8em',
            color: description.length > 900 ? 'var(--red, #ef4444)' : 'var(--hint, #6b7280)',
            marginTop: '4px',
          }}>
            {description.length}/1000
          </span>
        </div>

        <PhotoUploader
          maxPhotos={CONFIG.MAX_PLATE_PHOTOS}
          photoIds={photoIds}
          onPhotosChange={setPhotoIds}
        />
      </div>

      {/* Section: Местоположение и контакты */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon">📍</span>
          <span>Местоположение и контакты</span>
        </div>

        {/* Выбор региона */}
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

        {/* Выбор города (фильтруется по региону) */}
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
        <button className="btn btn-gradient" onClick={handleSubmit} disabled={submitting}>
          {submitting ? TEXTS.BTN_SUBMITTING : TEXTS.BTN_SUBMIT}
        </button>
      </div>
    </div>
  )
}
