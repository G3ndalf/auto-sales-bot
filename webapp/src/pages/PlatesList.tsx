import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { PlateAdPreview, City } from '../api'
import { useBackButton } from '../hooks/useBackButton'

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
  if (!embedded) useBackButton('/catalog')

  const [ads, setAds] = useState<PlateAdPreview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)

  // ─── Фильтры (город) ──────────────────────────────────────
  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState('')

  // ─── Поиск (debounce 400ms) ────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  /** Ref для хранения таймера debounce — очищается при каждом новом вводе */
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Сортировка ────────────────────────────────────────────
  // Варианты: date_new (default), date_old, price_asc, price_desc
  const [sortOrder, setSortOrder] = useState('date_new')

  // Загружаем справочник городов один раз при монтировании
  useEffect(() => {
    api.getCities().then(setCities).catch(() => {})
  }, [])

  /**
   * buildParams — собирает все query-параметры для API-запроса.
   * Включает offset, limit, city, q (поиск), sort (сортировка).
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
      // ignore
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

  if (loading && ads.length === 0 && cities.length === 0) {
    return <div className="loading">Загрузка...</div>
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
      <div
        style={{
          position: 'relative',     // для абсолютного позиционирования иконки 🔍
          marginBottom: '10px',
        }}
      >
        {/* Иконка поиска слева */}
        <span
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '16px',
            pointerEvents: 'none',    // клик проходит сквозь иконку к полю
            color: 'var(--tg-theme-hint-color, #999)',
          }}
        >
          🔍
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Поиск по номеру..."
          style={{
            width: '100%',
            padding: '10px 36px',         // 36px слева для иконки, 36px справа для кнопки ✕
            borderRadius: '10px',
            fontSize: '15px',
            border: '1px solid var(--tg-theme-hint-color, #ccc)',
            backgroundColor: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
            color: 'var(--tg-theme-text-color, #000)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {/* Кнопка очистки ✕ — показываем только при непустом поле */}
        {searchQuery && (
          <button
            onClick={clearSearch}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--tg-theme-hint-color, #999)',
              padding: '4px',
              lineHeight: 1,
            }}
            aria-label="Очистить поиск"
          >
            ✕
          </button>
        )}
      </div>

      {/* ─── Панель фильтров + сортировка ────────────────────── */}
      <div className="filters-bar">
        <select
          className="filter-select"
          value={selectedCity}
          onChange={e => handleCityChange(e.target.value)}
        >
          <option value="">Все города</option>
          {cities.map(c => (
            <option key={c.city} value={c.city}>
              {c.city} ({c.count})
            </option>
          ))}
        </select>

        {/* Dropdown сортировки — в одну строку с фильтрами */}
        <select
          className="filter-select"
          value={sortOrder}
          onChange={e => handleSortChange(e.target.value)}
        >
          <option value="date_new">Сначала новые</option>
          <option value="date_old">Сначала старые</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
        </select>
      </div>

      {total > 0 && <p className="list-count">Найдено: {total}</p>}

      {!loading && ads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔢</div>
          <p>Пока нет объявлений</p>
        </div>
      ) : (
        <div className="ads-list">
          {ads.map(ad => (
            <Link to={`/plate/${ad.id}`} key={ad.id} className="ad-card plate-card">
              <div className="plate-number-display">{ad.plate_number}</div>
              <div className="ad-card-info">
                <div className="ad-card-price">{formatPrice(ad.price)}</div>
                <div className="ad-card-location">📍 {ad.city}</div>
              </div>
            </Link>
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
