import { motion } from 'framer-motion'

/** Skeleton-блок с shimmer-анимацией для состояний загрузки */
export function SkeletonBlock({ width, height, radius = '10px' }: { 
  width?: string; height?: string; radius?: string 
}) {
  return (
    <motion.div
      style={{
        width: width || '100%',
        height: height || '20px',
        borderRadius: radius,
        background: 'linear-gradient(90deg, #1F2937 25%, #374151 50%, #1F2937 75%)',
        backgroundSize: '200% 100%',
      }}
      animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
    />
  )
}

/** Skeleton карточки объявления */
export function SkeletonCard() {
  return (
    <div style={{ display: 'flex', gap: '12px', background: '#1A2332', padding: '0' }}>
      <SkeletonBlock width="120px" height="110px" radius="0" />
      <div style={{ flex: 1, padding: '12px 14px 12px 0', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
        <SkeletonBlock height="18px" width="70%" />
        <SkeletonBlock height="14px" width="50%" />
        <SkeletonBlock height="14px" width="90%" />
        <SkeletonBlock height="20px" width="40%" />
      </div>
    </div>
  )
}

/** Skeleton списка из N карточек */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="ads-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

/** Skeleton профиля пользователя */
export function SkeletonProfile() {
  return (
    <div style={{ padding: '36px 20px 28px', textAlign: 'center' }}>
      <SkeletonBlock width="72px" height="72px" radius="50%" />
      <div style={{ marginTop: '12px' }}><SkeletonBlock height="24px" width="40%" /></div>
      <div style={{ marginTop: '8px' }}><SkeletonBlock height="16px" width="30%" /></div>
    </div>
  )
}
