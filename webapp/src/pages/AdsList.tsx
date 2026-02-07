import { useState, useEffect, useRef, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Garage, Hashtag } from '@solar-icons/react'
import { api } from '../api'
import type { CarAdPreview, PlateAdPreview, Brand } from '../api'
import { TEXTS } from '../constants/texts'
import { useBackButton } from '../hooks/useBackButton'
import { listStagger } from '../constants/animations'
import AdCard from '../components/AdCard'
import SearchInput from '../components/SearchInput'
import FilterToggleButton from '../components/FilterToggleButton'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'

// ─── Типы ─────────────────────────────────────────────────────

type AdType = 'car' | 'plate'
type AdPreview = CarAdPreview | PlateAdPreview
type FilterKey = 'brand' | 'city' | 'priceMin' | 'priceMax' | 'yearMin' | 'yearMax'
type SortOption = 'date_new' | 'date_old' | 'price_asc' | 'price_desc' | 'mileage_asc'

interface AdsCache {
  ads: AdPreview[]
  total: number
  offset: number
  scrollY: number
  brand: string
  city: string
  query: string
  sort: string
  priceMin: string
  priceMax: string
  yearMin: string
  yearMax: string
}

interface AdConfig {
  fetchAds: (params: Record<string, string>) => Promise<{ items: AdPreview[]; total: number }>
  title: string
  icon: ReactNode
  emptyMessage: string
  searchPlaceholder: string
  filters: FilterKey[]
  sortOptions: SortOption[]
  cacheKey: 'cars' | 'plates'
}

// ─── Кэши ─────────────────────────────────────────────────────

let _carsCache: AdsCache | null = null
let _platesCache: AdsCache | null = null

/** Регистрируем глобальный сброс кэшей для pull-to-refresh */
window.__clearCarsCache = () => { _carsCache = null }
window.__clearPlatesCache = () => { _platesCache = null }

// ─── Конфигурации ─────────────────────────────────────────────

const getConfig = (adType: AdType): AdConfig => {
  if (adType === 'car') {
    return {
      fetchAds: api.getCarAds,
      title: 'Все авто',
      icon: <Garage size={20} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />,
      emptyMessage: 'Пока нет объявлений',
      searchPlaceholder: 'Поиск по марке, модели...',
      filters: ['brand', 'city', 'priceMin', 'priceMax', 'yearMin', 'yearMax'],
      sortOptions: ['date_new', 'date_old', 'price_asc', 'price_desc', 'mileage_asc'],
      cacheKey: 'cars',
    }
  }
  return {
    fetchAds: api.getPlateAds,
    title: 'Номера',
    icon: <Hashtag size={20} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />,
    emptyMessage: 'Пока нет объявлений',
    searchPlaceholder: 'Поиск по номеру...',
    filters: ['city', 'priceMin', 'priceMax'],
    sortOptions: ['date_new', 'date_old', 'price_asc', 'price_desc'],
    cacheKey: 'plates',
  }
}

const getCache = (cacheKey: 'cars' | 'plates'): AdsCache | null => {
  return cacheKey === 'cars' ? _carsCache : _platesCache
}

const setCache = (cacheKey: 'cars' | 'plates', cache: AdsCache) => {
  if (cacheKey === 'cars') {
    _carsCache = cache
  } else {
    _platesCache = cache
  }
}

// ─── Компонент ────────────────────────────────────────────────

interface AdsListProps {
  adType: AdType
  embedded?: boolean
}

/**
 * AdsList — универсальная страница каталога объявлений.
 *
 * Поддерживает:
 * - Фильтрацию по марке (только авто), городу, цене, году
 * - Полнотекстовый поиск с debounce 400ms (параметр API: q)
 * - Сортировку по дате, цене, пробегу (параметр API: sort)
 * - Пагинацию «Показать ещё»
 * - Кэширование и восстановление scroll position
 */
export default function AdsList({ adType, embedded }: AdsListProps) {
  const config = getConfig(adType)
  
  useBackButton(embedded ? null : '/catalog')

  // ─── Восстановление из кэша при возврате из карточки ────────
  const [restoredCache] = useState(() => getCache(config.cacheKey))

  const [ads, setAds] = useState<AdPreview[]>(restoredCache?.ads || [])
  const [total, setTotal] = useState(restoredCache?.total || 0)
  const [loading, setLoading] = useState(!restoredCache)
  const [offset, setOffset] = useState(restoredCache?.offset || 0)
  const [error, setError] = useState(false)

  // ─── Фильтры ───────────────────────────────────────────────
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState(restoredCache?.brand || '')
  const [selectedCity, setSelectedCity] = useState(restoredCache?.city || '')
  const [priceMin, setPriceMin] = useState(restoredCache?.priceMin || '')
  const [priceMax, setPriceMax] = useState(restoredCache?.priceMax || '')
  const [yearMin, setYearMin] = useState(restoredCache?.yearMin || '')
  const [yearMax, setYearMax] = useState(restoredCache?.yearMax || '')

  // ─── Панель фильтров (свёрнута по умолчанию) ──────────────
  const [filtersOpen, setFiltersOpen] = useState(false)

  // ─── Поиск (debounce 400ms) ────────────────────────────────
  const [searchQuery, setSearchQuery] = useState(restoredCache?.query || '')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [])

  // ─── Сортировка ────────────────────────────────────────────
  const [sortOrder, setSortOrder] = useState(restoredCache?.sort || 'date_new')

  // Загружаем справочник марок один раз при монтировании (только для авто)
  useEffect(() => {
    if (config.filters.includes('brand')) {
      api.getBrands().then(setBrands).catch(() => {})
    }
  }, [config.filters])

  /**
   * buildParams — собирает все query-параметры для API-запроса.
   */
  const buildParams = (
    newOffset: number,
    brand = selectedBrand,
    city = selectedCity,
    q = searchQuery,
    sort = sortOrder
  ) => {
    const params: Record<string, string> = { offset: String(newOffset), limit: '20' }
    if (brand && config.filters.includes('brand')) params.brand = brand
    if (city) params.city = city
    if (q.trim()) params.q = q.trim()
    if (sort) params.sort = sort
    if (priceMin) params.price_min = priceMin
    if (priceMax) params.price_max = priceMax
    if (yearMin && config.filters.includes('yearMin')) params.year_min = yearMin
    if (yearMax && config.filters.includes('yearMax')) params.year_max = yearMax
    return params
  }

  /**
   * loadAds — загружает список объявлений.
   * При newOffset=0 заменяет список, иначе дозагружает (пагинация).
   */
  const loadAds = async (
    newOffset = 0,
    brand = selectedBrand,
    city = selectedCity,
    q = searchQuery,
    sort = sortOrder
  ) => {
    setLoading(true)
    setError(false)
    try {
      const params = buildParams(newOffset, brand, city, q, sort)
      const data = await config.fetchAds(params)
      if (newOffset === 0) {
        setAds(data.items)
      } else {
        setAds(prev => [...prev, ...data.items])
      }
      setTotal(data.total)
      setOffset(newOffset + data.items.length)
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  // ─── Начальная загрузка / восстановление из кэша ──────────
  useEffect(() => {
    if (restoredCache) {
      const target = restoredCache.scrollY
      if (target > 0) {
        const timers = [0, 150, 400].map(delay =>
          setTimeout(() => window.scrollTo(0, target), delay)
        )
        return () => timers.forEach(clearTimeout)
      }
    } else {
      loadAds(0)
    }
  }, [])

  // ─── Сохранение в кэш ─────────────────────────────────────
  const cacheRef = useRef({
    ads, total, offset,
    brand: selectedBrand, city: selectedCity,
    query: searchQuery, sort: sortOrder,
    priceMin, priceMax, yearMin, yearMax
  })
  const scrollRef = useRef(0)

  useEffect(() => {
    cacheRef.current = {
      ads, total, offset,
      brand: selectedBrand, city: selectedCity,
      query: searchQuery, sort: sortOrder,
      priceMin, priceMax, yearMin, yearMax
    }
  })

  useEffect(() => {
    const handler = () => { scrollRef.current = window.scrollY }
    window.addEventListener('scroll', handler, { passive: true })
    scrollRef.current = window.scrollY
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    return () => {
      setCache(config.cacheKey, { ...cacheRef.current, scrollY: scrollRef.current })
    }
  }, [config.cacheKey])

  // ─── Обработчики ──────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setOffset(0)
      setAds([])
      loadAds(0, selectedBrand, selectedCity, value, sortOrder)
    }, 400)
  }

  const clearSearch = () => {
    setSearchQuery('')
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    setOffset(0)
    setAds([])
    loadAds(0, selectedBrand, selectedCity, '', sortOrder)
  }

  const handleApplyFilters = () => {
    setOffset(0)
    setAds([])
    loadAds(0)
    setFiltersOpen(false)
  }

  const handleResetFilters = () => {
    setSelectedBrand('')
    setSelectedCity('')
    setSortOrder('date_new')
    setPriceMin('')
    setPriceMax('')
    setYearMin('')
    setYearMax('')
    setOffset(0)
    setAds([])
    loadAds(0, '', '', searchQuery, 'date_new')
    setFiltersOpen(false)
  }

  // ─── Подсчёт активных фильтров ────────────────────────────
  const activeFiltersCount = [
    selectedBrand,
    selectedCity,
    priceMin,
    priceMax,
    ...(config.filters.includes('yearMin') ? [yearMin, yearMax] : [])
  ].filter(Boolean).length + (sortOrder !== 'date_new' ? 1 : 0)

  // ─── Рендер ────────────────────────────────────────────────

  if (loading && ads.length === 0) return null

  const EmptyIcon = adType === 'car'
    ? <Garage size={48} weight="BoldDuotone" />
    : <Hashtag size={48} weight="BoldDuotone" />

  const inputStyle = {
    flex: '1 1 0',
    minWidth: 0,
    width: 0,
    padding: '10px 12px',
    border: '1.5px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    fontSize: '0.9em',
    background: '#1F2937',
    color: '#F9FAFB',
    outline: 'none',
    boxSizing: 'border-box' as const
  }

  return (
    <div className={embedded ? 'catalog-content' : 'list-page'}>
      {!embedded && (
        <h1>{config.icon} {config.title}</h1>
      )}

      {/* Поиск */}
      <div style={{ marginBottom: 10 }}>
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          onClear={clearSearch}
          placeholder={config.searchPlaceholder}
        />
      </div>

      {/* Кнопка фильтров */}
      <div style={{ marginBottom: 8 }}>
        <FilterToggleButton
          isOpen={filtersOpen}
          activeCount={activeFiltersCount}
          onClick={() => setFiltersOpen(prev => !prev)}
        />
      </div>

      {/* Панель фильтров */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: 12, marginBottom: 8, border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, background: '#1A2332', overflow: 'hidden' }}>
              
              {/* Марка + Город (для авто) или только Город (для номеров) */}
              {config.filters.includes('brand') ? (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select
                    className="filter-select"
                    style={{ flex: '1 1 0', minWidth: 0, width: 0 }}
                    value={selectedBrand}
                    onChange={e => setSelectedBrand(e.target.value)}
                  >
                    <option value="">Все марки</option>
                    {brands.map(b => (
                      <option key={b.brand} value={b.brand}>{b.brand} ({b.count})</option>
                    ))}
                  </select>
                  <select
                    className="filter-select"
                    style={{ flex: '1 1 0', minWidth: 0, width: 0 }}
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                  >
                    <option value="">Все города</option>
                    {TEXTS.REGIONS.map(r => (
                      <optgroup key={r.name} label={r.name}>
                        {r.cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ) : (
                <select
                  className="filter-select"
                  style={{ width: '100%', marginBottom: 8 }}
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                >
                  <option value="">Все города</option>
                  {TEXTS.REGIONS.map(r => (
                    <optgroup key={r.name} label={r.name}>
                      {r.cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  ))}
                </select>
              )}

              {/* Сортировка */}
              <select
                className="filter-select"
                style={{ width: '100%', marginBottom: 8 }}
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
              >
                <option value="date_new">Сначала новые</option>
                <option value="date_old">Сначала старые</option>
                <option value="price_asc">Цена ↑</option>
                <option value="price_desc">Цена ↓</option>
                {config.sortOptions.includes('mileage_asc') && (
                  <option value="mileage_asc">Пробег ↑</option>
                )}
              </select>

              {/* Цена от-до */}
              <div style={{ display: 'flex', gap: 8, marginBottom: config.filters.includes('yearMin') ? 8 : 12 }}>
                <input
                  type="number"
                  placeholder="Цена от"
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="number"
                  placeholder="Цена до"
                  value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Год от-до (только для авто) */}
              {config.filters.includes('yearMin') && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    type="number"
                    placeholder="Год от"
                    value={yearMin}
                    onChange={e => setYearMin(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    placeholder="Год до"
                    value={yearMax}
                    onChange={e => setYearMax(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Кнопки: Применить + Сбросить */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-gradient"
                  style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: '0.9em' }}
                  onClick={handleApplyFilters}
                >
                  Применить
                </button>
                <button
                  className="btn"
                  style={{ padding: '10px 16px', borderRadius: 12, fontSize: '0.9em', background: '#1F2937', color: '#F9FAFB' }}
                  onClick={handleResetFilters}
                >
                  Сбросить
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {total > 0 && <p className="list-count">Найдено: {total}</p>}

      {error && (
        <ErrorState
          message="Не удалось загрузить объявления"
          onRetry={() => loadAds()}
        />
      )}

      {/* Список объявлений */}
      {!loading && !error && ads.length === 0 ? (
        <EmptyState
          icon={EmptyIcon}
          message={config.emptyMessage}
        />
      ) : (
        <motion.div
          className="ads-list"
          variants={listStagger}
          initial={restoredCache ? false : 'hidden'}
          animate="visible"
        >
          {ads.map((ad) => (
            adType === 'car' ? (
              <AdCard
                key={ad.id}
                id={ad.id}
                adType="car"
                price={ad.price}
                city={ad.city}
                photo={ad.photo}
                viewCount={ad.view_count}
                brand={(ad as CarAdPreview).brand}
                model={(ad as CarAdPreview).model}
                year={(ad as CarAdPreview).year}
                mileage={(ad as CarAdPreview).mileage}
                fuelType={(ad as CarAdPreview).fuel_type}
                transmission={(ad as CarAdPreview).transmission}
              />
            ) : (
              <AdCard
                key={ad.id}
                id={ad.id}
                adType="plate"
                price={ad.price}
                city={ad.city}
                photo={ad.photo}
                viewCount={ad.view_count}
                plateNumber={(ad as PlateAdPreview).plate_number}
              />
            )
          ))}
        </motion.div>
      )}

      {ads.length < total && (
        <button
          className="btn btn-secondary load-more"
          onClick={() => loadAds(offset)}
          disabled={loading}
        >
          {loading ? 'Загрузка...' : 'Показать ещё'}
        </button>
      )}
    </div>
  )
}
