interface CharCounterProps {
  value: string
  max: number
  warnAt?: number   // default 75% of max
  dangerAt?: number // default 90% of max
}

/**
 * CharCounter — показывает "123/1000" с цветом:
 * серый → оранжевый (warnAt) → красный (dangerAt)
 */
export default function CharCounter({ value, max, warnAt, dangerAt }: CharCounterProps) {
  const length = value.length
  const warn = warnAt ?? Math.floor(max * 0.75)
  const danger = dangerAt ?? Math.floor(max * 0.9)

  let color = '#6B7280' // серый (норма)
  if (length >= danger) {
    color = '#EF4444' // красный
  } else if (length >= warn) {
    color = '#F59E0B' // оранжевый
  }

  return (
    <span style={{ fontSize: '0.8em', color, fontVariantNumeric: 'tabular-nums' }}>
      {length}/{max}
    </span>
  )
}
