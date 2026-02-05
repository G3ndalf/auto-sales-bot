import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Magnifer, Garage, MapPoint, Eye, DangerCircle, CloseCircle, Tuning2, AltArrowUp, AltArrowDown } from '@solar-icons/react'
import { api } from '../api'
import type { CarAdPreview, Brand } from '../api'
import { TEXTS } from '../constants/texts'
import { useBackButton } from '../hooks/useBackButton'
import { SkeletonList } from '../components/Skeleton'

/**
 * Кэш данных списка авто — сохраняется в памяти модуля
 * между mount/unmount. При возврате из карточки объявления
 * восстанавливает данные, фильтры и позицию скролла.
 */
interface CarsCache {
  ads: CarAdPreview[]
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
let _carsCache: CarsCache | null = null

interface Props {
  embedded?: boolean
}

/**
 * CarsList — страница каталога автомобилей.
 *
 * Поддерживает:
 * - Фильтрацию по марке и городу (dropdowns)
 * - Полнотекстовый поиск с debounce 400ms (параметр API: q)
 * - Сортировку по дате, цене, пробегу (параметр API: sort)
 * - Пагинацию «Показать ещё»
 */
export default function CarsList({ embedded }: Props) {
  useBackButton(embedded ? null : '/catalog')

  // ─── Восстановление из кэша при возврате из карточки ────────
  const [restoredCache] = useState(() => _carsCache)

  const [ads, setAds] = useState<CarAdPreview[]>(restoredCache?.ads || [])
  const [total, setTotal] = useState(restoredCache?.total || 0)
  const [loading, setLoading] = useState(!restoredCache)
  const [offset, setOffset] = useState(restoredCache?.offset || 0)
  const [error, setError] = useState(false)

  // ─── Фильтры (марка, город) ────────────────────────────────
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState(restoredCache?.brand || '')
  const [selectedCity, setSelectedCity] = useState(restoredCache?.city || '')

  // ─── Панель фильтров (свёрнута по умолчанию) ──────────────
  const [filtersOpen, setFiltersOpen] = useState(false)

  // ─── Поиск (debounce 400ms) ────────────────────────────────
  const [searchQuery, setSearchQuery] = useState(restoredCache?.query || '')
  /** Ref для хранения таймера debounce — очищается при каждом новом вводе */
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Очистка debounce-таймера при размонтировании компонента */
  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [])

  // ─── Фильтры цены и года ─────────────────────────────────
  const [priceMin, setPriceMin] = useState(restoredCache?.priceMin || '')
  const [priceMax, setPriceMax] = useState(restoredCache?.priceMax || '')
  const [yearMin, setYearMin] = useState(restoredCache?.yearMin || '')
  const [yearMax, setYearMax] = useState(restoredCache?.yearMax || '')

  // ─── Сортировка ────────────────────────────────────────────
  // Варианты: date_new (default), date_old, price_asc, price_desc, mileage_asc
  const [sortOrder, setSortOrder] = useState(restoredCache?.sort || 'date_new')

  // Загружаем справочник марок один раз при монтировании
  useEffect(() => {
    api.getBrands().then(setBrands).catch(() => {})
  }, [])

  /**
   * buildParams — собирает все query-параметры для API-запроса.
   * Включает offset, limit, brand, city, q (поиск), sort (сортировка),
   * price_min, price_max, year_min, year_max (фильтры цены и года).
   */
  const buildParams = (
    newOffset: number,
    brand = selectedBrand,
    city = selectedCity,
    q = searchQuery,
    sort = sortOrder
  ) => {
    const params: Record<string, string> = { offset: String(newOffset), limit: '20' }
    if (brand) params.brand = brand
    if (city) params.city = city
    // Поисковый запрос передаём только если непустой
    if (q.trim()) params.q = q.trim()
    // Сортировку передаём всегда (бэкенд использует default если не указана)
    if (sort) params.sort = sort
    // Фильтры цены и года — передаём только непустые
    if (priceMin) params.price_min = priceMin
    if (priceMax) params.price_max = priceMax
    if (yearMin) params.year_min = yearMin
    if (yearMax) params.year_max = yearMax
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
      const data = await api.getCarAds(params)
      if (newOffset === 0) {
        // Первая страница — заменяем полностью
        setAds(data.items)
      } else {
        // Подгрузка — добавляем к существующим
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
      // Данные уже восстановлены через useState — нужно только вернуть скролл.
      // Несколько попыток: AnimatePresence mode="wait" запускает enter-анимацию
      // на 250ms после mount, и во время неё скролл может сбрасываться.
      // Попытки: сразу (0), во время анимации (150), после анимации (400).
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

  // ─── Сохранение в кэш при unmount ──────────────────────────
  /** Ref для доступа к актуальному state в cleanup-функции */
  const cacheRef = useRef({ ads, total, offset, brand: selectedBrand, city: selectedCity, query: searchQuery, sort: sortOrder, priceMin, priceMax, yearMin, yearMax })
  useEffect(() => {
    cacheRef.current = { ads, total, offset, brand: selectedBrand, city: selectedCity, query: searchQuery, sort: sortOrder, priceMin, priceMax, yearMin, yearMax }
  })
  useEffect(() => {
    return () => {
      const s = cacheRef.current
      _carsCache = { ...s, scrollY: window.scrollY }
    }
  }, [])

  // ─── Обработчики фильтров ──────────────────────────────────

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand)
    setOffset(0)
    setAds([])
    loadAds(0, brand, selectedCity, searchQuery, sortOrder)
  }

  const handleCityChange = (city: string) => {
    setSelectedCity(city)
    setOffset(0)
    setAds([])
    loadAds(0, selectedBrand, city, searchQuery, sortOrder)
  }

  // ─── Обработчик поиска с debounce ─────────────────────────

  /**
   * handleSearchChange — обновляет поле ввода мгновенно,
   * но запрос к API отправляет только через 400ms после
   * последнего нажатия (debounce).
   */
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Сбрасываем предыдущий таймер
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      // Сбрасываем offset и загружаем с новым поисковым запросом
      setOffset(0)
      setAds([])
      loadAds(0, selectedBrand, selectedCity, value, sortOrder)
    }, 400)
  }

  /** clearSearch — очистка поля поиска и перезагрузка без q */
  const clearSearch = () => {
    setSearchQuery('')
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    setOffset(0)
    setAds([])
    loadAds(0, selectedBrand, selectedCity, '', sortOrder)
  }

  // ─── Обработчик сортировки ─────────────────────────────────

  /**
   * handleSortChange — при смене сортировки сбрасываем offset
   * и перезагружаем список с новым параметром sort.
   */
  const handleSortChange = (sort: string) => {
    setSortOrder(sort)
    setOffset(0)
    setAds([])
    loadAds(0, selectedBrand, selectedCity, searchQuery, sort)
  }

  const formatPrice = (n: number) =>
    n.toLocaleString('ru-RU') + ' ₽'

  if (loading && ads.length === 0) {
    return <SkeletonList count={5} />
  }

  return (
    <div className={embedded ? 'catalog-content' : 'list-page'}>
      {!embedded && (
        <h1><Garage size={20} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Все авто</h1>
      )}

      {/* ─── Поле поиска (выше фильтров) ─────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        {/* Иконка поиска слева */}
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
          <Magnifer size={16} weight="BoldDuotone" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Поиск по марке, модели..."
          style={{ width: '100%', padding: '10px 36px', borderRadius: 10, fontSize: 15, border: '1px solid rgba(255,255,255,0.08)', background: '#1F2937', color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }}
        />
        {/* Кнопка очистки ✕ — показываем только при непустом поле */}
        {searchQuery && (
          <button
            onClick={clearSearch}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9CA3AF', padding: 4, lineHeight: 1 }}
            aria-label="Очистить поиск"
          >
            <CloseCircle size={18} weight="BoldDuotone" />
          </button>
        )}
      </div>

      {/* ─── Кнопка фильтров + раскрывающаяся панель ─────────── */}
      {(() => {
        /** Считаем количество активных фильтров для бейджа */
        const activeCount = [selectedBrand, selectedCity, priceMin, priceMax, yearMin, yearMax]
          .filter(Boolean).length + (sortOrder !== 'date_new' ? 1 : 0)
        return (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setFiltersOpen(prev => !prev)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: 10, marginBottom: 8, border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#F9FAFB', fontSize: '0.95em', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', background: filtersOpen ? 'rgba(245,158,11,0.15)' : '#1A2332' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Tuning2 size={16} weight="BoldDuotone" /> Фильтры</span>
            {activeCount > 0 && (
              <span style={{ background: '#F59E0B', color: '#0B0F19', borderRadius: 10, padding: '1px 7px', fontSize: '0.8em', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                {activeCount}
              </span>
            )}
            <span style={{ marginLeft: 'auto', opacity: 0.6, display: 'inline-flex', alignItems: 'center' }}>
              {filtersOpen ? <AltArrowUp size={14} weight="BoldDuotone" /> : <AltArrowDown size={14} weight="BoldDuotone" />}
            </span>
          </motion.button>
        )
      })()}

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
              {/* Марка + Город */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select className="filter-select" style={{ flex: '1 1 0', minWidth: 0, width: 0 }} value={selectedBrand}
                  onChange={e => setSelectedBrand(e.target.value)}>
                  <option value="">Все марки</option>
                  {brands.map(b => (
                    <option key={b.brand} value={b.brand}>{b.brand} ({b.count})</option>
                  ))}
                </select>
                <select className="filter-select" style={{ flex: '1 1 0', minWidth: 0, width: 0 }} value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}>
                  <option value="">Все города</option>
                  {TEXTS.REGIONS.map(r => (
                    <optgroup key={r.name} label={r.name}>
                      {r.cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Сортировка */}
              <select className="filter-select" style={{ width: '100%', marginBottom: 8 }} value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}>
                <option value="date_new">Сначала новые</option>
                <option value="date_old">Сначала старые</option>
                <option value="price_asc">Цена ↑</option>
                <option value="price_desc">Цена ↓</option>
                <option value="mileage_asc">Пробег ↑</option>
              </select>

              {/* Цена от-до */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="number" placeholder="Цена от" value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  style={{ flex: '1 1 0', minWidth: 0, width: 0, padding: '10px 12px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: '0.9em', background: '#1F2937', color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }} />
                <input type="number" placeholder="Цена до" value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  style={{ flex: '1 1 0', minWidth: 0, width: 0, padding: '10px 12px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: '0.9em', background: '#1F2937', color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Год от-до */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input type="number" placeholder="Год от" value={yearMin}
                  onChange={e => setYearMin(e.target.value)}
                  style={{ flex: '1 1 0', minWidth: 0, width: 0, padding: '10px 12px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: '0.9em', background: '#1F2937', color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }} />
                <input type="number" placeholder="Год до" value={yearMax}
                  onChange={e => setYearMax(e.target.value)}
                  style={{ flex: '1 1 0', minWidth: 0, width: 0, padding: '10px 12px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: '0.9em', background: '#1F2937', color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Кнопки: Применить + Сбросить */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-gradient" style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: '0.9em' }}
                  onClick={() => { setOffset(0); setAds([]); loadAds(0); setFiltersOpen(false) }}>
                  Применить
                </button>
                <button className="btn" style={{ padding: '10px 16px', borderRadius: 12, fontSize: '0.9em', background: '#1F2937', color: '#F9FAFB' }}
                  onClick={() => {
                    setSelectedBrand(''); setSelectedCity(''); setSortOrder('date_new')
                    setPriceMin(''); setPriceMax(''); setYearMin(''); setYearMax('')
                    setOffset(0); setAds([]); loadAds(0, '', '', searchQuery, 'date_new')
                    setFiltersOpen(false)
                  }}>
                  Сбросить
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {total > 0 && <p className="list-count">Найдено: {total}</p>}

      {error && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#9CA3AF' }}>
          <p style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><DangerCircle size={48} weight="BoldDuotone" /></p>
          <p style={{ marginBottom: 16 }}>Не удалось загрузить объявления</p>
          <button
            className="btn btn-secondary block mx-auto"
            onClick={() => loadAds()}
          >
            🔄 Повторить
          </button>
        </div>
      )}

      {!loading && !error && ads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Garage size={48} weight="BoldDuotone" /></div>
          <p>Пока нет объявлений</p>
        </div>
      ) : (
        <div className="ads-list">
          {ads.map((ad, i) => (
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Link to={`/car/${ad.id}`} className="ad-card">
                <div className="ad-card-photo">
                  {ad.photo ? (
                    <img src={api.photoUrl(ad.photo)} alt="" loading="lazy" />
                  ) : (
                    <div className="no-photo"><Garage size={24} weight="BoldDuotone" /></div>
                  )}
                </div>
                <div className="ad-card-info">
                  <div className="ad-card-title">{ad.brand} {ad.model}</div>
                  <div className="ad-card-year">{ad.year} г.</div>
                  <div className="ad-card-details">
                    {ad.mileage.toLocaleString('ru-RU')} км • {ad.fuel_type} • {ad.transmission}
                  </div>
                  <div className="ad-card-location"><MapPoint size={14} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle' }} /> {ad.city} <span style={{ color: '#9CA3AF', fontSize: '0.85em', marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 2, verticalAlign: 'middle' }}><Eye size={14} weight="BoldDuotone" /> {ad.view_count}</span></div>
                  <div className="ad-card-price">{formatPrice(ad.price)}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
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
