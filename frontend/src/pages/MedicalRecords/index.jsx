import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, FileText, Paperclip, Trash2, FileImage, File } from 'lucide-react'
import { format } from 'date-fns'
import { useMedicalRecords, useCreateRecord, useUploadAttachment, useDeleteAttachment } from '../../hooks'
import { Button, PageHeader, Card, Modal, EmptyState, Spinner } from '../../components/ui'

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mime }) {
  if (!mime) return <File size={13} className="text-gray-400 dark:text-white/50 shrink-0" />
  if (mime.startsWith('image/')) return <FileImage size={13} className="text-blue-500 shrink-0" />
  if (mime === 'application/pdf') return <FileText size={13} className="text-red-500 shrink-0" />
  return <File size={13} className="text-gray-400 dark:text-white/50 shrink-0" />
}

function AttachmentsSection({ record, patientId }) {
  const inputRef = useRef(null)
  const upload = useUploadAttachment()
  const remove = useDeleteAttachment()

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (file) {
      upload.mutate({ recordId: record.id, patientId, file })
      e.target.value = ''
    }
  }

  return (
    <div className="mt-4 border-t border-silver-200 pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-600 dark:text-white/70 uppercase tracking-wide">Archivos adjuntos</p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="flex items-center gap-1 text-xs text-gold-600 hover:text-gold-700 disabled:opacity-50 transition-colors"
        >
          <Paperclip size={12} />
          {upload.isPending ? 'Subiendo...' : 'Subir archivo'}
        </button>
        <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx" onChange={handleFile} />
      </div>

      {!record.attachments?.length ? (
        <p className="text-xs text-gray-400 dark:text-white/50 italic">Sin archivos adjuntos</p>
      ) : (
        <ul className="space-y-1">
          {record.attachments.map(att => (
            <li key={att.id} className="flex items-center justify-between gap-2 py-1 border-b border-silver-100 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon mime={att.mime_type} />
                <a href={att.file_url} target="_blank" rel="noreferrer"
                  className="text-xs text-gray-600 dark:text-white/70 hover:text-gold-600 dark:hover:text-gold-400 truncate max-w-[200px] transition-colors" title={att.file_name}>
                  {att.file_name}
                </a>
                {att.file_size_bytes && <span className="text-xs text-gray-400 dark:text-white/50 shrink-0">{formatSize(att.file_size_bytes)}</span>}
              </div>
              <button onClick={() => remove.mutate({ attachmentId: att.id, patientId })} disabled={remove.isPending}
                className="text-gray-400 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 transition-colors shrink-0" title="Eliminar archivo">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RecordForm({ patientId, onSubmit, loading }) {
  const [form, setForm] = useState({ patient_id: patientId, diagnosis: '', treatment: '', notes: '', prescription: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const textareaCls = 'mt-1 w-full px-3 py-2 border border-silver-300 bg-white text-gray-800 placeholder-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none'

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-white/80">Diagnóstico</label>
        <textarea rows={3} className={textareaCls} value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-white/80">Tratamiento</label>
        <textarea rows={3} className={textareaCls} value={form.treatment} onChange={e => set('treatment', e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-white/80">Notas adicionales</label>
        <textarea rows={2} className={textareaCls} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Receta</label>
        <textarea rows={3} className={textareaCls} value={form.prescription} onChange={e => set('prescription', e.target.value)} />
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
      <div className="animate-fade-in-down">
        <PageHeader
          title="Expediente Clínico"
          subtitle={`${records?.length || 0} registros`}
          action={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nuevo registro</Button>}
        />
      </div>

      {isLoading ? <Spinner /> : !records?.length ? (
        <EmptyState icon={FileText} title="Sin registros" description="Agregá el primer registro del expediente" />
      ) : (
        <div className="space-y-4">
          {records.map((r, i) => (
            <Card key={r.id} className="p-5 animate-fade-in stagger-item" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-gray-500 dark:text-white/60">{format(new Date(r.created_at), 'dd/MM/yyyy HH:mm')}</p>
                <span className="text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-400/30 px-2 py-0.5 rounded-full font-medium">Inmutable</span>
              </div>
              {r.diagnosis   && <div className="mb-3"><p className="text-xs font-semibold text-gray-600 dark:text-white/70 mb-1 uppercase tracking-wide">Diagnóstico</p><p className="text-sm text-gray-800 dark:text-white">{r.diagnosis}</p></div>}
              {r.treatment   && <div className="mb-3"><p className="text-xs font-semibold text-gray-600 dark:text-white/70 mb-1 uppercase tracking-wide">Tratamiento</p><p className="text-sm text-gray-800 dark:text-white">{r.treatment}</p></div>}
              {r.notes       && <div className="mb-3"><p className="text-xs font-semibold text-gray-600 dark:text-white/70 mb-1 uppercase tracking-wide">Notas</p><p className="text-sm text-gray-600 dark:text-white/70">{r.notes}</p></div>}
              {r.prescription && (
                <div className="bg-gold-50 border border-gold-200 rounded-lg p-3 mb-1">
                  <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Receta</p>
                  <p className="text-sm text-gray-800 dark:text-white whitespace-pre-line">{r.prescription}</p>
                </div>
              )}
              <AttachmentsSection record={r} patientId={patientId} />
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
