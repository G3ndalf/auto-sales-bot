/**
 * animations.ts — Общие варианты анимаций framer-motion.
 *
 * Единая точка определения: вместо копирования listContainerVariants/listCardVariants
 * в каждом файле, импортируем отсюда.
 */

/** Stagger-контейнер для списков (карточки, элементы) — 30ms между элементами */
export const listStagger = {
  hidden: {},
  visible: {
    transition: {
      when: 'beforeChildren' as const,
      staggerChildren: 0.03,
    },
  },
}

/** Элемент списка: fade-in + slide-up 12px за 200ms */
export const listItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

/** Stagger-контейнер для detail-страниц — 60ms между блоками */
export const detailStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

/** Блок detail-страницы: fade-in + slide-up 14px, плавный easing */
export const detailItem = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } as const,
  },
}

/** Sticky footer: spring-появление с задержкой */
export const footerSpring = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 26, delay: 0.2 },
  },
}

/** Бейдж «Продано»: scale-in с пружиной */
export const soldBadgeScale = {
  hidden: { opacity: 0, scale: 0.7 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 350, damping: 20, delay: 0.15 },
  },
}

/** Плавающая анимация для пустых состояний (иконка вверх-вниз) */
export const floatLoop = {
  y: [0, -10, 0],
  transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
}
