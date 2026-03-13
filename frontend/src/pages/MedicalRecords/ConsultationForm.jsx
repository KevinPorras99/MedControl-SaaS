import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, ClipboardList, Stethoscope, Pill, FileText, AlertCircle } from 'lucide-react'
import { PageHeader, Card, Button, Input, Select, Spinner } from '../../components/ui'
import { usePatient, useCreateRecord, useAppointments, useTeamMembers } from '../../hooks'
import toast from 'react-hot-toast'

const sectionCls = 'bg-white/[0.04] dark:bg-white/[0.02] rounded-xl border border-gray-200/30 dark:border-white/10 p-5'

const SECTION_COLORS = {
  yellow: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-500/20',
  blue:   'text-blue-500 bg-blue-100 dark:bg-blue-500/20',
  green:  'text-green-500 bg-green-100 dark:bg-green-500/20',
  purple: 'text-purple-500 bg-purple-100 dark:bg-purple-500/20',
}

function FormSection({ icon: Icon, title, color = 'yellow', children }) {
  return (
    <div className={sectionCls}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${SECTION_COLORS[color]}`}>
          <Icon size={16} />
        </div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-800 dark:text-white/90">{label}</label>}
      <textarea
        className="w-full px-3 py-2 rounded-lg border border-gray-300/50 dark:border-white/20 bg-white/[0.08] dark:bg-white/[0.05] text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/60 resize-none placeholder-gray-400 dark:placeholder-white/30"
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}

const VITAL_SIGNS = [
  { key: 'weight',     label: 'Peso (kg)',        placeholder: '70' },
  { key: 'height',     label: 'Talla (cm)',        placeholder: '175' },
  { key: 'bp',         label: 'P. Arterial',       placeholder: '120/80' },
  { key: 'heart_rate', label: 'FC (lpm)',           placeholder: '72' },
  { key: 'temp',       label: 'Temperatura (°C)',   placeholder: '36.5' },
  { key: 'spo2',       label: 'SpO2 (%)',           placeholder: '98' },
]

export default function ConsultationFormPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()

  const { data: patient, isLoading: loadingPatient } = usePatient(patientId)
  const { data: appointments } = useAppointments({ patient_id: patientId, limit: 10 })
  const createRecord = useCreateRecord()

  const pendingAppts = appointments?.filter(a =>
    ['programada', 'confirmada'].includes(a.status)
  ) ?? []

  const [form, setForm] = useState({
    appointment_id: '',
    chief_complaint: '',
    vitals: {},
    physical_exam: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: '',
    follow_up: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setVital = (k, v) => setForm(f => ({ ...f, vitals: { ...f.vitals, [k]: v } }))

  const handleSubmit = async () => {
    if (!form.diagnosis && !form.chief_complaint) {
      toast.error('Ingresá al menos el motivo de consulta o diagnóstico')
      return
    }

    const vitalsText = Object.entries(form.vitals)
      .filter(([, v]) => v)
      .map(([k, v]) => {
        const sign = VITAL_SIGNS.find(s => s.key === k)
        return `${sign?.label}: ${v}`
      }).join(' | ')

    const compiledNotes = [
      form.chief_complaint ? `Motivo de consulta: ${form.chief_complaint}` : '',
      vitalsText ? `Signos vitales: ${vitalsText}` : '',
      form.physical_exam ? `Exploración física: ${form.physical_exam}` : '',
      form.follow_up ? `Seguimiento: ${form.follow_up}` : '',
      form.notes ? `Notas adicionales: ${form.notes}` : '',
    ].filter(Boolean).join('\n\n')

    await createRecord.mutateAsync({
      patient_id: patientId,
      appointment_id: form.appointment_id || undefined,
      diagnosis: form.diagnosis || undefined,
      treatment: form.treatment || undefined,
      prescription: form.prescription || undefined,
      notes: compiledNotes || undefined,
    })

    navigate(`/patients/${patientId}`)
  }

  if (loadingPatient) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div>
      <div className="animate-fade-in-down">
        <button
          onClick={() => navigate(`/patients/${patientId}`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={15} />
          Volver al perfil de {patient?.full_name || 'paciente'}
        </button>
        <PageHeader
          title="Nueva Consulta"
          subtitle={patient ? `Paciente: ${patient.full_name}` : ''}
          action={
            <Button onClick={handleSubmit} disabled={createRecord.isPending}>
              <Save size={15} />
              {createRecord.isPending ? 'Guardando...' : 'Guardar consulta'}
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="xl:col-span-2 space-y-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>

          {/* Encabezado de la consulta */}
          <FormSection icon={ClipboardList} title="Datos de la consulta">
            {pendingAppts.length > 0 && (
              <div className="mb-4">
                <Select
                  label="Vincular a cita existente (opcional)"
                  value={form.appointment_id}
                  onChange={e => set('appointment_id', e.target.value)}
                >
                  <option value="">Sin cita asociada</option>
                  {pendingAppts.map(a => (
                    <option key={a.id} value={a.id}>
                      {new Date(a.appointment_date).toLocaleDateString('es-ES', {
                        day: '2-digit', month: '2-digit', year: 'numeric'
                      })} — {a.reason || 'Sin motivo'}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <TextArea
              label="Motivo de consulta / Anamnesis"
              value={form.chief_complaint}
              onChange={e => set('chief_complaint', e.target.value)}
              placeholder="Describí el motivo de la consulta, síntomas, duración, antecedentes relevantes..."
              rows={3}
            />
          </FormSection>

          {/* Signos vitales */}
          <FormSection icon={Stethoscope} title="Signos vitales" color="blue">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {VITAL_SIGNS.map(({ key, label, placeholder }) => (
                <Input
                  key={key}
                  label={label}
                  value={form.vitals[key] || ''}
                  onChange={e => setVital(key, e.target.value)}
                  placeholder={placeholder}
                />
              ))}
            </div>
            <TextArea
              label="Exploración física"
              value={form.physical_exam}
              onChange={e => set('physical_exam', e.target.value)}
              placeholder="Hallazgos del examen físico detallado..."
              rows={3}
            />
          </FormSection>

          {/* Diagnóstico y tratamiento */}
          <FormSection icon={FileText} title="Diagnóstico y tratamiento" color="green">
            <div className="space-y-4">
              <TextArea
                label="Diagnóstico"
                value={form.diagnosis}
                onChange={e => set('diagnosis', e.target.value)}
                placeholder="Diagnóstico principal (puede incluir código CIE-10)..."
                rows={3}
              />
              <TextArea
                label="Plan de tratamiento"
                value={form.treatment}
                onChange={e => set('treatment', e.target.value)}
                placeholder="Indicaciones terapéuticas, procedimientos, estudios solicitados..."
                rows={3}
              />
            </div>
          </FormSection>

          {/* Prescripción */}
          <FormSection icon={Pill} title="Prescripción médica" color="purple">
            <TextArea
              label="Medicamentos recetados"
              value={form.prescription}
              onChange={e => set('prescription', e.target.value)}
              placeholder="Nombre del medicamento, dosis, frecuencia, duración del tratamiento..."
              rows={4}
            />
          </FormSection>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          {/* Notas adicionales */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Notas adicionales</h3>
            </div>
            <TextArea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Observaciones internas, alertas, recordatorios..."
              rows={4}
            />
          </Card>

          {/* Seguimiento */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Seguimiento</h3>
            <TextArea
              label="Indicaciones de seguimiento"
              value={form.follow_up}
              onChange={e => set('follow_up', e.target.value)}
              placeholder="Ej: Control en 2 semanas, solicitar laboratorios..."
              rows={3}
            />
          </Card>

          {/* Resumen del paciente */}
          {patient && (
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Paciente</p>
              <p className="font-medium text-gray-800 dark:text-white">{patient.full_name}</p>
              {patient.birth_date && (
                <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
                  Nac: {new Date(patient.birth_date).toLocaleDateString('es-ES')}
                </p>
              )}
              {patient.gender && (
                <p className="text-xs text-gray-500 dark:text-white/50 capitalize">{patient.gender}</p>
              )}
              {patient.notes && (
                <div className="mt-3 pt-3 border-t border-gray-200/30 dark:border-white/10">
                  <p className="text-xs font-medium text-gray-400 dark:text-white/30 mb-1">Observaciones</p>
                  <p className="text-xs text-gray-600 dark:text-white/60 leading-relaxed line-clamp-4">{patient.notes}</p>
                </div>
              )}
            </Card>
          )}

          {/* Actions */}
          <Button className="w-full justify-center" onClick={handleSubmit} disabled={createRecord.isPending}>
            <Save size={15} />
            {createRecord.isPending ? 'Guardando...' : 'Guardar consulta'}
          </Button>
          <Button variant="outline" className="w-full justify-center" onClick={() => navigate(`/patients/${patientId}`)}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
