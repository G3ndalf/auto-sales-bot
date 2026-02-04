import { useState, useRef } from 'react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { useBackButton } from '../hooks/useBackButton'

interface PhotoFile {
  file: File
  preview: string
}

export default function CreatePlateAd() {
  const [plateNumber, setPlateNumber] = useState('')
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

    const remaining = CONFIG.MAX_PLATE_PHOTOS - photos.length
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
    if (!plateNumber || !price || !city || !phone) {
      alert('Заполните обязательные поля: номер, цена, город, телефон')
      return
    }

    const data = JSON.stringify({
      type: 'plate_ad',
      plate_number: plateNumber,
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
      <h1>{TEXTS.PLATE_FORM_TITLE}</h1>

      <div className="form-group">
        <label>{TEXTS.LABEL_PLATE_NUMBER}</label>
        <input
          type="text"
          value={plateNumber}
          onChange={e => setPlateNumber(e.target.value.toUpperCase())}
          placeholder="А777АА 07"
          style={{ fontSize: '1.3em', fontWeight: 700, letterSpacing: '0.05em' }}
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
          {TEXTS.PHOTOS_HINT_PLATE}
        </p>
        <div className="photos-grid">
          {photos.map((photo, i) => (
            <div key={i} className="photo-thumb">
              <img src={photo.preview} alt={`Фото ${i + 1}`} />
              <button className="remove-btn" onClick={() => removePhoto(i)}>×</button>
            </div>
          ))}
          {photos.length < CONFIG.MAX_PLATE_PHOTOS && (
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
