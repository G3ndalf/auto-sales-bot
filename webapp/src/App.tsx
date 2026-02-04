import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CreateCarAd from './pages/CreateCarAd'
import CreatePlateAd from './pages/CreatePlateAd'
import Catalog from './pages/Catalog'
import CarsList from './pages/CarsList'
import CarAdDetail from './pages/CarAdDetail'
import PlatesList from './pages/PlatesList'
import PlateAdDetail from './pages/PlateAdDetail'
import './App.css'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/car/new" element={<CreateCarAd />} />
        <Route path="/plate/new" element={<CreatePlateAd />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/cars" element={<CarsList />} />
        <Route path="/car/:id" element={<CarAdDetail />} />
        <Route path="/plates" element={<PlatesList />} />
        <Route path="/plate/:id" element={<PlateAdDetail />} />
      </Routes>
    </div>
  )
}

export default App
