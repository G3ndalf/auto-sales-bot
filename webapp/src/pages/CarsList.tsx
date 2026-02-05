import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import type { CarAdPreview, Brand } from '../api'
import { TEXTS } from '../constants/texts'
import { useBackButton } from '../hooks/useBackButton'
import { SkeletonList } from '../components/Skeleton'

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

  const [ads, setAds] = useState<CarAdPreview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState(false)

  // ─── Фильтры (марка, город) ────────────────────────────────
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  // ─── Панель фильтров (свёрнута по умолчанию) ──────────────
  const [filtersOpen, setFiltersOpen] = useState(false)

  // ─── Поиск (debounce 400ms) ────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  /** Ref для хранения таймера debounce — очищается при каждом новом вводе */
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Очистка debounce-таймера при размонтировании компонента */
  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [])

  // ─── Фильтры цены и года ─────────────────────────────────
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')

  // ─── Сортировка ────────────────────────────────────────────
  // Варианты: date_new (default), date_old, price_asc, price_desc, mileage_asc
  const [sortOrder, setSortOrder] = useState('date_new')

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

  // Начальная загрузка при монтировании
  useEffect(() => {
    loadAds(0)
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
        <>
          <Link to="/catalog" className="back-btn">← Каталог</Link>
          <h1>🚗 Все авто</h1>
        </>
      )}

      {/* ─── Поле поиска (выше фильтров) ─────────────────────── */}
      <div className="relative mb-2.5">
        {/* Иконка поиска слева */}
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base pointer-events-none text-[#9CA3AF]">
          🔍
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Поиск по марке, модели..."
          className="w-full py-2.5 px-9 rounded-[10px] text-[15px] border border-solid border-[rgba(255,255,255,0.08)] bg-[#1F2937] text-[#F9FAFB] outline-none box-border"
        />
        {/* Кнопка очистки ✕ — показываем только при непустом поле */}
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-lg cursor-pointer text-[#9CA3AF] p-1 leading-none"
            aria-label="Очистить поиск"
          >
            ✕
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
            className={`flex items-center justify-center gap-1.5 w-full p-2.5 mb-2 border-[1.5px] border-solid [border-color:rgba(255,255,255,0.08)] rounded-xl text-[#F9FAFB] text-[0.95em] font-semibold cursor-pointer transition-[background] duration-200 ${filtersOpen ? 'bg-[rgba(245,158,11,0.15)]' : 'bg-[#1A2332]'}`}
          >
            <span>🔍 Фильтры</span>
            {activeCount > 0 && (
              <span className="bg-[#F59E0B] text-[#0B0F19] rounded-[10px] px-[7px] py-px text-[0.8em] font-bold min-w-[18px] text-center">
                {activeCount}
              </span>
            )}
            <span className="ml-auto text-[0.85em] opacity-60">
              {filtersOpen ? '▲' : '▼'}
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
            className="overflow-hidden"
          >
            <div className="p-3 mb-2 border-[1.5px] border-solid [border-color:rgba(255,255,255,0.08)] rounded-xl bg-[#1A2332]">
              {/* Марка + Город */}
              <div className="flex gap-2 mb-2">
                <select className="filter-select flex-1" value={selectedBrand}
                  onChange={e => setSelectedBrand(e.target.value)}>
                  <option value="">Все марки</option>
                  {brands.map(b => (
                    <option key={b.brand} value={b.brand}>{b.brand} ({b.count})</option>
                  ))}
                </select>
                <select className="filter-select flex-1" value={selectedCity}
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
              <select className="filter-select w-full mb-2" value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}>
                <option value="date_new">Сначала новые</option>
                <option value="date_old">Сначала старые</option>
                <option value="price_asc">Цена ↑</option>
                <option value="price_desc">Цена ↓</option>
                <option value="mileage_asc">Пробег ↑</option>
              </select>

              {/* Цена от-до */}
              <div className="flex gap-2 mb-2">
                <input type="number" placeholder="Цена от" value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  className="flex-1 py-2.5 px-3 border-[1.5px] border-solid [border-color:rgba(255,255,255,0.08)] rounded-xl text-[0.9em] bg-[#1F2937] text-[#F9FAFB]" />
                <input type="number" placeholder="Цена до" value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  className="flex-1 py-2.5 px-3 border-[1.5px] border-solid [border-color:rgba(255,255,255,0.08)] rounded-xl text-[0.9em] bg-[#1F2937] text-[#F9FAFB]" />
              </div>

              {/* Год от-до */}
              <div className="flex gap-2 mb-3">
                <input type="number" placeholder="Год от" value={yearMin}
                  onChange={e => setYearMin(e.target.value)}
                  className="flex-1 py-2.5 px-3 border-[1.5px] border-solid [border-color:rgba(255,255,255,0.08)] rounded-xl text-[0.9em] bg-[#1F2937] text-[#F9FAFB]" />
                <input type="number" placeholder="Год до" value={yearMax}
                  onChange={e => setYearMax(e.target.value)}
                  className="flex-1 py-2.5 px-3 border-[1.5px] border-solid [border-color:rgba(255,255,255,0.08)] rounded-xl text-[0.9em] bg-[#1F2937] text-[#F9FAFB]" />
              </div>

              {/* Кнопки: Применить + Сбросить */}
              <div className="flex gap-2">
                <button className="btn btn-gradient flex-1 p-2.5 rounded-xl text-[0.9em]"
                  onClick={() => { setOffset(0); setAds([]); loadAds(0); setFiltersOpen(false) }}>
                  Применить
                </button>
                <button className="btn px-4 py-2.5 rounded-xl text-[0.9em] bg-[#1F2937] text-[#F9FAFB]"
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
        <div className="text-center py-10 px-4 text-[#9CA3AF]">
          <p className="text-[2em] mb-3">😕</p>
          <p className="mb-4">Не удалось загрузить объявления</p>
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
          <div className="empty-icon">🚗</div>
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
                    <div className="no-photo">🚗</div>
                  )}
                </div>
                <div className="ad-card-info">
                  <div className="ad-card-title">{ad.brand} {ad.model}</div>
                  <div className="ad-card-year">{ad.year} г.</div>
                  <div className="ad-card-details">
                    {ad.mileage.toLocaleString('ru-RU')} км • {ad.fuel_type} • {ad.transmission}
                  </div>
                  <div className="ad-card-location">📍 {ad.city} <span className="text-[#9CA3AF] text-[0.85em] ml-1.5">👁 {ad.view_count}</span></div>
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
