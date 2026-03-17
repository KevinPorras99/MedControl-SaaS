import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, Download, CheckCircle2, XCircle, AlertTriangle,
  ArrowLeft, ArrowRight, FileSpreadsheet, RotateCcw, Users,
} from 'lucide-react'
import clsx from 'clsx'
import { Button, PageHeader, Card, Spinner } from '../../components/ui'
import {
  useDownloadImportTemplate,
  useImportPreview,
  useImportConfirm,
} from '../../hooks'

// ── Constantes de pasos ────────────────────────────
const STEPS = ['Subir archivo', 'Revisar datos', 'Importar']

// ── Step indicator ─────────────────────────────────
function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done    = i < current
        const active  = i === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                done   && 'bg-emerald-500 border-emerald-500 text-white',
                active && 'bg-yellow-500 border-yellow-500 text-white shadow-lg shadow-yellow-500/30',
                !done && !active && 'bg-white/[0.05] border-white/20 text-white/40',
              )}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={clsx(
                'text-[11px] font-medium whitespace-nowrap',
                active ? 'text-yellow-400' : done ? 'text-emerald-400' : 'text-white/30',
              )}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx(
                'flex-1 h-px mx-2 mb-5 transition-all',
                done ? 'bg-emerald-500' : 'bg-white/10',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Paso 1: Subir archivo ─────────────────────────
function UploadStep({ onPreview, downloadTemplate }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const inputRef = useRef()
  const preview = useImportPreview()

  const handleFile = (f) => {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      alert('Solo se aceptan archivos CSV o Excel (.xlsx)')
      return
    }
    setFile(f)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const handleSubmit = async () => {
    if (!file) return
    const result = await preview.mutateAsync(file)
    onPreview(result, file.name)
  }

  return (
    <div className="space-y-6">
      {/* Descarga de plantilla */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet size={20} className="text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-white mb-0.5">Paso previo: descargá la plantilla</p>
            <p className="text-xs text-gray-500 dark:text-white/50 mb-3">
              Completá el archivo con los datos de tus pacientes y luego subílo aquí. Soporta hasta 2 000 pacientes por importación.
            </p>
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <Download size={13} /> Descargar plantilla CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Zona de drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
          dragging
            ? 'border-yellow-400 bg-yellow-400/10 scale-[1.01]'
            : file
              ? 'border-emerald-400 bg-emerald-400/10'
              : 'border-white/20 bg-white/[0.03] hover:border-yellow-400/60 hover:bg-yellow-400/5',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 size={36} className="text-emerald-400" />
            <p className="font-semibold text-emerald-400">{file.name}</p>
            <p className="text-xs text-white/40">{(file.size / 1024).toFixed(1)} KB · Clic para cambiar</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={36} className="text-white/30" />
            <p className="text-sm font-medium text-white/60">Arrastrá tu archivo aquí o hacé clic para seleccionar</p>
            <p className="text-xs text-white/30">CSV · XLSX · Máx. 5 MB · 2 000 filas</p>
          </div>
        )}
      </div>

      <Button
        className="w-full justify-center"
        onClick={handleSubmit}
        disabled={!file || preview.isPending}
      >
        {preview.isPending ? <><Spinner size="sm" /> Procesando...</> : <><ArrowRight size={15} /> Analizar archivo</>}
      </Button>
    </div>
  )
}

// ── Chips de resumen ───────────────────────────────
function SummaryChip({ count, label, color }) {
  const colors = {
    green:  'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    red:    'bg-red-500/15 border-red-500/30 text-red-400',
    yellow: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
  }
  return (
    <div className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold', colors[color])}>
      <span className="text-base font-bold">{count}</span> {label}
    </div>
  )
}

// ── Paso 2: Revisar preview ────────────────────────
function PreviewStep({ preview, fileName, onConfirm, onBack, loading }) {
  const [includeDupes, setIncludeDupes] = useState(false)

  const totalToImport = preview.valid_count + (includeDupes ? preview.duplicate_count : 0)

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <Card className="p-5">
        <p className="text-xs text-white/50 mb-3 font-medium uppercase tracking-wide">Archivo: {fileName}</p>
        <div className="flex flex-wrap gap-3">
          <SummaryChip count={preview.valid_count}     label="válidos"     color="green" />
          <SummaryChip count={preview.invalid_count}   label="con errores" color="red" />
          <SummaryChip count={preview.duplicate_count} label="duplicados"  color="yellow" />
        </div>
      </Card>

      {/* Duplicados */}
      {preview.duplicate_count > 0 && (
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">
                {preview.duplicate_count} posible{preview.duplicate_count !== 1 ? 's' : ''} duplicado{preview.duplicate_count !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-500 dark:text-white/50">
                Estos pacientes tienen email o teléfono que ya existe en la clínica.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none mt-2">
            <input
              type="checkbox"
              checked={includeDupes}
              onChange={e => setIncludeDupes(e.target.checked)}
              className="w-4 h-4 accent-yellow-500"
            />
            <span className="text-sm text-gray-700 dark:text-white/80">Importar duplicados de todas formas</span>
          </label>
          {/* Lista de duplicados */}
          <div className="mt-3 max-h-36 overflow-y-auto space-y-1 pr-1">
            {preview.duplicates.map((d, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/8 border border-yellow-500/20 text-xs">
                <AlertTriangle size={12} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <span className="text-yellow-200 font-medium">{d.patient?.full_name}</span>
                <span className="text-white/40 truncate">{d.reason}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Errores */}
      {preview.invalid_count > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={16} className="text-red-400" />
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {preview.invalid_count} fila{preview.invalid_count !== 1 ? 's' : ''} con errores (no se importarán)
            </p>
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            {preview.invalid.map((row, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20 text-xs">
                <span className="text-red-400 font-medium">Fila {row.row}:</span>{' '}
                <span className="text-white/60">{row.errors.join(' · ')}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filas válidas (preview parcial) */}
      {preview.valid_count > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">
              Pacientes a importar (mostrando primeros {Math.min(10, preview.valid.length)} de {preview.valid_count})
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/[0.03]">
                  {['Nombre', 'Teléfono', 'Email', 'Nacimiento', 'Género'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-white/40 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {preview.valid.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.03]">
                    <td className="px-3 py-2 text-white/90 font-medium">{row.patient.full_name}</td>
                    <td className="px-3 py-2 text-white/60">{row.patient.phone || '—'}</td>
                    <td className="px-3 py-2 text-white/60">{row.patient.email || '—'}</td>
                    <td className="px-3 py-2 text-white/60">{row.patient.birth_date || '—'}</td>
                    <td className="px-3 py-2 text-white/60">{row.patient.gender || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Acciones */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 justify-center">
          <ArrowLeft size={15} /> Volver
        </Button>
        <Button
          className="flex-1 justify-center"
          disabled={totalToImport === 0 || loading}
          onClick={() => onConfirm({
            rows: preview.valid.map(r => r.patient),
            include_duplicates: includeDupes,
            duplicate_rows: preview.duplicates,
          })}
        >
          {loading
            ? <><Spinner size="sm" /> Importando...</>
            : <><CheckCircle2 size={15} /> Importar {totalToImport} paciente{totalToImport !== 1 ? 's' : ''}</>}
        </Button>
      </div>
    </div>
  )
}

// ── Paso 3: Resultado ─────────────────────────────
function ResultStep({ result, onReset, onFinish }) {
  return (
    <Card className="p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={32} className="text-emerald-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-1">¡Importación completada!</h2>
      <p className="text-white/50 text-sm mb-6">Los pacientes ya están disponibles en el sistema</p>

      <div className="flex justify-center gap-6 mb-8">
        <div className="text-center">
          <p className="text-3xl font-bold text-emerald-400">{result.imported}</p>
          <p className="text-xs text-white/40 mt-1">Importados</p>
        </div>
        {result.skipped > 0 && (
          <div className="text-center">
            <p className="text-3xl font-bold text-red-400">{result.skipped}</p>
            <p className="text-xs text-white/40 mt-1">Omitidos</p>
          </div>
        )}
      </div>

      {result.errors?.length > 0 && (
        <div className="mb-6 text-left max-h-40 overflow-y-auto space-y-1">
          {result.errors.map((e, i) => (
            <div key={i} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
              Fila {e.row_index + 1} ({e.name}): {e.error}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onReset}>
          <RotateCcw size={14} /> Nueva importación
        </Button>
        <Button onClick={onFinish}>
          <Users size={14} /> Ver pacientes
        </Button>
      </div>
    </Card>
  )
}

// ── Page principal ────────────────────────────────
export default function ImportPatientsPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [previewData, setPreviewData] = useState(null)
  const [fileName, setFileName]   = useState('')
  const [importResult, setImportResult] = useState(null)

  const downloadTemplate = useDownloadImportTemplate()
  const confirmImport    = useImportConfirm()

  const handlePreview = (data, name) => {
    setPreviewData(data)
    setFileName(name)
    setStep(1)
  }

  const handleConfirm = async (body) => {
    const result = await confirmImport.mutateAsync(body)
    setImportResult(result)
    setStep(2)
  }

  const handleReset = () => {
    setStep(0)
    setPreviewData(null)
    setFileName('')
    setImportResult(null)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="animate-fade-in-down mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors mb-4"
        >
          <ArrowLeft size={15} /> Volver a pacientes
        </button>
        <PageHeader
          title="Importar pacientes"
          subtitle="Cargá tu lista de pacientes desde un archivo CSV o Excel"
        />
      </div>

      <StepBar current={step} />

      {step === 0 && (
        <UploadStep
          onPreview={handlePreview}
          downloadTemplate={downloadTemplate}
        />
      )}

      {step === 1 && previewData && (
        <PreviewStep
          preview={previewData}
          fileName={fileName}
          onConfirm={handleConfirm}
          onBack={() => setStep(0)}
          loading={confirmImport.isPending}
        />
      )}

      {step === 2 && importResult && (
        <ResultStep
          result={importResult}
          onReset={handleReset}
          onFinish={() => navigate('/patients')}
        />
      )}
    </div>
  )
}
