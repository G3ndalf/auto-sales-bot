import { Magnifer, CloseCircle } from '@solar-icons/react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  placeholder?: string
}

/**
 * SearchInput — поле поиска с иконкой Magnifer слева
 * и кнопкой CloseCircle справа (если есть текст).
 * Стиль: тёмный (#1F2937), золотой focus border.
 */
export default function SearchInput({ value, onChange, onClear, placeholder = 'Поиск...' }: SearchInputProps) {
  return (
    <div style={{ position: 'relative' }}>
      {/* Иконка поиска слева */}
      <span
        style={{
          position: 'absolute',
          left: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: '#9CA3AF',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Magnifer size={16} weight="BoldDuotone" />
      </span>

      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 36px',
          borderRadius: 10,
          fontSize: 15,
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#1F2937',
          color: '#F9FAFB',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        onFocus={e => (e.target.style.borderColor = '#F59E0B')}
        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
      />

      {/* Кнопка очистки — только при непустом поле */}
      {value && (
        <button
          onClick={onClear}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            fontSize: 18,
            cursor: 'pointer',
            color: '#9CA3AF',
            padding: 4,
            lineHeight: 1,
          }}
          aria-label="Очистить поиск"
        >
          <CloseCircle size={18} weight="BoldDuotone" />
        </button>
      )}
    </div>
  )
}
