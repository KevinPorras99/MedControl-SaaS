import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowLeft, User, Phone, Mail, Calendar, MapPin, FileText,
  Plus, ClipboardList, Receipt, Clock, Edit2, Activity
} from 'lucide-react'
import { PageHeader, Card, Spinner, Badge, Button, Modal, Input, Select, EmptyState } from '../../components/ui'
import {
  usePatient, useUpdatePatient, useMedicalRecords,
  useAppointments, useInvoices
} from '../../hooks'

const TABS = [
  { id: 'info',     label: 'Información',    icon: User },
  { id: 'records',  label: 'Historial',       icon: ClipboardList },
  { id: 'appts',    label: 'Citas',           icon: Calendar },
  { id: 'invoices', label: 'Facturas',        icon: Receipt },
]

function PatientSidebar({ patient, onEdit }) {
  const age = patient.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date)) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center mb-5">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mb-3 ring-4 ring-white/50 dark:ring-white/10">
          <User size={28} className="text-blue-600 dark:text-blue-300" />
        </div>
        <p className="font-bold text-gray-800 dark:text-white text-lg leading-tight">{patient.full_name}</p>
        {age && <p className="text-sm text-gray-500 dark:text-white/50 mt-0.5">{age} años · {patient.gender || 'Sin especificar'}</p>}
      </div>

      <div className="space-y-2.5 text-sm">
        {patient.phone && (
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-white/70">
            <Phone size={14} className="shrink-0 text-gray-400" />
            <span>{patient.phone}</span>
          </div>
        )}
        {patient.email && (
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-white/70">
            <Mail size={14} className="shrink-0 text-gray-400" />
            <span className="truncate">{patient.email}</span>
          </div>
        )}
        {patient.birth_date && (
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-white/70">
            <Calendar size={14} className="shrink-0 text-gray-400" />
            <span>{format(new Date(patient.birth_date), 'dd/MM/yyyy')}</span>
          </div>
        )}
        {patient.address && (
          <div className="flex items-start gap-2.5 text-gray-600 dark:text-white/70">
            <MapPin size={14} className="shrink-0 mt-0.5 text-gray-400" />
            <span className="break-words">{patient.address}</span>
          </div>
        )}
      </div>

      {patient.notes && (
        <div className="mt-4 pt-4 border-t border-gray-200/30 dark:border-white/10">
          <p className="text-xs font-medium text-gray-500 dark:text-white/40 mb-1.5">Notas</p>
          <p className="text-sm text-gray-600 dark:text-white/70 leading-relaxed">{patient.notes}</p>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-200/30 dark:border-white/10">
        <p className="text-xs text-gray-400 dark:text-white/30">
          Registrado el {format(new Date(patient.created_at), 'dd/MM/yyyy')}
        </p>
      </div>

      <Button variant="outline" size="sm" className="w-full justify-center mt-4" onClick={onEdit}>
        <Edit2 size={13} /> Editar paciente
      </Button>
    </Card>
  )
}

function InfoTab({ patient }) {
  const fields = [
    { label: 'Nombre completo', value: patient.full_name },
    { label: 'Fecha de nacimiento', value: patient.birth_date ? format(new Date(patient.birth_date), 'dd/MM/yyyy') : '—' },
    { label: 'Género', value: patient.gender || '—' },
    { label: 'Teléfono', value: patient.phone || '—' },
    { label: 'Email', value: patient.email || '—' },
    { label: 'Dirección', value: patient.address || '—' },
  ]

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-5">Datos del paciente</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm text-gray-800 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
      {patient.notes && (
        <div className="mt-5 pt-4 border-t border-gray-200/30 dark:border-white/10">
          <p className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1.5">Observaciones generales</p>
          <p className="text-sm text-gray-700 dark:text-white/70 leading-relaxed">{patient.notes}</p>
        </div>
      )}
    </Card>
  )
}

function RecordsTab({ patientId, patientName }) {
  const navigate = useNavigate()
  const { data: records, isLoading } = useMedicalRecords(patientId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600 dark:text-white/60">{records?.length || 0} consulta(s)</p>
        <Button size="sm" onClick={() => navigate(`/records/${patientId}/new`)}>
          <Plus size={14} /> Nueva consulta
        </Button>
      </div>

      {isLoading ? <Spinner /> : !records?.length ? (
        <Card className="p-8">
          <EmptyState
            icon={ClipboardList}
            title="Sin historial clínico"
            description="Registrá la primera consulta de este paciente"
            action={<Button onClick={() => navigate(`/records/${patientId}/new`)}><Plus size={14} /> Nueva consulta</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((r, i) => (
            <Card key={r.id} className="p-5 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity size={14} className="text-yellow-500 shrink-0" />
                    <span className="text-xs text-gray-500 dark:text-white/40">
                      {format(new Date(r.created_at), 'dd/MM/yyyy · HH:mm')}
                    </span>
                  </div>
                  {r.diagnosis && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-white/40 mb-0.5">Diagnóstico</p>
                      <p className="text-sm text-gray-800 dark:text-white">{r.diagnosis}</p>
                    </div>
                  )}
                  {r.treatment && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-white/40 mb-0.5">Tratamiento</p>
                      <p className="text-sm text-gray-700 dark:text-white/70 line-clamp-2">{r.treatment}</p>
                    </div>
                  )}
                  {r.prescription && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-white/40 mb-0.5">Prescripción</p>
                      <p className="text-sm text-gray-700 dark:text-white/70 line-clamp-2">{r.prescription}</p>
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/records/${patientId}`)}>
                  <FileText size={13} /> Ver
                </Button>
              </div>

              {r.attachments?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200/30 dark:border-white/10">
                  <p className="text-xs text-gray-500 dark:text-white/40">{r.attachments.length} archivo(s) adjunto(s)</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ApptsTab({ patientId }) {
  const { data: allAppts, isLoading } = useAppointments({ patient_id: patientId, limit: 50 })
  const appts = allAppts || []

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-600 dark:text-white/60">{appts.length} cita(s)</p>
      {isLoading ? <Spinner /> : !appts.length ? (
        <Card className="p-8">
          <EmptyState icon={Calendar} title="Sin citas registradas" description="Este paciente no tiene citas aún" />
        </Card>
      ) : (
        <div className="space-y-2">
          {appts.map((a, i) => (
            <Card key={a.id} className="p-4 animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <Clock size={15} className="text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                      {format(new Date(a.appointment_date), 'dd/MM/yyyy · HH:mm')}
                    </p>
                    {a.reason && <p className="text-xs text-gray-500 dark:text-white/50 truncate">{a.reason}</p>}
                  </div>
                </div>
                <Badge status={a.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function InvoicesTab({ patientId }) {
  const { data: allInvoices, isLoading } = useInvoices({ patient_id: patientId })
  const invoices = allInvoices || []
  const total = invoices.reduce((s, i) => s + Number(i.total), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600 dark:text-white/60">{invoices.length} factura(s)</p>
        {invoices.length > 0 && (
          <p className="text-sm font-semibold text-gray-800 dark:text-white">
            Total: <span className="text-yellow-600">${total.toFixed(2)}</span>
          </p>
        )}
      </div>
      {isLoading ? <Spinner /> : !invoices.length ? (
        <Card className="p-8">
          <EmptyState icon={Receipt} title="Sin facturas" description="Este paciente no tiene facturas registradas" />
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv, i) => (
            <Card key={inv.id} className="p-4 animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{inv.invoice_number}</p>
                  <p className="text-xs text-gray-500 dark:text-white/50">
                    {format(new Date(inv.issued_at), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">${Number(inv.total).toFixed(2)}</p>
                  <Badge status={inv.status} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function EditPatientModal({ patient, open, onClose }) {
  const [form, setForm] = useState({
    full_name: patient.full_name,
    phone: patient.phone || '',
    email: patient.email || '',
    birth_date: patient.birth_date || '',
    gender: patient.gender || '',
    address: patient.address || '',
    notes: patient.notes || '',
  })
  const update = useUpdatePatient()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    await update.mutateAsync({ id: patient.id, ...form })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar paciente">
      <div className="space-y-4">
        <Input label="Nombre completo *" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Teléfono" value={form.phone} onChange={e => set('phone', e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha de nacimiento" type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
          <Select label="Género" value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option value="">Sin especificar</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
          </Select>
        </div>
        <Input label="Dirección" value={form.address} onChange={e => set('address', e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-800 dark:text-white/90">Notas</label>
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-gray-300/50 dark:border-white/20 bg-white/[0.08] dark:bg-white/[0.05] text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/60 resize-none"
            rows={3}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Observaciones, alergias, condiciones crónicas..."
          />
        </div>
        <Button className="w-full justify-center" onClick={handleSubmit} disabled={update.isPending || !form.full_name}>
          {update.isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </Modal>
  )
}

export default function PatientProfilePage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('info')
  const [showEdit, setShowEdit] = useState(false)

  const { data: patient, isLoading } = usePatient(patientId)

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!patient) return (
    <div className="text-center py-20">
      <p className="text-gray-500 dark:text-white/50">Paciente no encontrado.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate('/patients')}>Volver</Button>
    </div>
  )

  return (
    <div>
      {/* Back + header */}
      <div className="animate-fade-in-down">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={15} /> Volver a Pacientes
        </button>
        <PageHeader
          title={patient.full_name}
          subtitle="Expediente del paciente"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(`/records/${patientId}/new`)}>
                <Plus size={14} /> Nueva consulta
              </Button>
              <Button size="sm" onClick={() => navigate('/appointments')}>
                <Calendar size={14} /> Nueva cita
              </Button>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <PatientSidebar patient={patient} onEdit={() => setShowEdit(true)} />
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          {/* Tab nav */}
          <div className="flex gap-1 mb-5 bg-white/[0.05] dark:bg-black/20 rounded-xl p-1 border border-gray-300/30 dark:border-white/[0.06] backdrop-blur-md">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  tab === id
                    ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/30'
                    : 'text-gray-600 dark:text-white/60 hover:text-gray-800 dark:hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'info'     && <InfoTab patient={patient} />}
          {tab === 'records'  && <RecordsTab patientId={patientId} patientName={patient.full_name} />}
          {tab === 'appts'    && <ApptsTab patientId={patientId} />}
          {tab === 'invoices' && <InvoicesTab patientId={patientId} />}
        </div>
      </div>

      {showEdit && <EditPatientModal patient={patient} open={showEdit} onClose={() => setShowEdit(false)} />}
    </div>
  )
}
