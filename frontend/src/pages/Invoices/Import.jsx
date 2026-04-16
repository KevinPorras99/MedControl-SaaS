import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, Download, CheckCircle2, XCircle,
  ArrowLeft, ArrowRight, Receipt, RotateCcw, FileSpreadsheet,
} from 'lucide-react'
import clsx from 'clsx'
import { Button, PageHeader, Card, Spinner } from '../../components/ui'
import { useApi } from '../../lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

// ── CSV Template ──────────────────────────────────────────────────────────────

const HEADERS = ['paciente_email', 'paciente_nombre', 'descripcion', 'cantidad', 'precio_unitario', 'estado', 'notas']

function downloadTemplate() {
  const rows = [
    HEADERS.join(','),
    'maria.lopez@gmail.com,María López,Consulta general,1,25000,pendiente,Primera visita',
    'carlos.vega@gmail.com,Carlos Vega,Examen de laboratorio,1,18500,pagada,Hemograma completo',
    ',Ana Rodríguez,Radiografía de tórax,1,32000,pendiente,',
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'plantilla_facturas.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── CSV Parser ────────────────────────────────────────────────────────────────

const VALID_STATUSES = ['pendiente', 'pagada', 'anulada']

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
  if (lines.length < 2) return { valid: [], invalid: [] }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''))
  const valid = [], invalid = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((h, idx) => { row[h] = cols[idx] || '' })

    const rowNum = i + 1
    const errors = []

    const email = row.paciente_email?.trim() || ''
    const nombre = row.paciente_nombre?.trim() || ''
    if (!email && !nombre) errors.push('Se requiere paciente_email o paciente_nombre')

    const desc = row.descripcion?.trim() || ''
    if (!desc) errors.push('Descripción requerida')

    const cantidad = parseFloat(row.cantidad || '1')
    const precio = parseFloat(row.precio_unitario || '0')
    if (isNaN(cantidad) || cantidad <= 0) errors.push('Cantidad inválida')
    if (isNaN(precio) || precio < 0) errors.push('Precio inválido')

    if (errors.length) {
      invalid.push({ row: rowNum, errors })
    } else {
      const rawStatus = row.estado?.trim().toLowerCase() || ''
      valid.push({
        paciente_email: email,
        paciente_nombre: nombre,
        descripcion: desc,
        cantidad: Math.max(1, Math.round(cantidad)),
        precio_unitario: precio,
        estado: VALID_STATUSES.includes(rawStatus) ? rawStatus : 'pendiente',
        notas: row.notas?.trim() || '',
        _subtotal: cantidad * precio,
      })
    }
  }
  return { valid, invalid }
}

function formatMoney(n) {
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', minimumFractionDigits: 0 }).format(n)
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['Subir archivo', 'Revisar datos', 'Resultado']

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current, active = i === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                done && 'bg-emerald-500 border-emerald-500 text-white',
                active && 'bg-yellow-500 border-yellow-500 text-white shadow-lg shadow-yellow-500/30',
                !done && !active && 'bg-white/[0.05] border-white/20 text-white/40',
              )}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={clsx('text-[11px] font-medium whitespace-nowrap',
                active ? 'text-yellow-400' : done ? 'text-emerald-400' : 'text-white/30',
              )}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx('flex-1 h-px mx-2 mb-5 transition-all', done ? 'bg-emerald-500' : 'bg-white/10')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Upload ────────────────────────────────────────────────────────────

function UploadStep({ onParsed }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.match(/\.csv$/i)) { toast.error('Solo se aceptan archivos CSV'); return }
    setFile(f)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0])
  }, [])

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    const text = await file.text()
    const parsed = parseCSV(text)
    onParsed(parsed, file.name)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={20} className="text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Paso previo: descargá la plantilla</p>
            <p className="text-xs text-gray-500 dark:text-white/50 mb-1">
              Columnas: <span className="font-mono text-yellow-600 dark:text-yellow-400">{HEADERS.join(', ')}</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-white/30 mb-3">
              El paciente se busca primero por email, luego por nombre. Una fila = una factura.
            </p>
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <Download size={13} /> Descargar plantilla CSV
            </Button>
          </div>
        </div>
      </Card>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
          dragging ? 'border-yellow-400 bg-yellow-400/10 scale-[1.01]'
            : file ? 'border-emerald-400 bg-emerald-400/10'
            : 'border-white/20 bg-white/[0.03] hover:border-yellow-400/60 hover:bg-yellow-400/5',
        )}
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 size={36} className="text-emerald-400" />
            <p className="font-semibold text-emerald-400">{file.name}</p>
            <p className="text-xs text-white/40">{(file.size / 1024).toFixed(1)} KB · Clic para cambiar</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={36} className="text-white/30" />
            <p className="text-sm font-medium text-white/60">Arrastrá tu CSV aquí o hacé clic para seleccionar</p>
            <p className="text-xs text-white/30">Solo CSV · Máx. 5 MB</p>
          </div>
        )}
      </div>

      <Button className="w-full justify-center" onClick={handleSubmit} disabled={!file || loading}>
        {loading ? <><Spinner size="sm" /> Analizando...</> : <><ArrowRight size={15} /> Analizar archivo</>}
      </Button>
    </div>
  )
}

// ── Step 2: Preview ───────────────────────────────────────────────────────────

const STATUS_LABELS = { pendiente: 'Pendiente', pagada: 'Pagada', anulada: 'Anulada' }
const STATUS_COLORS = {
  pendiente: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  pagada: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  anulada: 'bg-red-500/15 text-red-400 border-red-500/30',
}

function PreviewStep({ parsed, fileName, onBack, onConfirm, loading }) {
  const { valid, invalid } = parsed
  const total = valid.reduce((s, r) => s + r._subtotal, 0)

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <p className="text-xs text-white/50 mb-3 font-medium uppercase tracking-wide">Archivo: {fileName}</p>
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold bg-emerald-500/15 border-emerald-500/30 text-emerald-400">
            <span className="text-base font-bold">{valid.length}</span> válidas
          </span>
          {invalid.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold bg-red-500/15 border-red-500/30 text-red-400">
              <span className="text-base font-bold">{invalid.length}</span> con errores
            </span>
          )}
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold bg-blue-500/15 border-blue-500/30 text-blue-400">
            Total: {formatMoney(total)}
          </span>
        </div>
      </Card>

      {invalid.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={16} className="text-red-400" />
            <p className="text-sm font-semibold text-white">{invalid.length} fila(s) con errores (no se importarán)</p>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1.5">
            {invalid.map((r, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20 text-xs">
                <span className="text-red-400 font-medium">Fila {r.row}:</span>{' '}
                <span className="text-white/60">{r.errors.join(' · ')}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {valid.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">
              Facturas a importar (mostrando {Math.min(10, valid.length)} de {valid.length})
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/[0.03]">
                  {['Paciente', 'Descripción', 'Cant.', 'Precio', 'Subtotal', 'Estado'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-white/40 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {valid.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.03]">
                    <td className="px-3 py-2 text-white/90 font-medium max-w-[120px] truncate">
                      {row.paciente_nombre || row.paciente_email}
                    </td>
                    <td className="px-3 py-2 text-white/60 max-w-[140px] truncate">{row.descripcion}</td>
                    <td className="px-3 py-2 text-white/60">{row.cantidad}</td>
                    <td className="px-3 py-2 text-white/60 whitespace-nowrap">{formatMoney(row.precio_unitario)}</td>
                    <td className="px-3 py-2 text-white/80 font-medium whitespace-nowrap">{formatMoney(row._subtotal)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${STATUS_COLORS[row.estado]}`}>
                        {STATUS_LABELS[row.estado]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 justify-center">
          <ArrowLeft size={15} /> Volver
        </Button>
        <Button className="flex-1 justify-center" disabled={valid.length === 0 || loading} onClick={onConfirm}>
          {loading ? <><Spinner size="sm" /> Importando...</> : <><CheckCircle2 size={15} /> Importar {valid.length} factura(s)</>}
        </Button>
      </div>
    </div>
  )
}

// ── Step 3: Result ────────────────────────────────────────────────────────────

function ResultStep({ result, onReset, onFinish }) {
  return (
    <Card className="p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={32} className="text-emerald-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-1">¡Importación completada!</h2>
      <p className="text-white/50 text-sm mb-6">Las facturas ya están disponibles en el sistema</p>
      <div className="flex justify-center gap-6 mb-8">
        <div className="text-center">
          <p className="text-3xl font-bold text-emerald-400">{result.imported}</p>
          <p className="text-xs text-white/40 mt-1">Importadas</p>
        </div>
        {result.skipped > 0 && (
          <div className="text-center">
            <p className="text-3xl font-bold text-red-400">{result.skipped}</p>
            <p className="text-xs text-white/40 mt-1">Omitidas</p>
          </div>
        )}
      </div>
      {result.errors?.length > 0 && (
        <div className="mb-6 text-left max-h-40 overflow-y-auto space-y-1">
          {result.errors.map((e, i) => (
            <div key={i} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
              Fila {e.row}: {e.error}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onReset}><RotateCcw size={14} /> Nueva importación</Button>
        <Button onClick={onFinish}><Receipt size={14} /> Ver facturas</Button>
      </div>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ImportInvoicesPage() {
  const navigate = useNavigate()
  const api = useApi()
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [parsed, setParsed] = useState(null)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState(null)

  const importMutation = useMutation({
    mutationFn: (rows) => {
      const headers = HEADERS.join(',')
      const lines = rows.map(r =>
        [r.paciente_email, r.paciente_nombre, r.descripcion, r.cantidad, r.precio_unitario, r.estado, r.notas]
          .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      const csv = [headers, ...lines].join('\n')
      const formData = new FormData()
      formData.append('file', new Blob([csv], { type: 'text/csv' }), 'import.csv')
      return api.post('/api/invoices/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
    },
    onSuccess: (data) => {
      qc.invalidateQueries(['invoices'])
      setResult(data)
      setStep(2)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al importar'),
  })

  const handleParsed = (data, name) => { setParsed(data); setFileName(name); setStep(1) }
  const handleReset = () => { setStep(0); setParsed(null); setFileName(''); setResult(null) }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="animate-fade-in-down mb-6">
        <button onClick={() => navigate('/invoices')} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors mb-4">
          <ArrowLeft size={15} /> Volver a facturación
        </button>
        <PageHeader title="Importar facturas" subtitle="Cargá facturas históricas desde un archivo CSV" />
      </div>

      <StepBar current={step} />

      {step === 0 && <UploadStep onParsed={handleParsed} />}
      {step === 1 && parsed && (
        <PreviewStep
          parsed={parsed}
          fileName={fileName}
          onBack={() => setStep(0)}
          onConfirm={() => importMutation.mutate(parsed.valid)}
          loading={importMutation.isPending}
        />
      )}
      {step === 2 && result && (
        <ResultStep result={result} onReset={handleReset} onFinish={() => navigate('/invoices')} />
      )}
    </div>
  )
}
