import { Link } from 'react-router-dom'

export default function Sell() {
  return (
    <div className="sell-page">
      <div className="sell-hero">
        <h1>Что продаём?</h1>
        <p className="sell-subtitle">Размещение бесплатно</p>
      </div>

      <div className="sell-cards">
        <Link to="/car/new" className="sell-card sell-card--car">
          <div className="sell-card__emoji">🚗</div>
          <div className="sell-card__body">
            <div className="sell-card__title">Автомобиль</div>
            <div className="sell-card__desc">Марка, модель, фото, цена</div>
          </div>
          <div className="sell-card__arrow">›</div>
        </Link>

        <Link to="/plate/new" className="sell-card sell-card--plate">
          <div className="sell-card__emoji">🔢</div>
          <div className="sell-card__body">
            <div className="sell-card__title">Номерной знак</div>
            <div className="sell-card__desc">Красивый номер на продажу</div>
          </div>
          <div className="sell-card__arrow">›</div>
        </Link>
      </div>
    </div>
  )
}
