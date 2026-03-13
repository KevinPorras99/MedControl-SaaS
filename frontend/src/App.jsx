import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, ClerkLoading } from '@clerk/clerk-react'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import PatientsPage from './pages/Patients'
import PatientProfilePage from './pages/Patients/Profile'
import AppointmentsPage from './pages/Appointments'
import MedicalRecordsPage from './pages/MedicalRecords'
import ConsultationFormPage from './pages/MedicalRecords/ConsultationForm'
import InvoicesPage from './pages/Invoices'
import SettingsPage from './pages/Settings'
import ReportsPage from './pages/Reports'
import DoctorsPage from './pages/Doctors'
import HelpPage from './pages/Help'
import ProfilePage from './pages/Profile'
import OnboardingPage from './pages/Onboarding'
import LandingPage from './pages/Landing'
import LoginPage from './pages/Login'
import CheckoutPage from './pages/Checkout'
import Prism from './components/Prism'
import { useMe } from './hooks'

function AppRoutes() {
  const { data: me, isLoading, isError } = useMe()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Pacientes */}
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/:patientId" element={<PatientProfilePage />} />

        {/* Agenda */}
        <Route path="appointments/*" element={<AppointmentsPage />} />

        {/* Historial clínico */}
        <Route path="records" element={<MedicalRecordsPage />} />
        <Route path="records/:patientId" element={<MedicalRecordsPage />} />
        <Route path="records/:patientId/new" element={<ConsultationFormPage />} />

        {/* Facturación */}
        <Route path="invoices/*" element={<InvoicesPage />} />

        {/* Reportes */}
        <Route path="reports" element={<ReportsPage />} />

        {/* Médicos (admin only) */}
        <Route path="doctors" element={<DoctorsPage />} />

        {/* Configuración */}
        <Route path="settings" element={<SettingsPage />} />

        {/* Perfil personal */}
        <Route path="profile" element={<ProfilePage />} />

        {/* Ayuda */}
        <Route path="help" element={<HelpPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
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

        <ClerkLoading>
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </ClerkLoading>

        <SignedOut>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/checkout/:plan" element={<CheckoutPage />} />
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
