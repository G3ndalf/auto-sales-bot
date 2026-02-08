/**
 * EditCarAd.tsx — Страница редактирования объявления авто
 *
 * Загружает данные существующего объявления через api.getCarAd(id),
 * заполняет форму (аналогичную CreateCarAd) и позволяет сохранить
 * изменения через PUT /api/ads/car/{id}.
 *
 * После сохранения объявление отправляется на повторную модерацию.
 */

import { useState, useEffect, useCallback } from 'react'
import { Garage, Banknote, MapPoint } from '@solar-icons/react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { selectStyle } from '../constants/theme'
import { api } from '../api'
import type { CarAdFull } from '../api'
import { normalizePhone } from '../utils/format'
import RegionCitySelector from '../components/RegionCitySelector'
import CharCounter from '../components/CharCounter'
import EditFormWrapper from '../components/EditFormWrapper'
import PhotoEditor from '../components/PhotoEditor'
import { useEditAd } from '../hooks/useEditAd'
import { BRANDS } from '../data/brands'
import { COLORS } from '../constants/colors'

export default function EditCarAd() {
  // ===== Общий хук для логики редактирования =====
  const {
    id,
    isAdmin,
    loading,
    submitting,
    saved,
    formErrors,
    originalData,
    errorsRef,
    handleSubmit: submitAd,
    setFormErrors,
  } = useEditAd<CarAdFull>({
    adType: 'car',
    loadAd: useCallback((adId: number) => api.getCarAd(adId), []),
    updateAd: useCallback(
      (adId: number, data: Record<string, unknown>, admin: boolean) =>
        api.updateCarAd(adId, data, admin),
      []
    ),
  })

  // ===== Состояние формы =====
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [isOtherBrand, setIsOtherBrand] = useState(false)
  const [isOtherModel, setIsOtherModel] = useState(false)
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [transmission, setTransmission] = useState('')
  const [color, setColor] = useState('')
  const [isOtherColor, setIsOtherColor] = useState(false)
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [hasGbo, setHasGbo] = useState(false) // F2: has_gbo state
  const [telegram, setTelegram] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  /**
   * Заполняем форму после загрузки данных
   */
  useEffect(() => {
    if (!originalData) return

    const data = originalData

    // Pre-fill все поля из существующего объявления
    const loadedBrand = data.brand || ''
    setBrand(loadedBrand)

    const loadedModel = data.model || ''
    setModel(loadedModel)

    if (loadedBrand && !BRANDS.some(b => b.name === loadedBrand)) {
      setIsOtherBrand(true)
    } else if (loadedBrand && loadedModel) {
      // Проверяем, есть ли модель в списке моделей бренда
      const brandData = BRANDS.find(b => b.name === loadedBrand)
      if (brandData && !brandData.models.includes(loadedModel)) {
        setIsOtherModel(true)
      }
    }

    setYear(data.year ? String(data.year) : '')
    setMileage(data.mileage ? String(data.mileage) : '')
    setTransmission(data.transmission || '')

    const loadedColor = data.color || ''
    setColor(loadedColor)
    if (loadedColor && !COLORS.includes(loadedColor)) {
      setIsOtherColor(true)
    }

    setHasGbo(data.has_gbo || false) // F2: загрузка has_gbo
    setPrice(data.price ? String(data.price) : '')
    setDescription(data.description || '')
    const loadedCity = data.city || ''
    setCity(loadedCity)
    // F1: Загрузка region из данных объявления, fallback на автоопределение по городу
    if (data.region) {
      setRegion(data.region)
    } else {
      const foundRegion = TEXTS.REGIONS.find(r =>
        (r.cities as readonly string[]).includes(loadedCity)
      )
      if (foundRegion) setRegion(foundRegion.name)
    }
    setPhone(data.contact_phone || '')
    setTelegram(data.contact_telegram || '')
  }, [originalData])

  /** Отметить поле как "тронутое" для валидации */
  const touch = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  /** Состояние валидации поля */
  const fieldState = (value: string, field: string): 'idle' | 'valid' | 'invalid' => {
    if (!touched[field] && !value) return 'idle'
    return value.trim() ? 'valid' : 'invalid'
  }

  /** Все обязательные поля заполнены */
  const allRequired = !!(brand && model && year && price && city && phone)

  /**
   * Обработчик отправки формы
   */
  const handleSubmit = async () => {
    // Показать валидацию на всех обязательных полях
    setTouched({ brand: true, model: true, year: true, price: true, city: true, phone: true })

    if (!allRequired) return
    if (!id) return

    const adData: Record<string, unknown> = {
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year),
      mileage: parseInt(mileage) || 0,
      transmission,
      color: color.trim(),
      has_gbo: hasGbo, // F2: отправка has_gbo
      price: parseInt(price),
      description: description.trim(),
      region, // F1: отправка region
      city,
      contact_phone: phone.trim(),
      contact_telegram: telegram.trim() || null,
    }

    await submitAd(adData)
  }

  /** CSS-класс поля формы */
  const fc = (field: string, value: string) => {
    const s = fieldState(value, field)
    return `form-field ${s === 'valid' ? 'field-valid' : s === 'invalid' ? 'field-invalid' : ''}`
  }

  return (
    <EditFormWrapper
      ref={errorsRef}
      title="Авто"
      loading={loading}
      saved={saved}
      notFound={!loading && !originalData}
      isAdmin={isAdmin}
      formErrors={formErrors}
      submitting={submitting}
      allRequired={allRequired}
      onSubmit={handleSubmit}
    >
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
              style={selectStyle}
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
                setIsOtherModel(false)
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
              <>
                <select
                  className={fc('model', model)}
                  style={selectStyle}
                  value={isOtherModel ? '__other' : model}
                  onChange={e => {
                    const v = e.target.value
                    if (v === '__other') {
                      setIsOtherModel(true)
                      setModel('')
                    } else {
                      setIsOtherModel(false)
                      setModel(v)
                    }
                    touch('model')
                  }}
                  disabled={!brand}
                >
                  <option value="">{brand ? 'Выберите модель' : 'Сначала выберите марку'}</option>
                  {(BRANDS.find(b => b.name === brand)?.models ?? []).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="__other">Другая</option>
                </select>
                {isOtherModel && (
                  <input
                    className={fc('model', model)}
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    onBlur={() => touch('model')}
                    placeholder="Введите модель..."
                    style={{ marginTop: 8 }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="required">{TEXTS.LABEL_YEAR}</label>
            <select
              className={fc('year', year)}
              style={selectStyle}
              value={year}
              onChange={e => { setYear(e.target.value); touch('year') }}
            >
              <option value="">Год выпуска</option>
              {Array.from({ length: CONFIG.MAX_YEAR - CONFIG.MIN_YEAR + 1 }, (_, i) => CONFIG.MAX_YEAR - i).map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
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
            <label>{TEXTS.LABEL_COLOR}</label>
            <select
              className="form-field"
              style={selectStyle}
              value={isOtherColor ? '__other' : color}
              onChange={e => {
                const v = e.target.value
                if (v === '__other') {
                  setIsOtherColor(true)
                  setColor('')
                } else {
                  setIsOtherColor(false)
                  setColor(v)
                }
              }}
            >
              <option value="">Выберите цвет</option>
              {COLORS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__other">Другой</option>
            </select>
            {isOtherColor && (
              <input
                className="form-field"
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="Введите цвет..."
                style={{ marginTop: 8 }}
              />
            )}
          </div>
          <div className="form-group">
            <label>{TEXTS.LABEL_TRANSMISSION}</label>
            <select
              className="form-field"
              style={selectStyle}
              value={transmission}
              onChange={e => setTransmission(e.target.value)}
            >
              <option value="">{TEXTS.PLACEHOLDER_SELECT}</option>
              {TEXTS.TRANSMISSIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* F2: Toggle ГБО */}
        <div
          className="form-group"
          onClick={() => setHasGbo(!hasGbo)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          <div style={{
            width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
            background: hasGbo ? '#F59E0B' : 'var(--bg-tertiary)',
            transition: 'background 0.2s',
            position: 'relative',
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '10px',
              background: '#fff', position: 'absolute', top: '2px',
              left: hasGbo ? '22px' : '2px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </div>
          <span style={{ fontSize: '15px' }}>Установлено ГБО</span>
        </div>
      </div>

      {/* Редактор фотографий */}
      {id && <PhotoEditor adType="car" adId={parseInt(id)} />}

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
          <div style={{ textAlign: 'right', marginTop: 4 }}>
            <CharCounter value={description} max={1000} />
          </div>
        </div>
      </div>

      {/* Section: Город и контакты */}
      <div className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon"><MapPoint size={16} weight="BoldDuotone" /></span>
          <span>Город и контакты</span>
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
              className={fc('phone', phone)}
              type="tel"
              value={phone}
              onChange={e => setPhone(normalizePhone(e.target.value))}
              onBlur={() => touch('phone')}
              placeholder="8-999-123-45-67"
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
    </EditFormWrapper>
  )
}
