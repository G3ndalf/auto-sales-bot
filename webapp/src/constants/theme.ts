/**
 * theme.ts — Дизайн-система "Caucasus Premium Dark".
 *
 * Все цвета, стили полей ввода и селектов — в одном месте.
 * Заменяет inline `const C = {...}` и дублированный `selectStyle`.
 */

/** Палитра Caucasus Premium Dark */
export const THEME = {
  bg: '#0B0F19',
  card: '#111827',
  cardLight: '#1A2332',
  accent: '#F59E0B',
  accentDim: 'rgba(245, 158, 11, 0.15)',
  accentBorder: 'rgba(245, 158, 11, 0.12)',
  accentGlow: 'rgba(245, 158, 11, 0.25)',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: 'rgba(255, 255, 255, 0.06)',
  glass: 'rgba(255, 255, 255, 0.03)',
  green: '#34D399',
  greenDim: 'rgba(52, 211, 153, 0.12)',
  input: '#1F2937',
  inputBorder: 'rgba(255, 255, 255, 0.08)',
} as const

/** Стиль для <select> в формах */
export const selectStyle: React.CSSProperties = {
  background: THEME.input,
  color: THEME.text,
  border: '1px solid #374151',
}

/** Стиль для числовых input'ов фильтров (цена от/до, год от/до) */
export const filterInputStyle: React.CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
  width: 0,
  padding: '10px 12px',
  border: `1.5px solid ${THEME.inputBorder}`,
  borderRadius: 12,
  fontSize: '0.9em',
  background: THEME.input,
  color: THEME.text,
  outline: 'none',
  boxSizing: 'border-box',
}
