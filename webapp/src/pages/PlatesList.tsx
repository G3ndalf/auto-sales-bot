import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import type { PlateAdPreview } from '../api'
import { TEXTS } from '../constants/texts'
import { useBackButton } from '../hooks/useBackButton'
import { SkeletonList } from '../components/Skeleton'

interface Props {
  embedded?: boolean
}

/**
 * PlatesList — страница каталога номерных знаков.
 *
 * Поддерживает:
 * - Фильтрацию по городу (dropdown)
 * - Полнотекстовый поиск по номеру с debounce 400ms (параметр API: q)
 * - Сортировку по дате и цене (параметр API: sort)
 * - Пагинацию «Показать ещё»
 */
export default function PlatesList({ embedded }: Props) {
  useBackButton(embedded ? null : '/catalog')

  const [ads, setAds] = useState<PlateAdPreview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState(false)

  // ─── Фильтры (город) ──────────────────────────────────────
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

  // ─── Фильтры цены ───────────────────────────────────────
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')

  // ─── Сортировка ────────────────────────────────────────────
  // Варианты: date_new (default), date_old, price_asc, price_desc
  const [sortOrder, setSortOrder] = useState('date_new')

  // Города теперь берутся из статического справочника TEXTS.REGIONS

  /**
   * buildParams — собирает все query-параметры для API-запроса.
   * Включает offset, limit, city, q (поиск), sort (сортировка),
   * price_min, price_max (фильтры цены).
   */
  const buildParams = (
    newOffset: number,
    city = selectedCity,
    q = searchQuery,
    sort = sortOrder
  ) => {
    const params: Record<string, string> = { offset: String(newOffset), limit: '20' }
    if (city) params.city = city
    // Поисковый запрос передаём только если непустой
    if (q.trim()) params.q = q.trim()
    // Сортировку передаём всегда
    if (sort) params.sort = sort
    // Фильтры цены — передаём только непустые
    if (priceMin) params.price_min = priceMin
    if (priceMax) params.price_max = priceMax
    return params
  }

  /**
   * loadAds — загружает список объявлений номеров.
   * При newOffset=0 заменяет список, иначе дозагружает (пагинация).
   */
  const loadAds = async (
    newOffset = 0,
    city = selectedCity,
    q = searchQuery,
    sort = sortOrder
  ) => {
    setLoading(true)
    setError(false)
    try {
      const params = buildParams(newOffset, city, q, sort)
      const data = await api.getPlateAds(params)
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

  // ─── Обработчик фильтра города ─────────────────────────────

  const handleCityChange = (city: string) => {
    setSelectedCity(city)
    setOffset(0)
    setAds([])
    loadAds(0, city, searchQuery, sortOrder)
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
      loadAds(0, selectedCity, value, sortOrder)
    }, 400)
  }

  /** clearSearch — очистка поля поиска и перезагрузка без q */
  const clearSearch = () => {
    setSearchQuery('')
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    setOffset(0)
    setAds([])
    loadAds(0, selectedCity, '', sortOrder)
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
    loadAds(0, selectedCity, searchQuery, sort)
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
          <h1>🔢 Номера</h1>
        </>
      )}

      {/* ─── Поле поиска (выше фильтров) ─────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        {/* Иконка поиска слева */}
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none', color: '#9CA3AF' }}>
          🔍
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Поиск по номеру..."
          style={{ width: '100%', padding: '10px 36px', borderRadius: 10, fontSize: 15, border: '1px solid rgba(255,255,255,0.08)', background: '#1F2937', color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }}
        />
        {/* Кнопка очистки ✕ — показываем только при непустом поле */}
        {searchQuery && (
          <button
            onClick={clearSearch}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9CA3AF', padding: 4, lineHeight: 1 }}
            aria-label="Очистить поиск"
          >
            ✕
          </button>
        )}
      </div>

      {/* ─── Кнопка фильтров + раскрывающаяся панель ─────────── */}
      {(() => {
        const activeCount = [selectedCity, priceMin, priceMax]
          .filter(Boolean).length + (sortOrder !== 'date_new' ? 1 : 0)
        return (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setFiltersOpen(prev => !prev)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: 10, marginBottom: 8, border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#F9FAFB', fontSize: '0.95em', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', background: filtersOpen ? 'rgba(245,158,11,0.15)' : '#1A2332' }}
          >
            <span>🔍 Фильтры</span>
            {activeCount > 0 && (
              <span style={{ background: '#F59E0B', color: '#0B0F19', borderRadius: 10, padding: '1px 7px', fontSize: '0.8em', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                {activeCount}
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '0.85em', opacity: 0.6 }}>
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
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: 12, marginBottom: 8, border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, background: '#1A2332' }}>
              {/* Город */}
              <select className="filter-select" style={{ width: '100%', marginBottom: 8 }} value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}>
                <option value="">Все города</option>
                {TEXTS.REGIONS.map(r => (
                  <optgroup key={r.name} label={r.name}>
                    {r.cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                ))}
              </select>

              {/* Сортировка */}
              <select className="filter-select" style={{ width: '100%', marginBottom: 8 }} value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}>
                <option value="date_new">Сначала новые</option>
                <option value="date_old">Сначала старые</option>
                <option value="price_asc">Цена ↑</option>
                <option value="price_desc">Цена ↓</option>
              </select>

              {/* Цена от-до */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input type="number" placeholder="Цена от" value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: '0.9em', background: '#1F2937', color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' as const }} />
                <input type="number" placeholder="Цена до" value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: '0.9em', background: '#1F2937', color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>

              {/* Кнопки: Применить + Сбросить */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-gradient" style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: '0.9em' }}
                  onClick={() => { setOffset(0); setAds([]); loadAds(0); setFiltersOpen(false) }}>
                  Применить
                </button>
                <button className="btn" style={{ padding: '10px 16px', borderRadius: 12, fontSize: '0.9em', background: '#1F2937', color: '#F9FAFB' }}
                  onClick={() => {
                    setSelectedCity(''); setSortOrder('date_new')
                    setPriceMin(''); setPriceMax('')
                    setOffset(0); setAds([]); loadAds(0, '', searchQuery, 'date_new')
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
          <p style={{ fontSize: '2em', marginBottom: 12 }}>😕</p>
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
          <div className="empty-icon">🔢</div>
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
              <Link to={`/plate/${ad.id}`} className="ad-card plate-card">
                <div className="plate-number-display">{ad.plate_number}</div>
                <div className="ad-card-info">
                  <div className="ad-card-price">{formatPrice(ad.price)}</div>
                  <div className="ad-card-location">📍 {ad.city} <span style={{ color: '#9CA3AF', fontSize: '0.85em', marginLeft: 6 }}>👁 {ad.view_count}</span></div>
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
