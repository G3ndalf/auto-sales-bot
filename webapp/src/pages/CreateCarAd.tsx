import { useState, useEffect } from 'react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { useBackButton } from '../hooks/useBackButton'

export default function CreateCarAd() {
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [engineVolume, setEngineVolume] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [transmission, setTransmission] = useState('')
  const [color, setColor] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useBackButton('/')

  // Disable close confirmation so sendData() closes cleanly
  useEffect(() => {
    window.Telegram?.WebApp?.disableClosingConfirmation?.()
  }, [])

  const handleSubmit = () => {
    if (!brand || !model || !year || !price || !city || !phone) {
      alert(TEXTS.VALIDATION_REQUIRED_CAR)
      return
    }

    setSubmitting(true)

    const data = JSON.stringify({
      type: 'car_ad',
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year),
      mileage: parseInt(mileage) || 0,
      engine_volume: parseFloat(engineVolume) || 0,
      fuel_type: fuelType,
      transmission,
      color: color.trim(),
      price: parseInt(price),
      description: description.trim(),
      city,
      contact_phone: phone.trim(),
      contact_telegram: telegram.trim() || null,
    })

    const tg = window.Telegram?.WebApp
    if (tg?.sendData) {
      try {
        tg.sendData(data)
        // sendData() closes the Mini App immediately.
        // Code below only runs if sendData somehow doesn't close.
      } catch (e: any) {
        setSubmitting(false)
        alert(TEXTS.MSG_ERROR + '\n' + e.message)
      }
    } else {
      setSubmitting(false)
      alert(TEXTS.MSG_OPEN_VIA_TELEGRAM)
    }
  }

  return (
    <div className="form-page">
      <h1>{TEXTS.CAR_FORM_TITLE}</h1>

      <div className="form-row">
        <div className="form-group">
          <label>{TEXTS.LABEL_BRAND}</label>
          <input
            type="text"
            value={brand}
            onChange={e => setBrand(e.target.value)}
            placeholder="LADA, BMW..."
          />
        </div>
        <div className="form-group">
          <label>{TEXTS.LABEL_MODEL}</label>
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="Vesta, X5..."
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>{TEXTS.LABEL_YEAR}</label>
          <input
            type="number"
            value={year}
            onChange={e => setYear(e.target.value)}
            min={CONFIG.MIN_YEAR}
            max={CONFIG.MAX_YEAR}
            placeholder="2020"
          />
        </div>
        <div className="form-group">
          <label>{TEXTS.LABEL_MILEAGE}</label>
          <input
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
          <select value={fuelType} onChange={e => setFuelType(e.target.value)}>
            <option value="">{TEXTS.PLACEHOLDER_SELECT}</option>
            {TEXTS.FUEL_TYPES.map(ft => (
              <option key={ft.value} value={ft.value}>{ft.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>{TEXTS.LABEL_TRANSMISSION}</label>
          <select value={transmission} onChange={e => setTransmission(e.target.value)}>
            <option value="">{TEXTS.PLACEHOLDER_SELECT}</option>
            {TEXTS.TRANSMISSIONS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>{TEXTS.LABEL_PRICE}</label>
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="500000"
        />
      </div>

      <div className="form-group">
        <label>{TEXTS.LABEL_DESCRIPTION}</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={CONFIG.MAX_DESCRIPTION_LENGTH}
          placeholder="Дополнительная информация об автомобиле..."
        />
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

      <p className="form-hint">{TEXTS.PHOTOS_HINT_AFTER_SUBMIT}</p>

      <div className="submit-section">
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? TEXTS.BTN_SUBMITTING : TEXTS.BTN_SUBMIT}
        </button>
      </div>
    </div>
  )
}
