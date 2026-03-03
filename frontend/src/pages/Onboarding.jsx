import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/api'
import toast from 'react-hot-toast'
import { Copy, Check } from 'lucide-react'
import LightPillar from '../components/LightPillar'

const ROLES = [
  { value: 'admin_clinic', label: 'Administrador', description: 'Creás una clínica nueva y la administrás' },
  { value: 'doctor',       label: 'Doctor/a',       description: 'Te unís a una clínica existente como médico' },
  { value: 'receptionist', label: 'Recepcionista',  description: 'Te unís a una clínica existente como recepcionista' },
]

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handle} className="ml-2 text-blue-600 hover:text-blue-800 transition-colors">
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  )
}

export default function Onboarding() {
  const { user } = useUser()
  const api = useApi()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [role, setRole] = useState('admin_clinic')
  const [form, setForm] = useState({
    full_name: user?.fullName || '',
    email: user?.primaryEmailAddress?.emailAddress || '',
    clinic_name: '',
    clinic_id: '',
    access_code: '',
  })
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(false)
  const [createdCode, setCreatedCode] = useState(null) // código generado para admin

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  // Cargar clínicas disponibles para el dropdown (endpoint público)
  useEffect(() => {
    api.get('/api/auth/clinics').then(r => setClinics(r.data)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name || !form.email) {
      toast.error('Completá tu nombre y email')
      return
    }
    if (role === 'admin_clinic' && !form.clinic_name) {
      toast.error('Ingresá el nombre de tu clínica')
      return
    }
    if (role !== 'admin_clinic' && (!form.clinic_id || !form.access_code)) {
      toast.error('Seleccioná una clínica e ingresá el código de acceso')
      return
    }

    setLoading(true)
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        role,
        ...(role === 'admin_clinic'
          ? { clinic_name: form.clinic_name }
          : { clinic_id: form.clinic_id, access_code: form.access_code.trim().toUpperCase() }
        ),
      }
      const res = await api.post('/api/auth/onboarding', payload)
      await qc.invalidateQueries(['me'])

      if (role === 'admin_clinic') {
        // Mostrar el código de acceso generado antes de ir al dashboard
        setCreatedCode(res.data.clinic.access_code)
      } else {
        toast.success('¡Bienvenido/a!')
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      toast.error(err.message || 'Error al configurar la cuenta')
    } finally {
      setLoading(false)
    }
  }

  // ── Pantalla de éxito para admin (muestra el código de acceso) ───────────
  if (createdCode) {
    return (
      <div className="h-screen flex items-center justify-center bg-black relative overflow-hidden">
        <LightPillar
        topColor="#5227FF"
        bottomColor="#FF9FFC"
        intensity={1}
        rotationSpeed={0.3}
        glowAmount={0.002}
        pillarWidth={3}
        pillarHeight={0.4}
        noiseIntensity={0.5}
        pillarRotation={25}
        interactive={false}
        mixBlendMode="screen"
        quality="high"
      />
      <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-14 h-14 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">¡Clínica creada!</h1>
          <p className="text-white/60 text-sm mb-6">
            Compartí este código con tu equipo para que puedan unirse a tu clínica.
          </p>

          <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 mb-6">
            <p className="text-xs text-purple-300 font-semibold uppercase tracking-widest mb-1">Código de acceso</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-mono font-bold text-white tracking-widest">{createdCode}</span>
              <CopyButton text={createdCode} />
            </div>
          </div>

          <p className="text-xs text-white/40 mb-6">
            También podés ver este código en cualquier momento desde el sidebar.
          </p>

          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Ir al panel
          </button>
        </div>
      </div>
    )
  }

  // ── Formulario principal ─────────────────────────────────────────────────
  return (
    <div className="h-screen flex items-center justify-center bg-black relative overflow-hidden px-4">
      <LightPillar
        topColor="#5227FF"
        bottomColor="#FF9FFC"
        intensity={1}
        rotationSpeed={0.3}
        glowAmount={0.002}
        pillarWidth={3}
        pillarHeight={0.4}
        noiseIntensity={0.5}
        pillarRotation={25}
        interactive={false}
        mixBlendMode="screen"
        quality="high"
      />
      <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Configurar cuenta</h1>
          <p className="text-white/60 mt-1 text-sm">Completá los datos para empezar a usar MedControl</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nombre y email */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Nombre completo *</label>
            <input
              className="w-full border border-white/20 bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Tu nombre completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Email *</label>
            <input
              type="email"
              className="w-full border border-white/20 bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          {/* Selector de rol */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">¿Cuál es tu rol? *</label>
            <div className="space-y-2">
              {ROLES.map(r => (
                <label
                  key={r.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    role === r.value
                      ? 'border-purple-400 bg-purple-500/20'
                      : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="mt-0.5 accent-purple-400"
                  />
                  <div>
                    <div className="text-sm font-semibold text-white">{r.label}</div>
                    <div className="text-xs text-white/50">{r.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Campos según el rol */}
          {role === 'admin_clinic' ? (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Nombre de la clínica *</label>
              <input
                className="w-full border border-white/20 bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.clinic_name}
                onChange={e => set('clinic_name', e.target.value)}
                placeholder="Ej: Clínica San Rafael"
              />
              <p className="text-xs text-white/40 mt-1">Se generará un código de acceso único para tu equipo.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Clínica *</label>
                <select
                  className="w-full border border-white/20 bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={form.clinic_id}
                  onChange={e => set('clinic_id', e.target.value)}
                >
                  <option value="" className="bg-gray-900">Seleccionar clínica...</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>
                  ))}
                </select>
                {clinics.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">No hay clínicas registradas aún. Pedile al administrador que cree una.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Código de acceso *</label>
                <input
                  className="w-full border border-white/20 bg-white/10 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={form.access_code}
                  onChange={e => set('access_code', e.target.value.toUpperCase())}
                  placeholder="Ej: A3K9P2"
                  maxLength={10}
                />
                <p className="text-xs text-white/40 mt-1">Pedíselo al administrador de tu clínica.</p>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Configurando...' : 'Comenzar'}
          </button>
        </form>
      </div>
    </div>
  )
}
