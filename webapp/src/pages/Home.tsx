/**
 * Home.tsx — Главная страница приложения.
 *
 * Анимации: fade-in + slide-up для welcome-текста и карточек
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Garage, ClipboardList, Hashtag } from '@solar-icons/react'
import { TEXTS } from '../constants/texts'
import { useBackButton } from '../hooks/useBackButton'

/* Stagger-контейнер для карточек */
const cardsContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
}

const cardItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

export default function Home() {
  useBackButton()

  return (
    <div className="home">
      {/* Hero — fade-in + slide-up */}
      <motion.div
        className="home-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="home-logo"><Garage size={48} weight="BoldDuotone" /></div>
        <h1>{TEXTS.HOME_TITLE}</h1>
        <p className="home-subtitle">{TEXTS.HOME_SUBTITLE}</p>
      </motion.div>

      {/* Карточки навигации — stagger fade-in */}
      <motion.div
        className="home-cards"
        variants={cardsContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={cardItem}>
          <Link to="/catalog" className="home-card home-card--catalog">
            <div className="home-card__icon"><ClipboardList size={28} weight="BoldDuotone" /></div>
            <div className="home-card__body">
              <div className="home-card__title">Каталог</div>
              <div className="home-card__desc">Авто и номера СКФО</div>
            </div>
            <div className="home-card__arrow">›</div>
          </Link>
        </motion.div>

        <motion.div variants={cardItem}>
          <div className="home-cards-row">
            <Link to="/car/new" className="home-card home-card--car">
              <div className="home-card__icon"><Garage size={28} weight="BoldDuotone" /></div>
              <div className="home-card__body">
                <div className="home-card__title">Продать авто</div>
                <div className="home-card__desc">Бесплатно</div>
              </div>
            </Link>

            <Link to="/plate/new" className="home-card home-card--plate">
              <div className="home-card__icon"><Hashtag size={28} weight="BoldDuotone" /></div>
              <div className="home-card__body">
                <div className="home-card__title">Продать номер</div>
                <div className="home-card__desc">Бесплатно</div>
              </div>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
