import { Routes, Route } from 'react-router-dom'
import Profile from './pages/Profile'
import Sell from './pages/Sell'
import CreateCarAd from './pages/CreateCarAd'
import CreatePlateAd from './pages/CreatePlateAd'
import Catalog from './pages/Catalog'
import CarsList from './pages/CarsList'
import CarAdDetail from './pages/CarAdDetail'
import PlatesList from './pages/PlatesList'
import PlateAdDetail from './pages/PlateAdDetail'
import AdminPanel from './pages/AdminPanel'
import DockBar from './components/DockBar'
import './App.css'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Profile />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/car/new" element={<CreateCarAd />} />
        <Route path="/plate/new" element={<CreatePlateAd />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/cars" element={<CarsList />} />
        <Route path="/car/:id" element={<CarAdDetail />} />
        <Route path="/plates" element={<PlatesList />} />
        <Route path="/plate/:id" element={<PlateAdDetail />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
      <DockBar />
    </div>
  )
}

export default App
