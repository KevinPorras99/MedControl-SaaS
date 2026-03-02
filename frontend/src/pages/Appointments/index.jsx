import { useState } from 'react'
import { Plus, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAppointments, useCreateAppointment, useUpdateAppointment, usePatients } from '../../hooks'
import { Button, PageHeader, Card, Modal, Input, Select, Badge, Spinner, EmptyState } from '../../components/ui'

function AppointmentForm({ onSubmit, loading }) {
  const { data: patients } = usePatients()
  const [form, setForm] = useState({
    patient_id: '', doctor_id: '', appointment_date: '', duration_minutes: 30, reason: '',
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

  const { data: appointments, isLoading } = useAppointments({ status: statusFilter || undefined })
  const createAppointment = useCreateAppointment()
  const updateAppointment = useUpdateAppointment()

  return (
    <div>
      <PageHeader
        title="Citas"
        subtitle={`${appointments?.length || 0} registros`}
        action={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nueva cita</Button>}
      />

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['', 'programada', 'confirmada', 'atendida', 'cancelada'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {s || 'Todas'}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? <Spinner /> : !appointments?.length ? (
          <EmptyState icon={CalendarDays} title="Sin citas" description="Agendá la primera cita" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{['Fecha y hora', 'Paciente', 'Motivo', 'Duración', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appointments.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {format(new Date(a.appointment_date), "dd MMM · HH:mm", { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.patient_id}</td>
                  <td className="px-4 py-3 text-gray-500">{a.reason || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{a.duration_minutes} min</td>
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
