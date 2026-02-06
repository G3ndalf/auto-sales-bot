interface StatusBadgeProps {
  status: 'approved' | 'pending' | 'rejected' | 'sold'
}

const STATUS_CONFIG: Record<StatusBadgeProps['status'], { label: string; bg: string; color: string }> = {
  approved: { label: 'Одобрено', bg: 'rgba(34,197,94,0.15)', color: '#22C55E' },
  pending: { label: 'На модерации', bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  rejected: { label: 'Отклонено', bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
  sold: { label: 'Продано', bg: 'rgba(107,114,128,0.15)', color: '#6B7280' },
}

/**
 * StatusBadge — цветной бейдж со статусом объявления.
 * Зелёный (approved) / Оранжевый (pending) / Красный (rejected) / Серый (sold)
 */
export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 8,
        fontSize: '0.8em',
        fontWeight: 600,
        background: config.bg,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  )
}
