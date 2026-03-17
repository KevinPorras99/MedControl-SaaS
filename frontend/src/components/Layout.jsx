import { Outlet, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock, ShieldAlert } from 'lucide-react'
import Sidebar from './Sidebar'
import MedicalAssistant from './MedicalAssistant'
import { useApi } from '../lib/api'
import { useSessionTimeout } from '../hooks/useSessionTimeout'

// ── Modal de advertencia de inactividad ───────────────────────────────────────
function SessionWarningModal({ secondsLeft, onExtend }) {
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const countdown = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, '0')} min`
    : `${seconds}s`

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-orange-500/30 p-6 shadow-2xl"
        style={{ background: 'rgba(14,14,14,0.97)' }}
      >
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <ShieldAlert size={22} className="text-orange-400" />
          </div>
        </div>
        <h2 className="text-base font-semibold text-white text-center mb-1">
          Sesión por expirar
        </h2>
        <p className="text-sm text-gray-400 text-center mb-5 leading-relaxed">
          Por inactividad, tu sesión cerrará automáticamente en:
        </p>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Clock size={16} className="text-orange-400" />
          <span className="text-2xl font-bold text-orange-400 tabular-nums">
            {countdown}
          </span>
        </div>
        <button
          onClick={onExtend}
          className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
        >
          Continuar sesión
        </button>
        <p className="text-[10px] text-gray-600 text-center mt-3">
          Cualquier acción en la app también extiende la sesión.
        </p>
      </div>
    </div>
  )
}

// ── Layout principal ──────────────────────────────────────────────────────────
export default function Layout() {
  const api = useApi()
  const { isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me').then(r => r.data),
    retry: false,
    staleTime: 1000 * 60 * 10,
  })

  const { showWarning, secondsLeft, extendSession } = useSessionTimeout()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-400 dark:border-white/20 border-t-yellow-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (isError) return <Navigate to="/onboarding" replace />

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
      <MedicalAssistant />

      {showWarning && (
        <SessionWarningModal secondsLeft={secondsLeft} onExtend={extendSession} />
      )}
    </div>
  )
}
