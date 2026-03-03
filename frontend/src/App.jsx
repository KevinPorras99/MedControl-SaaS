import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignIn, SignedIn, SignedOut } from '@clerk/clerk-react'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import PatientsPage from './pages/Patients'
import AppointmentsPage from './pages/Appointments'
import MedicalRecordsPage from './pages/MedicalRecords'
import InvoicesPage from './pages/Invoices'
import SettingsPage from './pages/Settings'
import OnboardingPage from './pages/Onboarding'
import FloatingLines from './components/FloatingLines'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* Animated WebGL background — fixed, behind everything */}
        <div className="fixed inset-0 -z-10" style={{ width: '100%', height: '100%' }}>
          <FloatingLines 
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={10}
            lineDistance={5}
            bendRadius={5}
            bendStrength={-0.5}
            interactive={true}
            parallax={true}
          />
        </div>

        <SignedOut>
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
              <div className="flex flex-col items-center mb-8">
                <img src="/MedControlHD.png" alt="MedControl" className="h-20 w-auto mb-3 brightness-0 invert" />
                <p className="text-gray-400 text-sm">Sistema de Gestión Clínica</p>
              </div>
              <SignIn routing="hash" />
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="patients/*" element={<PatientsPage />} />
              <Route path="appointments/*" element={<AppointmentsPage />} />
              <Route path="records/:patientId" element={<MedicalRecordsPage />} />
              <Route path="invoices/*" element={<InvoicesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </SignedIn>
      </BrowserRouter>
    </ThemeProvider>
  )
}
