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
  const [hasGas, setHasGas] = useState(false)
  const [transmission, setTransmission] = useState('')
  const [color, setColor] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

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

  const handleSubmit = () => {
    // Touch all required fields to show validation
    setTouched({ brand: true, model: true, year: true, price: true, city: true, phone: true })

    if (!allRequired) return

    const tg = window.Telegram?.WebApp
    if (!tg?.sendData) {
      alert(TEXTS.MSG_OPEN_VIA_BOT)
      return
    }

    // If gas checkbox is on, append to fuel type
    const finalFuel = hasGas && fuelType ? `${fuelType}` : fuelType

    const data = JSON.stringify({
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
    })

    setSubmitting(true)
    try {
      tg.sendData(data)
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

  const fc = (field: string, value: string) => {
    const s = fieldState(value, field)
    return `form-field ${s === 'valid' ? 'field-valid' : s === 'invalid' ? 'field-invalid' : ''}`
  }

  return (
    <div className="form-page">
      <h1>{TEXTS.CAR_FORM_TITLE}</h1>

      {/* Section: Основное */}
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

      {/* Section: Контакты */}
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

      <p className="form-hint">{TEXTS.PHOTOS_HINT_AFTER_SUBMIT}</p>

      <div className="submit-section">
        {sent ? (
          <p className="form-hint">{TEXTS.MSG_SEND_DATA_FALLBACK}</p>
        ) : (
          <button
            className={`btn btn-gradient ${!allRequired ? 'btn-disabled' : ''}`}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? TEXTS.BTN_SUBMITTING : TEXTS.BTN_SUBMIT}
          </button>
        )}
      </div>
    </div>
  )
}
