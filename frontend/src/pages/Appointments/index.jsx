import { useState, useMemo } from 'react'
import { Plus, CalendarDays, Search } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQueryClient } from '@tanstack/react-query'
import { useAppointments, useCreateAppointment, useUpdateAppointment, usePatients } from '../../hooks'
import { Button, PageHeader, Card, Modal, Input, Select, Badge, Spinner, EmptyState } from '../../components/ui'

function AppointmentForm({ onSubmit, loading }) {
  const { data: patients } = usePatients()
  const qc = useQueryClient()
  const me = qc.getQueryData(['me'])
  const currentUserId = me?.user?.id || ''
  const [form, setForm] = useState({
    patient_id: '', doctor_id: currentUserId, appointment_date: '', duration_minutes: 30, reason: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <Select label="Paciente *" value={form.patient_id} onChange={e => set('patient_id', e.target.value)}>
        <option value="">Seleccionar paciente...</option>
        {patients?.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </Select>
      <Input label="Fecha y hora *" type="datetime-local" value={form.appointment_date} onChange={e => set('appointment_date', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Duración" value={form.duration_minutes} onChange={e => set('duration_minutes', +e.target.value)}>
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
          <option value={45}>45 min</option>
          <option value={60}>1 hora</option>
        </Select>
        <Input label="Motivo" value={form.reason} onChange={e => set('reason', e.target.value)} />
      </div>
      <Button
        className="w-full justify-center"
        onClick={() => onSubmit(form)}
        disabled={loading || !form.patient_id || !form.appointment_date}
      >
        {loading ? 'Guardando...' : 'Crear cita'}
      </Button>
    </div>
  )
}

export default function AppointmentsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const { data: appointments, isLoading } = useAppointments({ status: statusFilter || undefined })
  const createAppointment = useCreateAppointment()
  const updateAppointment = useUpdateAppointment()

  // patient_name y doctor_name vienen del backend (JOIN) — sin necesidad de fetchear pacientes aquí
  const filtered = useMemo(() => {
    if (!appointments) return []
    if (!search.trim()) return appointments
    const q = search.toLowerCase()
    return appointments.filter(a =>
      a.patient_name?.toLowerCase().includes(q) ||
      a.reason?.toLowerCase().includes(q) ||
      a.status?.toLowerCase().includes(q)
    )
  }, [appointments, search])

  return (
    <div>
      <div className="animate-fade-in-down">
        <PageHeader
          title="Citas"
          subtitle={`${filtered.length} registros`}
          action={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nueva cita</Button>}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/50" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300/50 dark:border-white/20 bg-white/[0.08] dark:bg-white/[0.05] backdrop-blur-md dark:backdrop-blur-md text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/60 dark:focus:ring-gold-400/40"
            placeholder="Buscar por paciente, motivo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'programada', 'confirmada', 'atendida', 'cancelada'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === s
                  ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-lg shadow-gold-300/30'
                  : 'bg-white/[0.08] dark:bg-white/[0.05] border border-gray-300/50 dark:border-white/20 text-gray-600 dark:text-white/80 hover:bg-white/[0.12] dark:hover:bg-white/[0.08] hover:text-gold-700 dark:hover:text-gold-400 backdrop-blur-md dark:backdrop-blur-md'
              }`}
            >
              {s || 'Todas'}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {isLoading ? <Spinner /> : !filtered.length ? (
          <EmptyState icon={CalendarDays} title="Sin citas" description={search ? 'No hay resultados para tu búsqueda' : 'Agendá la primera cita'} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gold-50 border-b border-gold-200">
              <tr>{['Fecha y hora', 'Paciente', 'Motivo', 'Duración', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-white/70 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-silver-100">
              {filtered.map((a, i) => (
                <tr key={a.id} className="hover:bg-gold-50/50 transition-colors animate-fade-in stagger-item" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                    {format(new Date(a.appointment_date), "dd MMM · HH:mm", { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-white font-medium">
                    {a.patient_name || <span className="text-gray-400 dark:text-white/50 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-white/70">{a.reason || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-white/70">{a.duration_minutes} min</td>
                  <td className="px-4 py-3"><Badge status={a.status} /></td>
                  <td className="px-4 py-3">
                    <Select
                      value={a.status}
                      onChange={e => updateAppointment.mutate({ id: a.id, status: e.target.value })}
                      className="text-xs py-1"
                    >
                      {['programada', 'confirmada', 'atendida', 'cancelada'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva Cita">
        <AppointmentForm
          onSubmit={async data => { await createAppointment.mutateAsync(data); setShowCreate(false) }}
          loading={createAppointment.isPending}
        />
      </Modal>
    </div>
  )
}
