import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, ClerkLoading } from '@clerk/clerk-react'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Prism from './components/Prism'
import { useMe } from './hooks'

// ── Lazy-loaded pages — cada página se descarga solo cuando se visita ──────────
const Dashboard          = lazy(() => import('./pages/Dashboard'))
const PatientsPage       = lazy(() => import('./pages/Patients'))
const PatientProfilePage = lazy(() => import('./pages/Patients/Profile'))
const ImportPatientsPage = lazy(() => import('./pages/Patients/Import'))
const AppointmentsPage   = lazy(() => import('./pages/Appointments'))
const MedicalRecordsPage = lazy(() => import('./pages/MedicalRecords'))
const ConsultationFormPage = lazy(() => import('./pages/MedicalRecords/ConsultationForm'))
const InvoicesPage       = lazy(() => import('./pages/Invoices'))
const SettingsPage       = lazy(() => import('./pages/Settings'))
const ReportsPage        = lazy(() => import('./pages/Reports'))
const DoctorsPage        = lazy(() => import('./pages/Doctors'))
const HelpPage           = lazy(() => import('./pages/Help'))
const ProfilePage        = lazy(() => import('./pages/Profile'))
const OnboardingPage     = lazy(() => import('./pages/Onboarding'))
const LandingPage        = lazy(() => import('./pages/Landing'))
const LoginPage          = lazy(() => import('./pages/Login'))
const CheckoutPage       = lazy(() => import('./pages/Checkout'))
const PortalPage         = lazy(() => import('./pages/Portal'))
const InventoryPage        = lazy(() => import('./pages/Inventory'))
const ImportInventoryPage  = lazy(() => import('./pages/Inventory/Import'))
const ImportInvoicesPage   = lazy(() => import('./pages/Invoices/Import'))
const SuperAdminPage       = lazy(() => import('./pages/SuperAdmin'))

// Fallback minimalista mientras se carga el chunk de la página
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Pacientes */}
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/import" element={<ImportPatientsPage />} />
          <Route path="patients/:patientId" element={<PatientProfilePage />} />

          {/* Agenda */}
          <Route path="appointments/*" element={<AppointmentsPage />} />

          {/* Historial clínico */}
          <Route path="records" element={<MedicalRecordsPage />} />
          <Route path="records/:patientId" element={<MedicalRecordsPage />} />
          <Route path="records/:patientId/new" element={<ConsultationFormPage />} />

          {/* Facturación */}
          <Route path="invoices/import" element={<ImportInvoicesPage />} />
          <Route path="invoices/*" element={<InvoicesPage />} />

          {/* Inventario */}
          <Route path="inventory/import" element={<ImportInventoryPage />} />
          <Route path="inventory" element={<InventoryPage />} />

          {/* Reportes */}
          <Route path="reports" element={<ReportsPage />} />

          {/* Médicos (admin only) */}
          <Route path="doctors" element={<DoctorsPage />} />

          {/* Superadmin */}
          <Route path="superadmin" element={<SuperAdminPage />} />

          {/* Configuración */}
          <Route path="settings" element={<SettingsPage />} />

          {/* Perfil personal */}
          <Route path="profile" element={<ProfilePage />} />

          {/* Ayuda */}
          <Route path="help" element={<HelpPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  // El portal tiene su propio auth (JWT) — renderizar antes que Clerk
  if (window.location.pathname.startsWith('/portal')) {
    return (
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/portal" element={<PortalPage />} />
            <Route path="*" element={<PortalPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    )
  }

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
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </ClerkLoading>

        <SignedOut>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/checkout/:plan" element={<CheckoutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </SignedOut>

        <SignedIn>
          <AppRoutes />
        </SignedIn>
      </BrowserRouter>
    </ThemeProvider>
  )
}
