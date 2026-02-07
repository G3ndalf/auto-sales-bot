/**
 * EditPlateAd.tsx — Страница редактирования объявления номера
 *
 * Загружает данные существующего объявления через api.getPlateAd(id),
 * заполняет форму (аналогичную CreatePlateAd) и позволяет сохранить
 * изменения через PUT /api/ads/plate/{id}.
 *
 * После сохранения объявление отправляется на повторную модерацию.
 */

import { useState, useEffect, useCallback } from 'react'
import { Hashtag, MapPoint } from '@solar-icons/react'
import { TEXTS } from '../constants/texts'
import { CONFIG } from '../constants/config'
import { api } from '../api'
import type { PlateAdFull } from '../api'
import RegionCitySelector from '../components/RegionCitySelector'
import CharCounter from '../components/CharCounter'
import EditFormWrapper from '../components/EditFormWrapper'
import { useEditAd } from '../hooks/useEditAd'

export default function EditPlateAd() {
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
  } = useEditAd<PlateAdFull>({
    adType: 'plate',
    loadAd: useCallback((adId: number) => api.getPlateAd(adId), []),
    updateAd: useCallback(
      (adId: number, data: Record<string, unknown>, admin: boolean) =>
        api.updatePlateAd(adId, data, admin),
      []
    ),
  })

  // ===== Состояние формы =====
  const [plateNumber, setPlateNumber] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')

  /**
   * Заполняем форму после загрузки данных
   */
  useEffect(() => {
    if (!originalData) return

    const data = originalData

    // Pre-fill все поля из существующего объявления
    setPlateNumber(data.plate_number || '')
    setPrice(data.price ? String(data.price) : '')
    setDescription(data.description || '')
    const loadedCity = data.city || ''
    setCity(loadedCity)
    // F1: Загрузка region из данных, fallback на автоопределение
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

  /** Все обязательные поля заполнены */
  const allRequired = !!(plateNumber && price && city && phone)

  /**
   * Обработчик отправки формы
   */
  const handleSubmit = async () => {
    if (!allRequired) {
      setFormErrors(['Заполните все обязательные поля: номер, цена, город, телефон'])
      return
    }
    if (!id) return

    const adData: Record<string, unknown> = {
      plate_number: plateNumber.trim(),
      price: parseInt(price),
      description: description.trim(),
      region, // F1: отправка region
      city,
      contact_phone: phone.trim(),
      contact_telegram: telegram.trim() || null,
    }

    await submitAd(adData)
  }

  return (
    <EditFormWrapper
      ref={errorsRef}
      title="Номер"
      loading={loading}
      saved={saved}
      notFound={!loading && !originalData}
      isAdmin={isAdmin}
      formErrors={formErrors}
      submitting={submitting}
      allRequired={allRequired}
      onSubmit={handleSubmit}
    >
      {/* Section: Номерной знак */}
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
          <div style={{ textAlign: 'right', marginTop: 4 }}>
            <CharCounter value={description} max={1000} />
          </div>
        </div>
      </div>

      {/* F18: Предупреждение о невозможности изменить фото */}
      <div
        style={{
          padding: '10px 16px',
          marginBottom: '12px',
          borderRadius: '8px',
          backgroundColor: '#3B82F622',
          border: '1px solid #3B82F644',
          color: '#60A5FA',
          fontSize: '12px',
          lineHeight: '1.4',
        }}
      >
        📷 Фото нельзя изменить. Для смены фото создайте новое объявление.
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
    </EditFormWrapper>
  )
}
