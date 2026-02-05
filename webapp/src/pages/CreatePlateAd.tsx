import { useState, useEffect } from 'react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { useBackButton } from '../hooks/useBackButton'

export default function CreatePlateAd() {
  const [plateNumber, setPlateNumber] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  useBackButton('/')

  // Disable close confirmation so sendData() closes cleanly
  useEffect(() => {
    window.Telegram?.WebApp?.disableClosingConfirmation?.()
  }, [])

  const handleSubmit = () => {
    if (!plateNumber || !price || !city || !phone) {
      alert(TEXTS.VALIDATION_REQUIRED_PLATE)
      return
    }

    const tg = window.Telegram?.WebApp
    if (!tg?.sendData) {
      alert(TEXTS.MSG_OPEN_VIA_BOT)
      return
    }

    const data = JSON.stringify({
      type: 'plate_ad',
      plate_number: plateNumber.trim(),
      price: parseInt(price),
      description: description.trim(),
      city,
      contact_phone: phone.trim(),
      contact_telegram: telegram.trim() || null,
    })

    setSubmitting(true)
    try {
      tg.sendData(data)
      // sendData() normally closes the Mini App instantly.
      setTimeout(() => {
        setSent(true)
        setSubmitting(false)
      }, 3000)
    } catch (e: unknown) {
      setSubmitting(false)
      const msg = e instanceof Error ? e.message : String(e)
      alert(TEXTS.MSG_ERROR + '\n' + msg)
    }
  }

  return (
    <div className="form-page">
      <h1>{TEXTS.PLATE_FORM_TITLE}</h1>

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

      <p className="form-hint">{TEXTS.PHOTOS_HINT_AFTER_SUBMIT}</p>

      <div className="submit-section">
        {sent ? (
          <p className="form-hint">{TEXTS.MSG_SEND_DATA_FALLBACK}</p>
        ) : (
          <button className="btn btn-gradient" onClick={handleSubmit} disabled={submitting}>
            {submitting ? TEXTS.BTN_SUBMITTING : TEXTS.BTN_SUBMIT}
          </button>
        )}
      </div>
    </div>
  )
}
