import { useState, useRef } from 'react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { useBackButton } from '../hooks/useBackButton'

interface PhotoFile {
  file: File
  preview: string
}

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
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [submitted, setSubmitted] = useState(false)

  useBackButton('/')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const remaining = CONFIG.MAX_CAR_PHOTOS - photos.length
    const newPhotos = Array.from(files).slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setPhotos(prev => [...prev, ...newPhotos])
    e.target.value = ''
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = () => {
    if (!brand || !model || !year || !price || !city || !phone) {
      alert('Заполните обязательные поля: марка, модель, год, цена, город, телефон')
      return
    }

    const data = JSON.stringify({
      type: 'car_ad',
      brand,
      model,
      year: parseInt(year),
      mileage: parseInt(mileage) || 0,
      engine_volume: parseFloat(engineVolume) || 0,
      fuel_type: fuelType,
      transmission,
      color,
      price: parseInt(price),
      description,
      city,
      contact_phone: phone,
      contact_telegram: telegram || null,
    })

    const tg = window.Telegram?.WebApp
    if (tg) {
      try {
        tg.sendData(data)
        // If sendData succeeds, the app closes automatically
        // This line only runs if sendData doesn't close the app
        setSubmitted(true)
      } catch (e: any) {
        alert('Ошибка отправки: ' + e.message)
      }
    } else {
      alert('Откройте приложение через Telegram')
    }
  }

  if (submitted) {
    return (
      <div className="success-screen">
        <div className="icon">🎉</div>
        <h2>{TEXTS.MSG_SENT}</h2>
        <p>Мы проверим ваше объявление и опубликуем его.</p>
      </div>
    )
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

      {/* Photos */}
      <div className="photos-section">
        <label style={{ fontSize: '0.9em', fontWeight: 500, color: 'var(--hint)' }}>
          {TEXTS.LABEL_PHOTOS}
        </label>
        <p style={{ fontSize: '0.8em', color: 'var(--hint)', margin: '4px 0 8px' }}>
          {TEXTS.PHOTOS_HINT_CAR}
        </p>
        <div className="photos-grid">
          {photos.map((photo, i) => (
            <div key={i} className="photo-thumb">
              <img src={photo.preview} alt={`Фото ${i + 1}`} />
              <button className="remove-btn" onClick={() => removePhoto(i)}>×</button>
            </div>
          ))}
          {photos.length < CONFIG.MAX_CAR_PHOTOS && (
            <div className="photo-add-btn" onClick={() => fileInputRef.current?.click()}>
              <span className="plus">+</span>
              <span>Фото</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          onChange={handleAddPhotos}
        />
      </div>

      <div className="submit-section">
        <button className="btn btn-primary" onClick={handleSubmit}>
          {TEXTS.BTN_SUBMIT}
        </button>
      </div>
    </div>
  )
}
