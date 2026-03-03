import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useClerk } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/api'
import toast from 'react-hot-toast'
import { Copy, Check, ArrowLeft, ShieldAlert } from 'lucide-react'
import LightPillar from '../components/LightPillar'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handle} className="ml-2 text-gold-600 hover:text-gold-800 transition-colors">
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  )
}

const LIGHT_PILLAR_PROPS = {
  topColor: "#d4af37",
  bottomColor: "#c0c0c0",
  intensity: 1,
  rotationSpeed: 0.3,
  glowAmount: 0.002,
  pillarWidth: 3,
  pillarHeight: 0.4,
  noiseIntensity: 0.5,
  pillarRotation: 25,
  interactive: false,
  mixBlendMode: "screen",
  quality: "high",
}

export default function Onboarding() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const api = useApi()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    full_name: user?.fullName || '',
    email: user?.primaryEmailAddress?.emailAddress || '',
    clinic_name: '',
  })
  const [loading, setLoading] = useState(false)
  const [createdCode, setCreatedCode] = useState(null)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name || !form.email) {
      toast.error('Completá tu nombre y email')
      return
    }
    if (!form.clinic_name) {
      toast.error('Ingresá el nombre de tu clínica')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/api/auth/onboarding', {
        full_name: form.full_name,
        email: form.email,
        role: 'admin_clinic',
        clinic_name: form.clinic_name,
      })
      await qc.invalidateQueries(['me'])
      setCreatedCode(res.data.clinic.access_code)
    } catch (err) {
      toast.error(err.message || 'Error al configurar la cuenta')
    } finally {
      setLoading(false)
    }
  }

  // ── Pantalla de éxito (muestra el código de acceso) ───────────────────────
  if (createdCode) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-white to-silver-50 relative overflow-hidden">
        <button
          onClick={() => signOut()}
          className="absolute top-5 left-5 z-20 flex items-center gap-1.5 text-gray-600 hover:text-gray-800 text-sm transition-colors"
        >
          <ArrowLeft size={15} />
          Volver al inicio
        </button>
        <LightPillar {...LIGHT_PILLAR_PROPS} />
        <div className="relative z-10 bg-white/95 backdrop-blur-md border border-gold-300 rounded-2xl shadow-2xl shadow-gold-200/30 p-8 w-full max-w-md text-center animate-scale-in">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Check size={28} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">¡Clínica creada!</h1>
          <p className="text-gray-600 text-sm mb-6">
            Ahora podés agregar a tu equipo desde <strong className="text-gray-800">Configuración → Equipo</strong>.
          </p>

          <div className="bg-gradient-to-br from-gold-50 to-silver-100 border border-gold-300 rounded-xl px-6 py-4 mb-6">
            <p className="text-xs text-gold-700 font-semibold uppercase tracking-widest mb-1">Código de acceso</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-mono font-bold text-gold-700 tracking-widest">{createdCode}</span>
              <CopyButton text={createdCode} />
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-6">
            También podés ver este código en cualquier momento desde el sidebar.
          </p>

          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-md shadow-gold-300/30"
          >
            Ir al panel
          </button>
        </div>
      </div>
    )
  }

  // ── Formulario de registro (solo admin) ───────────────────────────────────
  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-white to-silver-50 relative overflow-hidden px-4">
      <button
        onClick={() => signOut()}
        className="absolute top-5 left-5 z-20 flex items-center gap-1.5 text-gray-600 hover:text-gray-800 text-sm transition-colors"
      >
        <ArrowLeft size={15} />
        Volver al inicio
      </button>
      <LightPillar {...LIGHT_PILLAR_PROPS} />
      <div className="relative z-10 bg-white/95 backdrop-blur-md border border-gold-300 rounded-2xl shadow-2xl shadow-gold-200/30 p-8 w-full max-w-md animate-scale-in">
        <div className="text-center mb-6 animate-fade-in-down">
          <h1 className="text-2xl font-bold text-gray-800">Crear clínica</h1>
          <p className="text-gray-600 mt-1 text-sm">Configurá tu clínica para empezar a usar MedControl</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
            <input
              className="w-full border border-silver-300 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Tu nombre completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              className="w-full border border-silver-300 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la clínica *</label>
            <input
              className="w-full border border-silver-300 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              value={form.clinic_name}
              onChange={e => set('clinic_name', e.target.value)}
              placeholder="Ej: Clínica San Rafael"
            />
            <p className="text-xs text-gray-500 mt-1">Se generará un código de acceso único para tu equipo.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-md shadow-gold-300/30"
          >
            {loading ? 'Configurando...' : 'Crear clínica'}
          </button>
        </form>

        {/* Aviso para doctores/recepcionistas que lleguen aquí */}
        <div className="mt-5 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            ¿Sos doctor o recepcionista? No necesitás registrarte aquí. Pedile al administrador que te agregue desde <strong>Configuración → Equipo</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
