import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Home } from '@/pages/Home'
import { Studio } from '@/pages/Studio'
import { YoutubeConverter } from '@/pages/YoutubeConverter'

function App() {
  return (
    <>
      <Toaster position="top-center" theme="dark" />
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Home />} />
          <Route path="studio" element={<Studio />} />
          <Route path="youtube" element={<YoutubeConverter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
