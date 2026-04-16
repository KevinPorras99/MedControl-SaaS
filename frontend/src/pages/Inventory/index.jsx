import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, Plus, Search, TrendingDown, AlertTriangle,
  XCircle, ArrowDownCircle, ArrowUpCircle,
  RefreshCw, Pencil, Trash2, History, X, DollarSign, ScanLine, Camera, CameraOff, Upload,
} from 'lucide-react'
import {
  useInventory, useInventorySummary, useCreateInventoryItem,
  useUpdateInventoryItem, useDeleteInventoryItem,
  useAddInventoryMovement, useInventoryMovements,
} from '../../hooks'

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'medicamentos',       label: 'Medicamentos' },
  { value: 'material_quirurgico', label: 'Material Quirúrgico' },
  { value: 'equipos',            label: 'Equipos' },
  { value: 'insumos_lab',        label: 'Insumos de Laboratorio' },
  { value: 'otros',              label: 'Otros' },
]

const UNITS = ['unidad', 'caja', 'frasco', 'ampolleta', 'rollo', 'par', 'litro', 'gramo']

const CAT_COLORS = {
  medicamentos:        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  material_quirurgico: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  equipos:             'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  insumos_lab:         'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  otros:               'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
}

function catLabel(val) {
  return CATEGORIES.find(c => c.value === val)?.label ?? val
}

function stockBadge(item) {
  if (item.stock === 0) return { label: 'Sin stock', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
  if (item.is_low_stock) return { label: 'Stock bajo', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' }
  return { label: 'Normal', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' }
}

// ── Small shared UI ──────────────────────────────────────────────────────────

function ModalOverlay({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function Card({ className = '', children }) {
  return (
    <div className={`bg-white/80 dark:bg-white/[0.05] backdrop-blur-xl border border-gray-200/60 dark:border-white/[0.08] rounded-2xl shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>}
      <input
        className="w-full px-3 py-2 text-sm rounded-lg bg-white/60 dark:bg-white/[0.06] border border-gray-300/60 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
        {...props}
      />
    </div>
  )
}

function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>}
      <select
        className="w-full px-3 py-2 text-sm rounded-lg bg-white/60 dark:bg-white/[0.06] border border-gray-300/60 dark:border-white/10 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

// ── Barcode Field ────────────────────────────────────────────────────────────

function BarcodeField({ value, onChange }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError]       = useState('')
  const [supported, setSupported] = useState(null)   // null = unknown
  const videoRef    = useRef(null)
  const streamRef   = useRef(null)
  const intervalRef = useRef(null)
  const inputRef    = useRef(null)

  // Detect physical barcode scanner: bursts of chars in < 50ms + Enter
  const scanBufRef   = useRef('')
  const lastKeyRef   = useRef(0)

  const handleKeyDown = useCallback((e) => {
    const now = Date.now()
    if (e.key === 'Enter') {
      if (scanBufRef.current.length > 4 && now - lastKeyRef.current < 80) {
        e.preventDefault()
        onChange({ target: { value: scanBufRef.current } })
      }
      scanBufRef.current = ''
      return
    }
    if (now - lastKeyRef.current > 80) scanBufRef.current = ''
    if (e.key.length === 1) scanBufRef.current += e.key
    lastKeyRef.current = now
  }, [onChange])

  const stopScan = useCallback(() => {
    clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  const startScan = async () => {
    setError('')
    if (!('BarcodeDetector' in window)) {
      setSupported(false)
      setError('Usa Chrome/Edge para escanear con cámara. Con lector físico simplemente escaneá en el campo.')
      inputRef.current?.focus()
      return
    }
    setSupported(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      })
      streamRef.current = stream
      setScanning(true)
      // Delay so videoRef is mounted
      setTimeout(async () => {
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const detector = new window.BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'data_matrix'],
        })
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current) return
          try {
            const results = await detector.detect(videoRef.current)
            if (results.length > 0) {
              onChange({ target: { value: results[0].rawValue } })
              stopScan()
            }
          } catch (_) {}
        }, 400)
      }, 150)
    } catch (err) {
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
      setScanning(false)
    }
  }

  useEffect(() => () => stopScan(), [stopScan])

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        Código de Barras / SKU
      </label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder="Escanea o escribe el código"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-white/60 dark:bg-white/[0.06] border border-gray-300/60 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 font-mono"
          />
        </div>
        <button
          type="button"
          onClick={scanning ? stopScan : startScan}
          title={scanning ? 'Detener cámara' : 'Escanear con cámara'}
          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors shrink-0 ${
            scanning
              ? 'bg-red-100 dark:bg-red-900/30 border-red-300/60 dark:border-red-500/40 text-red-600 dark:text-red-400'
              : 'bg-white/60 dark:bg-white/[0.06] border-gray-300/60 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 hover:border-yellow-400/60 hover:text-yellow-700 dark:hover:text-yellow-400'
          }`}
        >
          {scanning ? <CameraOff size={16} /> : <Camera size={16} />}
        </button>
      </div>

      {/* Camera preview */}
      {scanning && (
        <div className="mt-2 relative rounded-xl overflow-hidden bg-black border border-gray-300/40 dark:border-white/10">
          <video ref={videoRef} className="w-full max-h-48 object-cover" muted playsInline />
          {/* Targeting overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-24 border-2 border-yellow-400 rounded-lg opacity-80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/80">
            Apuntá el código de barras al recuadro
          </p>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">{error}</p>
      )}
    </div>
  )
}

// ── Item Form Modal ──────────────────────────────────────────────────────────

const BLANK = { name: '', category: 'medicamentos', unit: 'unidad', sku: '', stock: 0, min_stock: 5, cost_price: '', supplier: '', notes: '' }

function ItemFormModal({ item, onClose }) {
  const [form, setForm] = useState(item ? {
    name: item.name, category: item.category, unit: item.unit, sku: item.sku ?? '',
    stock: item.stock, min_stock: item.min_stock,
    cost_price: item.cost_price ?? '', supplier: item.supplier ?? '', notes: item.notes ?? '',
  } : BLANK)

  const create = useCreateInventoryItem()
  const update = useUpdateInventoryItem()
  const busy = create.isPending || update.isPending

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      stock: Number(form.stock),
      min_stock: Number(form.min_stock),
      cost_price: form.cost_price !== '' ? Number(form.cost_price) : null,
    }
    if (item) {
      await update.mutateAsync({ id: item.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <ModalOverlay onClose={onClose}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {item ? 'Editar ítem' : 'Nuevo ítem'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre *" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Ej: Paracetamol 500mg" />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoría" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Select label="Unidad" value={form.unit} onChange={e => set('unit', e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
          </div>

          <div className={`grid gap-3 ${!item ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {!item && <Input label="Stock inicial" type="number" min={0} value={form.stock} onChange={e => set('stock', e.target.value)} />}
            <Input label="Stock mínimo" type="number" min={0} value={form.min_stock} onChange={e => set('min_stock', e.target.value)} />
            <Input label="Costo unitario" type="number" min={0} step="0.01" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} placeholder="0.00" />
          </div>

          <BarcodeField value={form.sku} onChange={e => set('sku', e.target.value)} />

          <Input label="Proveedor" value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Opcional" />

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notas</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Observaciones opcionales..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/60 dark:bg-white/[0.06] border border-gray-300/60 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-300/60 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-white/20 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="flex-1 px-4 py-2 text-sm rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold disabled:opacity-50 transition-colors">
              {busy ? 'Guardando...' : item ? 'Guardar cambios' : 'Crear ítem'}
            </button>
          </div>
        </form>
      </Card>
    </ModalOverlay>
  )
}

// ── Movement Modal ───────────────────────────────────────────────────────────

function MovementModal({ item, onClose }) {
  const [type, setType] = useState('entrada')
  const [qty, setQty] = useState(1)
  const [reason, setReason] = useState('')
  const add = useAddInventoryMovement()

  const handleSubmit = async (e) => {
    e.preventDefault()
    await add.mutateAsync({ itemId: item.id, type, quantity: Number(qty), reason })
    onClose()
  }

  return (
    <ModalOverlay onClose={onClose}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Registrar movimiento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
          {' — '}Stock actual: <span className="font-semibold">{item.stock} {item.unit}(s)</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'entrada', label: 'Entrada', icon: ArrowDownCircle, color: 'text-green-600' },
              { v: 'salida',  label: 'Salida',  icon: ArrowUpCircle,   color: 'text-red-500' },
              { v: 'ajuste',  label: 'Ajuste',  icon: RefreshCw,       color: 'text-blue-500' },
            ].map(({ v, label, icon: Icon, color }) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                  type === v
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                    : 'border-gray-200/60 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-white/20'
                }`}
              >
                <Icon size={18} className={type === v ? '' : color} />
                {label}
              </button>
            ))}
          </div>

          <Input
            label="Cantidad"
            type="number"
            min={1}
            value={qty}
            onChange={e => setQty(e.target.value)}
            required
          />

          <Input
            label="Motivo (opcional)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={type === 'entrada' ? 'Ej: Compra a proveedor' : type === 'salida' ? 'Ej: Uso en consulta' : 'Ej: Corrección de inventario'}
          />

          {type === 'salida' && item.stock - Number(qty) < 0 && (
            <p className="text-xs text-red-500 font-medium">
              ⚠ No hay suficiente stock ({item.stock} disponible)
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-300/60 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-white/20 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={add.isPending} className="flex-1 px-4 py-2 text-sm rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold disabled:opacity-50 transition-colors">
              {add.isPending ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </Card>
    </ModalOverlay>
  )
}

// ── History Panel ────────────────────────────────────────────────────────────

function HistoryPanel({ item, onClose }) {
  const { data: movements = [], isLoading } = useInventoryMovements(item?.id)

  const typeConfig = {
    entrada: { label: 'Entrada', cls: 'text-green-600 dark:text-green-400', icon: ArrowDownCircle },
    salida:  { label: 'Salida',  cls: 'text-red-500 dark:text-red-400',   icon: ArrowUpCircle },
    ajuste:  { label: 'Ajuste',  cls: 'text-blue-500 dark:text-blue-400', icon: RefreshCw },
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-end" onClick={onClose}>
      <div className="w-full max-w-md h-full flex flex-col" onClick={e => e.stopPropagation()}>
        <Card className="h-full rounded-none rounded-l-2xl flex flex-col p-0 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-200/60 dark:border-white/[0.08]">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Historial</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item?.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!isLoading && movements.length === 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">Sin movimientos registrados</p>
            )}
            {movements.map(mv => {
              const cfg = typeConfig[mv.type] ?? {}
              const Icon = cfg.icon ?? RefreshCw
              const qty = mv.quantity > 0 ? `+${mv.quantity}` : mv.quantity
              return (
                <div key={mv.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-gray-200/40 dark:border-white/[0.06]">
                  <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.cls}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold ${cfg.cls}`}>{cfg.label} {qty}</span>
                      <span className="text-xs text-gray-400">{new Date(mv.created_at).toLocaleDateString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                    </div>
                    {mv.reason && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{mv.reason}</p>}
                    {mv.user_name && <p className="text-xs text-gray-400 mt-0.5">por {mv.user_name}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ summary }) {
  if (!summary) return null
  const cards = [
    { label: 'Total ítems', value: summary.total_items, icon: Package, color: 'text-blue-500' },
    { label: 'Stock bajo', value: summary.low_stock_count, icon: TrendingDown, color: 'text-amber-500' },
    { label: 'Sin stock', value: summary.critical_count, icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Valor total', value: `$${Number(summary.total_value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-green-500' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="p-4 flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-current/10 ${color}`}>
            <Icon size={20} className={color} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({ item, onEdit, onMove, onHistory, onDelete }) {
  const badge = stockBadge(item)
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/30 dark:hover:bg-white/[0.04] transition-colors group">
      {/* Name + category */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
          {item.sku && <span className="text-xs text-gray-400 font-mono">#{item.sku}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[item.category] ?? CAT_COLORS.otros}`}>
            {catLabel(item.category)}
          </span>
          {item.supplier && <span className="text-[11px] text-gray-400 truncate max-w-[120px]">{item.supplier}</span>}
        </div>
      </div>

      {/* Stock */}
      <div className="text-center min-w-[80px]">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{item.stock}</p>
        <p className="text-[11px] text-gray-400">{item.unit}(s)</p>
      </div>

      {/* Status badge */}
      <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium hidden sm:block ${badge.cls}`}>
        {badge.label}
      </span>

      {/* Cost */}
      {item.cost_price != null && (
        <span className="text-sm text-gray-500 dark:text-gray-400 hidden md:block min-w-[70px] text-right">
          ${Number(item.cost_price).toFixed(2)}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onMove(item)} title="Registrar movimiento"
          className="p-1.5 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-500/20 text-gray-500 hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">
          <RefreshCw size={15} />
        </button>
        <button onClick={() => onHistory(item)} title="Ver historial"
          className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <History size={15} />
        </button>
        <button onClick={() => onEdit(item)} title="Editar"
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <Pencil size={15} />
        </button>
        <button onClick={() => onDelete(item)} title="Eliminar"
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [showLow, setShowLow] = useState(false)
  const [modal, setModal] = useState(null)   // { type: 'form'|'move'|'history'|'confirm', item? }

  const { data: items = [], isLoading } = useInventory({
    search: search || undefined,
    category: catFilter || undefined,
    lowStock: showLow || undefined,
  })
  const { data: summary } = useInventorySummary()
  const deleteItem = useDeleteInventoryItem()

  const lowItems = items.filter(i => i.is_low_stock && i.stock > 0)
  const criticalItems = items.filter(i => i.stock === 0)

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`)) return
    await deleteItem.mutateAsync(item.id)
  }

  // Group by category
  const grouped = items.reduce((acc, item) => {
    const key = item.category
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-500/20 rounded-xl">
            <Package size={22} className="text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventario</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gestión de insumos y medicamentos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/inventory/import')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 dark:bg-white/[0.06] dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-white/10 rounded-xl font-semibold text-sm transition-colors"
          >
            <Upload size={16} /> Importar CSV
          </button>
          <button
            onClick={() => setModal({ type: 'form', item: null })}
            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-yellow-500/20"
          >
            <Plus size={18} /> Nuevo ítem
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards summary={summary} />

      {/* Alert banners */}
      {criticalItems.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-500/30 flex items-center gap-3">
          <XCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">
            <span className="font-semibold">{criticalItems.length} ítem(s) sin stock:</span>{' '}
            {criticalItems.slice(0, 3).map(i => i.name).join(', ')}{criticalItems.length > 3 ? '...' : ''}
          </p>
        </div>
      )}
      {lowItems.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-500/30 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <span className="font-semibold">{lowItems.length} ítem(s) con stock bajo:</span>{' '}
            {lowItems.slice(0, 3).map(i => i.name).join(', ')}{lowItems.length > 3 ? '...' : ''}
          </p>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white/60 dark:bg-white/[0.06] border border-gray-300/60 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
            />
          </div>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg bg-white/60 dark:bg-white/[0.06] border border-gray-300/60 dark:border-white/10 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <button
            onClick={() => setShowLow(v => !v)}
            className={`px-3 py-2 text-sm rounded-lg border font-medium transition-colors ${
              showLow
                ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-400/60 text-amber-700 dark:text-amber-300'
                : 'border-gray-300/60 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-white/20'
            }`}
          >
            <TrendingDown size={15} className="inline mr-1.5" />
            Stock bajo
          </button>
        </div>
      </Card>

      {/* Items list */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <Card className="p-12 text-center">
          <Package size={40} className="mx-auto text-gray-300 dark:text-white/20 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {search || catFilter || showLow ? 'No se encontraron ítems con estos filtros' : 'Aún no hay ítems en el inventario'}
          </p>
          {!search && !catFilter && !showLow && (
            <button onClick={() => setModal({ type: 'form', item: null })} className="mt-4 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-sm font-semibold transition-colors">
              Agregar primer ítem
            </button>
          )}
        </Card>
      )}

      {!isLoading && items.length > 0 && (
        <Card className="overflow-hidden">
          {catFilter ? (
            <div className="divide-y divide-gray-200/40 dark:divide-white/[0.06] px-2 py-2">
              {items.map(item => (
                <ItemRow key={item.id} item={item}
                  onEdit={i => setModal({ type: 'form', item: i })}
                  onMove={i => setModal({ type: 'move', item: i })}
                  onHistory={i => setModal({ type: 'history', item: i })}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            Object.entries(grouped).map(([cat, catItems]) => (
              <div key={cat}>
                <div className="px-4 py-2 bg-gray-50/60 dark:bg-white/[0.02] border-b border-gray-200/40 dark:border-white/[0.06] flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[cat] ?? CAT_COLORS.otros}`}>
                    {catLabel(cat)}
                  </span>
                  <span className="text-xs text-gray-400">{catItems.length} ítem(s)</span>
                </div>
                <div className="divide-y divide-gray-200/30 dark:divide-white/[0.04] px-2 py-1">
                  {catItems.map(item => (
                    <ItemRow key={item.id} item={item}
                      onEdit={i => setModal({ type: 'form', item: i })}
                      onMove={i => setModal({ type: 'move', item: i })}
                      onHistory={i => setModal({ type: 'history', item: i })}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {/* Modals */}
      {modal?.type === 'form' && (
        <ItemFormModal item={modal.item} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'move' && (
        <MovementModal item={modal.item} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'history' && (
        <HistoryPanel item={modal.item} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
