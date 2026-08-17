import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Routes, Route } from 'react-router-dom'
import { Home } from '@/pages/Home'
import { Studio } from '@/pages/Studio'
import { Toaster } from 'sonner'

function App() {
  return (
    <DashboardLayout>
      <Toaster theme="dark" position="top-center" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/studio" element={<Studio />} />
      </Routes>
    </DashboardLayout>
  )
}

export default App
