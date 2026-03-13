import { useState, useMemo } from 'react'
import { Plus, Receipt, Search, Printer, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { useInvoices, useCreateInvoice, useRegisterPayment, usePatients } from '../../hooks'
import { Button, PageHeader, Card, Modal, Input, Select, Badge, Spinner, EmptyState } from '../../components/ui'
import { printInvoice } from '../../lib/print-invoice'

// IVA_RATE se maneja en el backend (/api/config y routers/invoices.py)
// Aquí solo se usa para preview visual en el formulario — el backend recalcula y es la fuente de verdad
const IVA_RATE_DISPLAY = 0.13
const emptyItem = () => ({ description: '', quantity: '1', unit_price: '' })

function InvoiceForm({ onSubmit, loading }) {
  const { data: patients } = usePatients()
  const [patientId, setPatientId] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const setItem = (idx, field, value) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  const addItem = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))
  // Preview local — solo para mostrar al usuario antes de confirmar
  // Los montos definitivos los calcula el backend (IVA_RATE en routers/invoices.py)
  const subtotalPreview = useMemo(() =>
    items.reduce((sum, it) => sum + (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity) || 1), 0), [items])
  const taxPreview = subtotalPreview * IVA_RATE_DISPLAY
  const totalPreview = subtotalPreview + taxPreview
  const canSubmit = patientId && items.some(it => it.description && it.unit_price)
  const handleSubmit = () => {
    // Solo enviamos patient_id e items — el backend calcula subtotal, tax y total
    const apiPayload = { patient_id: patientId, items }
    onSubmit(apiPayload, items)
  }
  const inputCls = 'w-full px-2 py-1 rounded border border-silver-300 bg-white text-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400 [color-scheme:light]'

  return (
    <div className="space-y-4">
      <Select label="Paciente *" value={patientId} onChange={e => setPatientId(e.target.value)}>
        <option value="">Seleccionar paciente...</option>
        {patients?.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </Select>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">Servicios *</label>
        <div className="border border-silver-300 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gold-50 border-b border-gold-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-white/70 uppercase">Descripción</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-white/70 uppercase w-16">Cant.</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-white/70 uppercase w-28">P. Unit. (₡)</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-white/70 uppercase w-24">Subtotal</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-silver-100">
              {items.map((it, idx) => {
                const lineTotal = (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity) || 1)
                return (
                  <tr key={idx}>
                    <td className="px-2 py-1.5"><input className={inputCls} placeholder="Ej: Consulta general" value={it.description} onChange={e => setItem(idx, 'description', e.target.value)} /></td>
                    <td className="px-2 py-1.5"><input className={inputCls + ' text-center'} type="number" min="1" step="1" value={it.quantity} onChange={e => setItem(idx, 'quantity', e.target.value)} /></td>
                    <td className="px-2 py-1.5"><input className={inputCls + ' text-right'} type="number" min="0" step="0.01" placeholder="0.00" value={it.unit_price} onChange={e => setItem(idx, 'unit_price', e.target.value)} /></td>
                    <td className="px-3 py-1.5 text-right text-gray-700 dark:text-white font-medium">₡{lineTotal.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-center">
                      {items.length > 1 && <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button onClick={addItem} className="mt-2 flex items-center gap-1.5 text-sm text-gold-600 hover:text-gold-700 font-medium transition-colors">
          <Plus size={14} /> Agregar servicio
        </button>
      </div>

      <div className="bg-gold-50 border border-gold-200 rounded-lg px-4 py-3 space-y-1.5">
        <div className="flex justify-between text-sm text-gray-600 dark:text-white/70"><span>Subtotal</span><span>₡{subtotalPreview.toFixed(2)}</span></div>
        <div className="flex justify-between text-sm text-gray-600 dark:text-white/70"><span>IVA (13%)</span><span>₡{taxPreview.toFixed(2)}</span></div>
        <div className="flex justify-between text-base font-bold text-gold-700 border-t border-gold-200 pt-1.5 mt-1"><span>Total estimado</span><span>₡{totalPreview.toFixed(2)}</span></div>
        <p className="text-[10px] text-gray-400 text-right">El backend recalcula los montos al confirmar</p>
      </div>

      <Button className="w-full justify-center" onClick={handleSubmit} disabled={loading || !canSubmit}>
        {loading ? 'Creando...' : 'Emitir factura'}
      </Button>
    </div>
  )
}

function PaymentForm({ invoice, onSubmit, loading }) {
  const [form, setForm] = useState({ invoice_id: invoice.id, amount: invoice.total, payment_method: 'efectivo', reference: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <div className="bg-gold-100 border border-gold-300 rounded-lg p-4">
        <p className="text-sm text-gray-600">Factura {invoice.invoice_number}</p>
        <p className="text-2xl font-bold text-gold-700">₡{invoice.total}</p>
      </div>
      <Input label="Monto *" type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} />
      <Select label="Método de pago" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
        <option value="efectivo">Efectivo</option>
        <option value="tarjeta">Tarjeta</option>
        <option value="transferencia">Transferencia</option>
      </Select>
      <Input label="Referencia" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="# transacción, recibo..." />
      <Button className="w-full justify-center" onClick={() => onSubmit(form)} disabled={loading || !form.amount}>
        {loading ? 'Registrando...' : 'Registrar pago'}
      </Button>
    </div>
  )
}

export default function InvoicesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [paying, setPaying] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()
  const me = qc.getQueryData(['me'])
  const clinic = me?.clinic || null
  const { data: invoices, isLoading } = useInvoices({ status: statusFilter || undefined })
  const { data: patients } = usePatients()
  const createInvoice = useCreateInvoice()
  const registerPayment = useRegisterPayment()
  const patientMap = useMemo(() => {
    const map = {}
    patients?.forEach(p => { map[p.id] = p })
    return map
  }, [patients])
  const filtered = useMemo(() => {
    if (!invoices) return []
    if (!search.trim()) return invoices
    const q = search.toLowerCase()
    return invoices.filter(inv =>
      patientMap[inv.patient_id]?.full_name?.toLowerCase().includes(q) ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.notes?.toLowerCase().includes(q)
    )
  }, [invoices, search, patientMap])
  const handleCreateInvoice = async (apiData, items) => {
    const invoice = await createInvoice.mutateAsync(apiData)
    setShowCreate(false)
    const patientName = patientMap[apiData.patient_id]?.full_name || '—'
    printInvoice({ invoice, clinic, patientName, items })
  }
  const handlePrint = (inv) => {
    let items = []
    try {
      const parsed = JSON.parse(inv.notes)
      if (Array.isArray(parsed)) items = parsed
    } catch { items = [{ description: inv.notes || 'Servicio médico', quantity: '1', unit_price: inv.subtotal }] }
    const patientName = patientMap[inv.patient_id]?.full_name || '—'
    printInvoice({ invoice: inv, clinic, patientName, items })
  }

  return (
    <div>
      <div className="animate-fade-in-down">
        <PageHeader title="Facturación" subtitle={`${filtered.length} facturas`}
          action={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nueva factura</Button>} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/50" />
          <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300/50 dark:border-white/20 bg-white/[0.08] dark:bg-white/[0.05] backdrop-blur-md dark:backdrop-blur-md text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400/60 dark:focus:ring-gold-400/40"
            placeholder="Buscar por paciente, # factura..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['', 'pendiente', 'pagada', 'anulada'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === s ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-lg shadow-gold-300/30' : 'bg-white/[0.08] dark:bg-white/[0.05] border border-gray-300/50 dark:border-white/20 text-gray-600 dark:text-white/80 hover:bg-white/[0.12] dark:hover:bg-white/[0.08] hover:text-gold-700 dark:hover:text-gold-400 backdrop-blur-md dark:backdrop-blur-md'}`}>
              {s || 'Todas'}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {isLoading ? <Spinner /> : !filtered.length ? (
          <EmptyState icon={Receipt} title="Sin facturas" description={search ? 'No hay resultados para tu búsqueda' : 'Emití la primera factura'} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gold-50 border-b border-gold-200">
              <tr>{['#', 'Fecha', 'Paciente', 'Total', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-white/70 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-silver-100">
              {filtered.map((inv, i) => (
                <tr key={inv.id} className="hover:bg-gold-50/50 transition-colors animate-fade-in stagger-item" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-white/60">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-white/70">{format(new Date(inv.issued_at), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-white font-medium">{patientMap[inv.patient_id]?.full_name || <span className="text-gray-400 dark:text-white/50 italic">—</span>}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">₡{inv.total}</td>
                  <td className="px-4 py-3"><Badge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handlePrint(inv)} className="text-gray-400 hover:text-gold-600 transition-colors" title="Imprimir factura"><Printer size={16} /></button>
                      {inv.status === 'pendiente' && <Button size="sm" onClick={() => setPaying(inv)}>Registrar pago</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva Factura">
        <InvoiceForm onSubmit={handleCreateInvoice} loading={createInvoice.isPending} />
      </Modal>
      <Modal open={!!paying} onClose={() => setPaying(null)} title="Registrar Pago">
        {paying && <PaymentForm invoice={paying} onSubmit={async data => { await registerPayment.mutateAsync({ invoiceId: paying.id, ...data }); setPaying(null) }} loading={registerPayment.isPending} />}
      </Modal>
    </div>
  )
}
