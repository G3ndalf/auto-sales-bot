import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CreateCarAd from './pages/CreateCarAd'
import CreatePlateAd from './pages/CreatePlateAd'
import './App.css'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/car/new" element={<CreateCarAd />} />
        <Route path="/plate/new" element={<CreatePlateAd />} />
      </Routes>
    </div>
  )
}

export default App
