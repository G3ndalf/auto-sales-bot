import { Link } from 'react-router-dom'
import { Car, ClipboardList, Hash } from 'lucide-react'
import { TEXTS } from '../constants/texts'
import { useBackButton } from '../hooks/useBackButton'

export default function Home() {
  useBackButton()

  return (
    <div className="home">
      <div className="home-hero">
        <div className="home-logo"><Car size={48} /></div>
        <h1>{TEXTS.HOME_TITLE}</h1>
        <p className="home-subtitle">{TEXTS.HOME_SUBTITLE}</p>
      </div>

      <div className="home-cards">
        <Link to="/catalog" className="home-card home-card--catalog">
          <div className="home-card__icon"><ClipboardList size={28} /></div>
          <div className="home-card__body">
            <div className="home-card__title">Каталог</div>
            <div className="home-card__desc">Авто и номера СКФО</div>
          </div>
          <div className="home-card__arrow">›</div>
        </Link>

        <div className="home-cards-row">
          <Link to="/car/new" className="home-card home-card--car">
            <div className="home-card__icon"><Car size={28} /></div>
            <div className="home-card__body">
              <div className="home-card__title">Продать авто</div>
              <div className="home-card__desc">Бесплатно</div>
            </div>
          </Link>

          <Link to="/plate/new" className="home-card home-card--plate">
            <div className="home-card__icon"><Hash size={28} /></div>
            <div className="home-card__body">
              <div className="home-card__title">Продать номер</div>
              <div className="home-card__desc">Бесплатно</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
