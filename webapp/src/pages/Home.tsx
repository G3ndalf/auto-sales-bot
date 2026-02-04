import { Link } from 'react-router-dom'
import { TEXTS } from '../constants/texts'

export default function Home() {
  return (
    <div className="home">
      <div className="home-icon">🚘</div>
      <h1>{TEXTS.HOME_TITLE}</h1>
      <p>{TEXTS.HOME_SUBTITLE}</p>

      <div className="home-buttons">
        <Link to="/car/new" className="btn btn-primary">
          {TEXTS.BTN_POST_CAR}
        </Link>
        <Link to="/plate/new" className="btn btn-primary">
          {TEXTS.BTN_POST_PLATE}
        </Link>
      </div>
    </div>
  )
}
