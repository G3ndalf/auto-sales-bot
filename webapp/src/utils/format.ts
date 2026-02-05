/**
 * format.ts — Утилиты форматирования.
 *
 * Единая точка для formatPrice, formatDate, formatPhone, normalizePhone.
 * Используется во всех страницах вместо дублированных inline-функций.
 */

/** Форматирует число как цену с ₽: "1 500 000 ₽" */
export function formatPrice(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽'
}

/**
 * Форматирует ISO-дату в русскую локаль.
 * @param style 'short' → "06.02.2026", 'long' → "6 февраля 2026"
 */
export function formatDate(s: string | null, style: 'short' | 'long' = 'short'): string {
  if (!s) return ''
  if (style === 'long') {
    return new Date(s).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
  return new Date(s).toLocaleDateString('ru-RU')
}

/** Форматирует номер как 8-XXX-XXX-XX-XX (если 11 цифр) */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits[0]}-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }
  return raw
}

/**
 * Нормализует ввод телефона: добавляет 8, ограничивает 11 цифрами.
 * Используется в onChange телефонных полей формы.
 */
export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('9')) digits = '8' + digits
  if (digits.startsWith('7') && digits.length > 1) digits = '8' + digits.slice(1)
  return digits.slice(0, 11)
}
