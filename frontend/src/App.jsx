import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, ClerkLoading } from '@clerk/clerk-react'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import PatientsPage from './pages/Patients'
import AppointmentsPage from './pages/Appointments'
import MedicalRecordsPage from './pages/MedicalRecords'
import InvoicesPage from './pages/Invoices'
import SettingsPage from './pages/Settings'
import ReportsPage from './pages/Reports'
import OnboardingPage from './pages/Onboarding'
import LandingPage from './pages/Landing'
import LoginPage from './pages/Login'
import Prism from './components/Prism'
import { useMe } from './hooks'

// Verifica si el usuario completó el onboarding antes de acceder a rutas protegidas
function AppRoutes() {
  const { data: me, isLoading, isError } = useMe()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Usuario no registrado en la BD → solo puede acceder al onboarding
  if (isError) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  // Usuario ya registrado → accede al sistema completo
  return (
    <Routes>
      <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="patients/*" element={<PatientsPage />} />
        <Route path="appointments/*" element={<AppointmentsPage />} />
        <Route path="records/:patientId" element={<MedicalRecordsPage />} />
        <Route path="invoices/*" element={<InvoicesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* Prism WebGL background — fixed, behind everything */}
        <div className="fixed inset-0 -z-10" style={{ width: '100%', height: '100%' }}>
          <Prism
            animationType="rotate"
            timeScale={0.5}
            height={3.5}
            baseWidth={5.5}
            scale={3.6}
            hueShift={0}
            colorFrequency={1}
            noise={0}
            glow={1}
          />
        </div>

        {/* Mientras Clerk inicializa — evita parpadeo de rutas */}
        <ClerkLoading>
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </ClerkLoading>

        <SignedOut>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SignedOut>

        <SignedIn>
          <AppRoutes />
        </SignedIn>
      </BrowserRouter>
    </ThemeProvider>
  )
}
