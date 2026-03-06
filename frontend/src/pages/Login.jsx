import { Link } from 'react-router-dom'
import { SignIn } from '@clerk/clerk-react'
import { ArrowLeft, Stethoscope } from 'lucide-react'

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Back to landing */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={15} />
        Volver al inicio
      </Link>

      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mb-3 shadow-lg shadow-yellow-500/30">
            <Stethoscope size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MedControl</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistema de Gestión Clínica</p>
        </div>

        {/* Clerk SignIn */}
        <SignIn routing="hash" />
      </div>
    </div>
  )
}
