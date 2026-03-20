import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, FileText, Receipt, PlusCircle,
  LogOut, User, Clock, CheckCircle2, AlertCircle, Send
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createPortalApi, savePortalToken, getPortalToken, clearPortalToken } from '../../lib/portalApi'

// ── API calls ─────────────────────────────────────────────────────────────────
function usePortalApi() {
  return useMemo(() => createPortalApi(), [])
}

function usePortalMe() {
  const api = usePortalApi()
  return useQuery({
    queryKey: ['portal', 'me'],
    queryFn: () => api.get('/api/portal/me').then(r => r.data),
    retry: false,
  })
}

function usePortalAppointments() {
  const api = usePortalApi()
  return useQuery({
    queryKey: ['portal', 'appointments'],
    queryFn: () => api.get('/api/portal/appointments').then(r => r.data),
  })
}

function usePortalInvoices() {
  const api = usePortalApi()
  return useQuery({
    queryKey: ['portal', 'invoices'],
    queryFn: () => api.get('/api/portal/invoices').then(r => r.data),
  })
}

function usePortalRecords() {
  const api = usePortalApi()
  return useQuery({
    queryKey: ['portal', 'records'],
    queryFn: () => api.get('/api/portal/records').then(r => r.data),
  })
}

function useRequestAppointment() {
  const api = usePortalApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/api/portal/appointment-request', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries(['portal']),
  })
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    programada: 'bg-blue-100 text-blue-700',
    confirmada:  'bg-green-100 text-green-700',
    cancelada:   'bg-red-100 text-red-700',
    atendida:    'bg-gray-100 text-gray-600',
    pendiente:   'bg-yellow-100 text-yellow-700',
    pagada:      'bg-green-100 text-green-700',
    anulada:     'bg-red-100 text-red-600',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'appointments', label: 'Mis Citas',    icon: CalendarDays },
  { id: 'invoices',     label: 'Mis Facturas', icon: Receipt },
  { id: 'records',      label: 'Mi Historial', icon: FileText },
  { id: 'request',      label: 'Solicitar Cita', icon: PlusCircle },
]

// ── Tab: Citas ────────────────────────────────────────────────────────────────
function AppointmentsTab() {
  const { data: appointments = [], isLoading } = usePortalAppointments()

  if (isLoading) return <Spinner />

  if (!appointments.length)
    return (
      <EmptyState icon={CalendarDays} title="Sin citas próximas"
        description="No tenés citas programadas actualmente." />
    )

  return (
    <div className="space-y-3">
      {appointments.map(a => (
        <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-800">
                {format(new Date(a.appointment_date), "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-0.5">
                {format(new Date(a.appointment_date), 'HH:mm')}
              </p>
            </div>
            <StatusBadge status={a.status} />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm text-gray-600">
            {a.doctor_name && <p><span className="font-medium">Médico:</span> Dr. {a.doctor_name}</p>}
            {a.reason      && <p><span className="font-medium">Motivo:</span> {a.reason}</p>}
            <p><span className="font-medium">Duración:</span> {a.duration_minutes} min</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tab: Facturas ─────────────────────────────────────────────────────────────
function InvoicesTab() {
  const { data: invoices = [], isLoading } = usePortalInvoices()

  if (isLoading) return <Spinner />

  if (!invoices.length)
    return <EmptyState icon={Receipt} title="Sin facturas" description="No hay facturas registradas." />

  return (
    <div className="space-y-3">
      {invoices.map(inv => (
        <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-800">{inv.invoice_number}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {format(new Date(inv.issued_at), "d MMM yyyy", { locale: es })}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-800">₡{Number(inv.total).toLocaleString()}</p>
            <StatusBadge status={inv.status} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tab: Historial ────────────────────────────────────────────────────────────
function RecordsTab() {
  const { data: records = [], isLoading } = usePortalRecords()

  if (isLoading) return <Spinner />

  if (!records.length)
    return <EmptyState icon={FileText} title="Sin historial" description="No hay registros médicos disponibles." />

  return (
    <div className="space-y-3">
      {records.map(r => (
        <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-800">
                {format(new Date(r.created_at), "d 'de' MMMM yyyy", { locale: es })}
              </p>
              {r.doctor_name && (
                <p className="text-sm text-gray-500 mt-0.5">Dr. {r.doctor_name}</p>
              )}
            </div>
            {r.has_prescription && (
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                Con receta
              </span>
            )}
          </div>
          {r.diagnosis && (
            <p className="mt-2 text-sm text-gray-600 border-t border-gray-100 pt-2">
              <span className="font-medium">Diagnóstico:</span> {r.diagnosis}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Tab: Solicitar cita ───────────────────────────────────────────────────────
function RequestTab() {
  const [form, setForm] = useState({ preferred_date: '', reason: '', notes: '' })
  const [sent, setSent] = useState(false)
  const mutation = useRequestAppointment()

  const handleSubmit = async (e) => {
    e.preventDefault()
    await mutation.mutateAsync(form)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
          <CheckCircle2 size={28} className="text-green-600" />
        </div>
        <h3 className="font-semibold text-gray-800">¡Solicitud enviada!</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          El equipo de la clínica recibió tu solicitud y se contactará contigo pronto.
        </p>
        <button onClick={() => { setSent(false); setForm({ preferred_date: '', reason: '', notes: '' }) }}
          className="mt-2 text-sm text-amber-600 font-medium hover:text-amber-700">
          Enviar otra solicitud
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha preferida *</label>
        <input
          type="date"
          required
          value={form.preferred_date}
          onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de consulta</label>
        <input
          type="text"
          placeholder="Ej: Control de rutina, dolor de cabeza..."
          value={form.reason}
          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales</label>
        <textarea
          rows={3}
          placeholder="Cualquier información adicional para el médico..."
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending || !form.preferred_date}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
      >
        <Send size={16} />
        {mutation.isPending ? 'Enviando...' : 'Enviar solicitud'}
      </button>
      {mutation.isError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle size={14} /> {mutation.error?.message}
        </p>
      )}
    </form>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
        <Icon size={22} className="text-gray-400" />
      </div>
      <p className="font-medium text-gray-700">{title}</p>
      <p className="text-sm text-gray-400 max-w-xs">{description}</p>
    </div>
  )
}

// ── Portal principal ──────────────────────────────────────────────────────────
export default function PortalPage() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState('appointments')
  const [ready, setReady] = useState(false)

  // Al cargar, extraer token de la URL y guardarlo en localStorage
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')
    if (tokenFromUrl) {
      savePortalToken(tokenFromUrl)
      // Limpiar el token de la URL por seguridad (no quedarse en el historial)
      window.history.replaceState({}, '', '/portal')
    }
    setReady(true)
  }, [])

  const { data: me, isLoading, isError } = usePortalMe()

  const handleLogout = () => {
    clearPortalToken()
    window.location.href = '/'
  }

  if (!ready || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !getPortalToken()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h2 className="font-bold text-xl text-gray-800 mb-2">Acceso inválido</h2>
          <p className="text-gray-500 text-sm">
            El link de acceso es inválido o ha expirado. Solicitá un nuevo link a tu médico.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 leading-none">Portal del Paciente</p>
              <p className="font-semibold text-gray-800 text-sm leading-tight">{me?.full_name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={14} />
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-5">
        {tab === 'appointments' && <AppointmentsTab />}
        {tab === 'invoices'     && <InvoicesTab />}
        {tab === 'records'      && <RecordsTab />}
        {tab === 'request'      && <RequestTab />}
      </main>
    </div>
  )
}
