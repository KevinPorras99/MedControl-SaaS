import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/api'
import toast from 'react-hot-toast'
import { Copy, Check, ArrowLeft, Building2, UserPlus } from 'lucide-react'
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

const ROLES = [
  { value: 'doctor', label: 'Doctor / Médico' },
  { value: 'receptionist', label: 'Recepcionista' },
]

export default function Onboarding() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const api = useApi()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // 'create' = nueva clínica (admin), 'join' = unirse con código
  const [mode, setMode] = useState('create')
  const [loading, setLoading] = useState(false)
  const [createdCode, setCreatedCode] = useState(null)

  const defaultName = user?.fullName || ''
  const defaultEmail = user?.primaryEmailAddress?.emailAddress || ''

  const [createForm, setCreateForm] = useState({
    full_name: defaultName,
    email: defaultEmail,
    clinic_name: '',
  })

  const [joinForm, setJoinForm] = useState({
    full_name: defaultName,
    email: defaultEmail,
    role: 'doctor',
    access_code: '',
  })

  const setCreate = (k, v) => setCreateForm(prev => ({ ...prev, [k]: v }))
  const setJoin = (k, v) => setJoinForm(prev => ({ ...prev, [k]: v }))

  // ── Crear clínica (admin) ────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!createForm.full_name || !createForm.email) {
      toast.error('Completá tu nombre y email')
      return
    }
    if (!createForm.clinic_name.trim()) {
      toast.error('Ingresá el nombre de la clínica')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/api/auth/onboarding', {
        full_name: createForm.full_name,
        email: createForm.email,
        role: 'admin_clinic',
        clinic_name: createForm.clinic_name.trim(),
      })
      await qc.invalidateQueries(['me'])
      setCreatedCode(res.data.clinic.access_code)
    } catch (err) {
      toast.error(err.message || 'Error al crear la clínica')
    } finally {
      setLoading(false)
    }
  }

  // ── Unirse a clínica existente (doctor / recepcionista) ──────────────────
  const handleJoin = async (e) => {
    e.preventDefault()
    if (!joinForm.full_name || !joinForm.email) {
      toast.error('Completá tu nombre y email')
      return
    }
    if (!joinForm.access_code.trim()) {
      toast.error('Ingresá el código de acceso que te dio el administrador')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/auth/onboarding', {
        full_name: joinForm.full_name,
        email: joinForm.email,
        role: joinForm.role,
        access_code: joinForm.access_code.trim().toUpperCase(),
      })
      await qc.invalidateQueries(['me'])
      toast.success('¡Bienvenido al equipo!')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Error al unirse a la clínica')
    } finally {
      setLoading(false)
    }
  }

  // ── Pantalla de éxito tras crear clínica ─────────────────────────────────
  if (createdCode) {
    return (
      <div className="h-screen flex items-center justify-center relative overflow-hidden">
        <button
          onClick={() => signOut()}
          className="absolute top-5 left-5 z-20 flex items-center gap-1.5 text-gray-600 hover:text-gray-800 text-sm transition-colors"
        >
          <ArrowLeft size={15} />
          Volver al inicio
        </button>
        <LightPillar {...LIGHT_PILLAR_PROPS} />
        <div className="relative z-10 bg-white/95 backdrop-blur-md border border-gold-300 rounded-2xl shadow-2xl shadow-gold-200/30 p-8 w-full max-w-md text-center animate-scale-in">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">¡Clínica creada!</h1>
          <p className="text-gray-600 text-sm mb-6">
            Compartí el código con tu equipo para que puedan unirse.
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

  // ── Formulario principal ──────────────────────────────────────────────────
  return (
    <div className="h-screen flex items-center justify-center relative overflow-hidden px-4">
      <button
        onClick={() => signOut()}
        className="absolute top-5 left-5 z-20 flex items-center gap-1.5 text-gray-600 hover:text-gray-800 text-sm transition-colors"
      >
        <ArrowLeft size={15} />
        Cerrar sesión
      </button>

      <LightPillar {...LIGHT_PILLAR_PROPS} />

      <div className="relative z-10 bg-white/95 backdrop-blur-md border border-gold-300 rounded-2xl shadow-2xl shadow-gold-200/30 p-8 w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Bienvenido a MedControl</h1>
          <p className="text-gray-500 mt-1 text-sm">Elegí cómo querés empezar</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-silver-200 mb-6">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
              mode === 'create'
                ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-inner'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Building2 size={15} />
            Crear clínica
          </button>
          <button
            onClick={() => setMode('join')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
              mode === 'join'
                ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-inner'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <UserPlus size={15} />
            Unirme a clínica
          </button>
        </div>

        {/* ── Modo: Crear clínica ── */}
        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <p className="text-xs text-gray-500 -mt-2 mb-3">
              Creás una nueva clínica y quedás como administrador.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
              <input
                className="w-full border border-silver-300 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                value={createForm.full_name}
                onChange={e => setCreate('full_name', e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                className="w-full border border-silver-300 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                value={createForm.email}
                onChange={e => setCreate('email', e.target.value)}
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la clínica *</label>
              <input
                className="w-full border border-silver-300 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                value={createForm.clinic_name}
                onChange={e => setCreate('clinic_name', e.target.value)}
                placeholder="Ej: Clínica San Rafael"
              />
              <p className="text-xs text-gray-500 mt-1">Se generará un código de acceso único para compartir con tu equipo.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-md shadow-gold-300/30"
            >
              {loading ? 'Creando clínica...' : 'Crear clínica'}
            </button>
          </form>
        )}

        {/* ── Modo: Unirse a clínica ── */}
        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <p className="text-xs text-gray-500 -mt-2 mb-3">
              Usá el código que te dio el administrador de la clínica.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
              <input
                className="w-full border border-silver-300 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                value={joinForm.full_name}
                onChange={e => setJoin('full_name', e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                className="w-full border border-silver-300 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                value={joinForm.email}
                onChange={e => setJoin('email', e.target.value)}
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu rol *</label>
              <select
                className="w-full border border-silver-300 bg-white text-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                value={joinForm.role}
                onChange={e => setJoin('role', e.target.value)}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de acceso *</label>
              <input
                className="w-full border border-silver-300 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-gold-400"
                value={joinForm.access_code}
                onChange={e => setJoin('access_code', e.target.value.toUpperCase().slice(0, 8))}
                placeholder="ABC12345"
                maxLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">El código de 8 caracteres que te compartió el administrador.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-md shadow-gold-300/30"
            >
              {loading ? 'Uniéndome...' : 'Unirme a la clínica'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
