import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useMedicalRecords, useCreateRecord } from '../../hooks'
import { Button, PageHeader, Card, Modal, EmptyState, Spinner } from '../../components/ui'

function RecordForm({ patientId, onSubmit, loading }) {
  const [form, setForm] = useState({ patient_id: patientId, diagnosis: '', treatment: '', notes: '', prescription: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">Diagnóstico</label>
        <textarea rows={3} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Tratamiento</label>
        <textarea rows={3} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.treatment} onChange={e => set('treatment', e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Notas adicionales</label>
        <textarea rows={2} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Receta</label>
        <textarea rows={3} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.prescription} onChange={e => set('prescription', e.target.value)} />
      </div>
      <Button className="w-full justify-center" onClick={() => onSubmit(form)} disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar registro'}
      </Button>
    </div>
  )
}

export default function MedicalRecordsPage() {
  const { patientId } = useParams()
  const [showCreate, setShowCreate] = useState(false)
  const { data: records, isLoading } = useMedicalRecords(patientId)
  const createRecord = useCreateRecord()

  return (
    <div>
      <PageHeader
        title="Expediente Clínico"
        subtitle={`${records?.length || 0} registros`}
        action={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nuevo registro</Button>}
      />

      {isLoading ? <Spinner /> : !records?.length ? (
        <EmptyState icon={FileText} title="Sin registros" description="Agregá el primer registro del expediente" />
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-gray-400">{format(new Date(r.created_at), 'dd/MM/yyyy HH:mm')}</p>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Inmutable</span>
              </div>
              {r.diagnosis && <div className="mb-3"><p className="text-xs font-semibold text-gray-500 mb-1">DIAGNÓSTICO</p><p className="text-sm text-gray-800">{r.diagnosis}</p></div>}
              {r.treatment  && <div className="mb-3"><p className="text-xs font-semibold text-gray-500 mb-1">TRATAMIENTO</p><p className="text-sm text-gray-800">{r.treatment}</p></div>}
              {r.notes      && <div className="mb-3"><p className="text-xs font-semibold text-gray-500 mb-1">NOTAS</p><p className="text-sm text-gray-600">{r.notes}</p></div>}
              {r.prescription && <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs font-semibold text-gray-500 mb-1">RECETA</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.prescription}</p></div>}
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Registro Médico">
        <RecordForm
          patientId={patientId}
          onSubmit={async data => { await createRecord.mutateAsync(data); setShowCreate(false) }}
          loading={createRecord.isPending}
        />
      </Modal>
    </div>
  )
}
