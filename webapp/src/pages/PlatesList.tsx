import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hashtag } from '@solar-icons/react'
import { api } from '../api'
import type { PlateAdPreview } from '../api'
import { TEXTS } from '../constants/texts'
import { useBackButton } from '../hooks/useBackButton'
import { listStagger } from '../constants/animations'
import AdCard from '../components/AdCard'
import SearchInput from '../components/SearchInput'
import FilterToggleButton from '../components/FilterToggleButton'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

/**
 * Кэш данных списка номеров — сохраняется в памяти модуля
 * между mount/unmount. При возврате из карточки объявления
 * восстанавливает данные, фильтры и позицию скролла.
 */
interface PlatesCache {
  ads: PlateAdPreview[]
  total: number
  offset: number
  scrollY: number
  city: string
  query: string
  sort: string
  priceMin: string
  priceMax: string
}
let _platesCache: PlatesCache | null = null

/** Регистрируем глобальный сброс кэша для pull-to-refresh */
;(window as any).__clearPlatesCache = () => { _platesCache = null }

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

  // ─── Восстановление из кэша при возврате из карточки ────────
  const [restoredCache] = useState(() => _platesCache)

  const [ads, setAds] = useState<PlateAdPreview[]>(restoredCache?.ads || [])
  const [total, setTotal] = useState(restoredCache?.total || 0)
  const [loading, setLoading] = useState(!restoredCache)
  const [offset, setOffset] = useState(restoredCache?.offset || 0)
  const [error, setError] = useState(false)

  // ─── Фильтры (город) ──────────────────────────────────────
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

  // ─── Фильтры цены ───────────────────────────────────────
  const [priceMin, setPriceMin] = useState(restoredCache?.priceMin || '')
  const [priceMax, setPriceMax] = useState(restoredCache?.priceMax || '')

  // ─── Сортировка ────────────────────────────────────────────
  // Варианты: date_new (default), date_old, price_asc, price_desc
  const [sortOrder, setSortOrder] = useState(restoredCache?.sort || 'date_new')

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

  // ─── Начальная загрузка / восстановление из кэша ──────────
  useEffect(() => {
    if (restoredCache) {
      // Данные уже восстановлены через useState — нужно только вернуть скролл.
      // Несколько попыток: AnimatePresence mode="wait" запускает enter-анимацию
      // на 250ms после mount, и во время неё скролл может сбрасываться.
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

  // ─── Сохранение в кэш: данные при unmount, скролл непрерывно ──
  const cacheRef = useRef({ ads, total, offset, city: selectedCity, query: searchQuery, sort: sortOrder, priceMin, priceMax })
  const scrollRef = useRef(0)

  useEffect(() => {
    cacheRef.current = { ads, total, offset, city: selectedCity, query: searchQuery, sort: sortOrder, priceMin, priceMax }
  })

  /** Непрерывно сохраняем scroll position (passive, без re-renders) */
  useEffect(() => {
    const handler = () => { scrollRef.current = window.scrollY }
    window.addEventListener('scroll', handler, { passive: true })
    scrollRef.current = window.scrollY
    return () => window.removeEventListener('scroll', handler)
  }, [])

  /** При unmount сохраняем данные + последнюю известную позицию скролла */
  useEffect(() => {
    return () => {
      _platesCache = { ...cacheRef.current, scrollY: scrollRef.current }
    }
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

  if (loading && ads.length === 0) return null

  return (
    <div className={embedded ? 'catalog-content' : 'list-page'}>
      {!embedded && (
        <h1><Hashtag size={20} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Номера</h1>
      )}

      {/* ─── Поле поиска (выше фильтров) ─────────────────────── */}
      <div style={{ marginBottom: 10 }}>
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          onClear={clearSearch}
          placeholder="Поиск по номеру..."
        />
      </div>

      {/* ─── Кнопка фильтров + раскрывающаяся панель ─────────── */}
      <div style={{ marginBottom: 8 }}>
        <FilterToggleButton
          isOpen={filtersOpen}
          activeCount={[selectedCity, priceMin, priceMax].filter(Boolean).length + (sortOrder !== 'date_new' ? 1 : 0)}
          onClick={() => setFiltersOpen(prev => !prev)}
        />
      </div>

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
                  style={{ flex: '1 1 0', minWidth: 0, width: 0, padding: '10px 12px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: '0.9em', background: '#1F2937', color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' as const }} />
                <input type="number" placeholder="Цена до" value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  style={{ flex: '1 1 0', minWidth: 0, width: 0, padding: '10px 12px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: '0.9em', background: '#1F2937', color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' as const }} />
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
        <ErrorState
          message="Не удалось загрузить объявления"
          onRetry={() => loadAds()}
        />
      )}

      {/* Мягкое fade-in для пустого состояния / Stagger-контейнер для карточек */}
      {!loading && !error && ads.length === 0 ? (
        <EmptyState
          icon={<Hashtag size={48} weight="BoldDuotone" />}
          message="Пока нет объявлений"
        />
      ) : (
        /* Stagger-контейнер: карточки появляются одна за другой через AdCard */
        <motion.div
          className="ads-list"
          variants={listStagger}
          initial={restoredCache ? false : 'hidden'}
          animate="visible"
        >
          {ads.map((ad) => (
            <AdCard
              key={ad.id}
              id={ad.id}
              adType="plate"
              price={ad.price}
              city={ad.city}
              photo={ad.photo}
              viewCount={ad.view_count}
              plateNumber={ad.plate_number}
            />
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
