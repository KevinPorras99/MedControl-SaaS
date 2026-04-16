import { useState, useMemo } from 'react'
import {
  Building2, Plus, Users, BarChart3, CheckCircle, XCircle,
  Edit2, Search, ChevronRight, X, AlertCircle, Crown,
  Stethoscope, Globe, LayoutGrid,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../lib/api'
import { PageHeader, Card, Spinner, Button, Modal, Input, Select, Badge } from '../../components/ui'

const PLANS = [
  { value: 'basico',       label: 'Básico' },
  { value: 'profesional',  label: 'Profesional' },
  { value: 'clinica',      label: 'Clínica' },
]

const PLAN_COLORS = {
  basico:      'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-400/30',
  profesional: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/30',
  clinica:     'bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-400/30',
}

const SPECIALTIES = [
  'Medicina General', 'Medicina Familiar', 'Pediatría', 'Ginecología y Obstetricia',
  'Cardiología', 'Dermatología', 'Neurología', 'Ortopedia y Traumatología',
  'Oftalmología', 'Odontología General', 'Ortodoncia', 'Fisioterapia y Rehabilitación',
  'Laboratorio Clínico', 'Nutrición y Dietética', 'Psiquiatría y Salud Mental', 'Otra',
]

function formatLegalId(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 1) return d
  if (d.length <= 4) return `${d[0]}-${d.slice(1)}`
  return `${d[0]}-${d.slice(1, 4)}-${d.slice(4)}`
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useSuperAdminClinics() {
  const api = useApi()
  return useQuery({
    queryKey: ['superadmin', 'clinics'],
    queryFn: () => api.get('/api/superadmin/clinics').then(r => r.data),
  })
}

function useSuperAdminStats() {
  const api = useApi()
  return useQuery({
    queryKey: ['superadmin', 'stats'],
    queryFn: () => api.get('/api/superadmin/stats').then(r => r.data),
  })
}

function useCreateClinic() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/api/superadmin/clinics', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin'] }),
  })
}

function useUpdateClinicSA() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/api/superadmin/clinics/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin'] }),
  })
}

// ── Create Clinic Form ─────────────────────────────────────────────────────────

const BLANK_FORM = {
  clinic_name: '', legal_id: '', specialty: '',
  clinic_email: '', clinic_phone: '',
  address: '', city: '', province: '', country: 'Costa Rica',
  subscription_plan: 'basico',
  admin_name: '', admin_email: '', admin_password: '',
}

function FieldErr({ msg, show }) {
  if (!show || !msg) return null
  return <p className="flex items-center gap-1 text-xs text-red-500 mt-1"><AlertCircle size={11} />{msg}</p>
}

function CreateClinicModal({ onClose }) {
  const [form, setForm] = useState(BLANK_FORM)
  const [touched, setTouched] = useState({})
  const create = useCreateClinic()

  const set = (k, v) => { setTouched(t => ({ ...t, [k]: true })); setForm(f => ({ ...f, [k]: v })) }

  const errors = {
    clinic_name:    !form.clinic_name.trim() ? 'Requerido' : null,
    admin_name:     !form.admin_name.trim() ? 'Requerido' : null,
    admin_email:    !form.admin_email || !form.admin_email.includes('@') ? 'Email inválido' : null,
    admin_password: form.admin_password.length < 8 ? 'Mínimo 8 caracteres' : null,
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const handleSubmit = async () => {
    setTouched({ clinic_name: true, admin_name: true, admin_email: true, admin_password: true })
    if (hasErrors) return
    await create.mutateAsync(form)
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg bg-white/60 dark:bg-white/[0.06] border border-gray-300/60 dark:border-white/10 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500/40'
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

  return (
    <div className="space-y-5">
      {/* Datos de la clínica */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Building2 size={13} /> Datos de la clínica
        </p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Nombre comercial *</label>
            <input className={inputCls} value={form.clinic_name} onChange={e => set('clinic_name', e.target.value)} placeholder="Ej: Clínica Santa María" />
            <FieldErr msg={errors.clinic_name} show={touched.clinic_name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cédula jurídica</label>
              <input className={inputCls} value={form.legal_id} onChange={e => set('legal_id', formatLegalId(e.target.value))} placeholder="3-XXX-XXXXXX" maxLength={12} />
            </div>
            <div>
              <label className={labelCls}>Especialidad</label>
              <select className={inputCls} value={form.specialty} onChange={e => set('specialty', e.target.value)}>
                <option value="">Seleccionar...</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email de la clínica</label>
              <input className={inputCls} type="email" value={form.clinic_email} onChange={e => set('clinic_email', e.target.value)} placeholder="info@clinica.com" />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input className={inputCls} value={form.clinic_phone} onChange={e => set('clinic_phone', e.target.value)} placeholder="2234-5678" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Dirección</label>
            <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Dirección completa" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Ciudad</label>
              <input className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} placeholder="San José" />
            </div>
            <div>
              <label className={labelCls}>Provincia</label>
              <input className={inputCls} value={form.province} onChange={e => set('province', e.target.value)} placeholder="San José" />
            </div>
            <div>
              <label className={labelCls}>País</label>
              <input className={inputCls} value={form.country} onChange={e => set('country', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Plan de suscripción</label>
            <select className={inputCls} value={form.subscription_plan} onChange={e => set('subscription_plan', e.target.value)}>
              {PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Admin inicial */}
      <div className="border-t border-gray-200/40 dark:border-white/10 pt-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Users size={13} /> Administrador inicial
        </p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Nombre completo *</label>
            <input className={inputCls} value={form.admin_name} onChange={e => set('admin_name', e.target.value)} placeholder="Dr. Juan Pérez" />
            <FieldErr msg={errors.admin_name} show={touched.admin_name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email *</label>
              <input className={inputCls} type="email" value={form.admin_email} onChange={e => set('admin_email', e.target.value)} placeholder="admin@clinica.com" />
              <FieldErr msg={errors.admin_email} show={touched.admin_email} />
            </div>
            <div>
              <label className={labelCls}>Contraseña inicial *</label>
              <input className={inputCls} type="password" value={form.admin_password} onChange={e => set('admin_password', e.target.value)} placeholder="Mínimo 8 caracteres" />
              <FieldErr msg={errors.admin_password} show={touched.admin_password} />
            </div>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2">
            El administrador recibirá acceso con estas credenciales. Pedile que cambie la contraseña al ingresar.
          </p>
        </div>
      </div>

      {create.isError && (
        <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
          <AlertCircle size={14} /> {create.error?.response?.data?.detail || 'Error al crear la clínica'}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button className="flex-1 justify-center" onClick={handleSubmit} disabled={create.isPending}>
          {create.isPending ? 'Creando...' : 'Crear clínica'}
        </Button>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  )
}

// ── Clinic Detail Modal ────────────────────────────────────────────────────────

function ClinicDetailModal({ clinic, onClose }) {
  const updateClinic = useUpdateClinicSA()
  const [editPlan, setEditPlan] = useState(false)
  const [newPlan, setNewPlan] = useState(clinic.subscription_plan)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b border-gray-200/40 dark:border-white/10">
        <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center shrink-0">
          <Building2 size={18} className="text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{clinic.name}</h3>
          {clinic.legal_id && <p className="text-xs text-gray-500 dark:text-white/40">CJ: {clinic.legal_id}</p>}
          {clinic.specialty && <p className="text-xs text-gray-500 dark:text-white/40">{clinic.specialty}</p>}
        </div>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${clinic.is_active ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
          {clinic.is_active ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Email', clinic.email || '—'],
          ['Teléfono', clinic.phone || '—'],
          ['Ciudad', clinic.city || '—'],
          ['País', clinic.country || '—'],
          ['Código acceso', <span className="font-mono font-bold text-yellow-600">{clinic.access_code}</span>],
          ['Usuarios', clinic.user_count],
        ].map(([label, val]) => (
          <div key={label}>
            <p className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-gray-800 dark:text-white">{val}</p>
          </div>
        ))}
      </div>

      {/* Plan */}
      <div className="border border-gray-200/50 dark:border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">Plan</p>
          {!editPlan && <button onClick={() => setEditPlan(true)} className="text-xs text-yellow-600 hover:underline"><Edit2 size={12} className="inline mr-1" />Cambiar</button>}
        </div>
        {editPlan ? (
          <div className="flex gap-2 items-center">
            <select
              value={newPlan}
              onChange={e => setNewPlan(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-white/60 dark:bg-white/[0.06] border border-gray-300/60 dark:border-white/10 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
            >
              {PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <Button size="sm" onClick={async () => { await updateClinic.mutateAsync({ id: clinic.id, subscription_plan: newPlan }); setEditPlan(false) }} disabled={updateClinic.isPending}>
              {updateClinic.isPending ? '...' : 'Guardar'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditPlan(false)}>✕</Button>
          </div>
        ) : (
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${PLAN_COLORS[clinic.subscription_plan]}`}>
            {PLANS.find(p => p.value === clinic.subscription_plan)?.label}
          </span>
        )}
      </div>

      {/* Toggle activa */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-200/50 dark:border-white/10">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white">Estado de la clínica</p>
          <p className="text-xs text-gray-500 dark:text-white/40">{clinic.is_active ? 'Actualmente activa' : 'Actualmente inactiva'}</p>
        </div>
        <Button
          size="sm"
          variant={clinic.is_active ? 'outline' : undefined}
          onClick={() => updateClinic.mutate({ id: clinic.id, is_active: !clinic.is_active })}
          disabled={updateClinic.isPending}
        >
          {clinic.is_active ? <><XCircle size={14} /> Desactivar</> : <><CheckCircle size={14} /> Activar</>}
        </Button>
      </div>

      <Button variant="outline" className="w-full justify-center" onClick={onClose}>Cerrar</Button>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { data: clinics, isLoading } = useSuperAdminClinics()
  const { data: stats } = useSuperAdminStats()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    if (!clinics) return []
    const q = search.toLowerCase()
    return !q ? clinics : clinics.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    )
  }, [clinics, search])

  return (
    <div>
      <div className="animate-fade-in-down">
        <PageHeader
          title={<span className="flex items-center gap-2"><Crown size={22} className="text-yellow-500" /> Panel Superadmin</span>}
          subtitle="Gestión global de la plataforma MedControl"
        />
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          {[
            { label: 'Clínicas totales',  value: stats.total_clinics,  icon: Building2,   color: 'text-blue-500' },
            { label: 'Clínicas activas',  value: stats.active_clinics, icon: CheckCircle, color: 'text-green-500' },
            { label: 'Usuarios totales',  value: stats.total_users,    icon: Users,       color: 'text-purple-500' },
            { label: 'Plan Clínica',      value: stats.plans?.clinica || 0, icon: Crown, color: 'text-yellow-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 dark:text-white/40">{label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Clinic list */}
      <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200/30 dark:border-white/[0.06]">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">Clínicas registradas</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar clínica..."
                className="pl-8 pr-3 py-1.5 text-sm rounded-lg bg-white/60 dark:bg-white/[0.06] border border-gray-300/60 dark:border-white/10 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 w-48"
              />
            </div>
            <Button onClick={() => setShowCreate(true)} size="sm">
              <Plus size={14} /> Nueva clínica
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 flex justify-center"><Spinner /></div>
        ) : !filtered.length ? (
          <div className="p-10 text-center text-gray-400 dark:text-white/30">
            <Building2 size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{search ? 'Sin resultados' : 'No hay clínicas registradas'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200/20 dark:divide-white/[0.06]">
            {filtered.map(clinic => (
              <button
                key={clinic.id}
                onClick={() => setSelected(clinic)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{clinic.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${PLAN_COLORS[clinic.subscription_plan]}`}>
                      {PLANS.find(p => p.value === clinic.subscription_plan)?.label}
                    </span>
                    {!clinic.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 shrink-0">Inactiva</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">
                    {clinic.specialty || 'Sin especialidad'} · {clinic.user_count} usuario(s) · {clinic.city || 'Sin ciudad'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {clinic.is_active
                    ? <CheckCircle size={15} className="text-green-500" />
                    : <XCircle size={15} className="text-red-400" />
                  }
                  <ChevronRight size={15} className="text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Modales */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Crear nueva clínica">
        <CreateClinicModal onClose={() => setShowCreate(false)} />
      </Modal>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle de clínica">
          <ClinicDetailModal clinic={selected} onClose={() => setSelected(null)} />
        </Modal>
      )}
    </div>
  )
}
