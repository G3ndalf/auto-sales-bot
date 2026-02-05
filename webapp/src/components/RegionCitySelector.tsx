/**
 * RegionCitySelector.tsx — Пара дропдаунов "Регион → Город".
 *
 * Используется в: CreateCarAd, CreatePlateAd, EditCarAd, EditPlateAd.
 * Заменяет 4 одинаковых блока с select region + select city + "Другой".
 */

import { TEXTS } from '../constants/texts'
import { selectStyle } from '../constants/theme'

interface RegionCitySelectorProps {
  region: string
  city: string
  onRegionChange: (region: string) => void
  onCityChange: (city: string) => void
  /** CSS-класс для полей (field-valid/field-invalid) */
  regionClassName?: string
  cityClassName?: string
  /** Заблокировать выбор города если регион не выбран */
  disabled?: boolean
}

export default function RegionCitySelector({
  region, city, onRegionChange, onCityChange,
  regionClassName = '', cityClassName = '', disabled = false,
}: RegionCitySelectorProps) {
  return (
    <>
      <div className="form-group">
        <label className="required">Регион</label>
        <select
          className={`form-field ${regionClassName}`}
          style={selectStyle}
          value={region}
          onChange={e => {
            onRegionChange(e.target.value)
            onCityChange('') // Сбрасываем город при смене региона
          }}
        >
          <option value="">Выберите регион...</option>
          {TEXTS.REGIONS.map(r => (
            <option key={r.name} value={r.name}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="required">Город</label>
        <select
          className={`form-field ${cityClassName}`}
          style={selectStyle}
          value={city}
          onChange={e => onCityChange(e.target.value)}
          disabled={disabled || !region}
        >
          <option value="">{region ? 'Выберите город...' : 'Сначала выберите регион'}</option>
          {region && TEXTS.REGIONS.find(r => r.name === region)?.cities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
          {region && <option value="Другой">Другой</option>}
        </select>
      </div>
    </>
  )
}
