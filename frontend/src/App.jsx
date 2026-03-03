import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignIn, SignedIn, SignedOut } from '@clerk/clerk-react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import PatientsPage from './pages/Patients'
import AppointmentsPage from './pages/Appointments'
import MedicalRecordsPage from './pages/MedicalRecords'
import InvoicesPage from './pages/Invoices'
import SettingsPage from './pages/Settings'
import OnboardingPage from './pages/Onboarding'

export default function App() {
  return (
    <BrowserRouter>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-primary-900">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white">MedControl</h1>
              <p className="text-primary-100 mt-2">Sistema de Gestión Clínica</p>
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
  )
}
