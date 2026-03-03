import { useState, useMemo } from 'react'
import { Plus, Receipt, Search, Printer, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { useInvoices, useCreateInvoice, useRegisterPayment, usePatients } from '../../hooks'
import { Button, PageHeader, Card, Modal, Input, Select, Badge, Spinner, EmptyState } from '../../components/ui'
import { printInvoice } from '../../lib/print-invoice'

const IVA_RATE = 0.13

const emptyItem = () => ({ description: '', quantity: '1', unit_price: '' })

function InvoiceForm({ onSubmit, loading }) {
  const { data: patients } = usePatients()
  const [patientId, setPatientId] = useState('')
  const [items, setItems] = useState([emptyItem()])

  const setItem = (idx, field, value) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))

  const addItem = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const subtotal = useMemo(() =>
    items.reduce((sum, it) => sum + (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity) || 1), 0),
    [items]
  )
  const tax = subtotal * IVA_RATE
  const total = subtotal + tax

  const canSubmit = patientId && items.some(it => it.description && it.unit_price)

  const handleSubmit = () => {
    const apiPayload = {
      patient_id: patientId,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      notes: JSON.stringify(items),
    }
    onSubmit(apiPayload, items)
  }

  return (
    <div className="space-y-4">
      <Select label="Paciente *" value={patientId} onChange={e => setPatientId(e.target.value)}>
        <option value="">Seleccionar paciente...</option>
        {patients?.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </Select>

      {/* Tabla de servicios */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Servicios *</label>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-16">Cant.</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">P. Unit. (₡)</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-24">Subtotal</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it, idx) => {
                const lineTotal = (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity) || 1)
                return (
                  <tr key={idx}>
                    <td className="px-2 py-1.5">
                      <input
                        className="w-full px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Ej: Consulta general"
                        value={it.description}
                        onChange={e => setItem(idx, 'description', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                        type="number" min="1" step="1"
                        value={it.quantity}
                        onChange={e => setItem(idx, 'quantity', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        type="number" min="0" step="0.01"
                        placeholder="0.00"
                        value={it.unit_price}
                        onChange={e => setItem(idx, 'unit_price', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-600 font-medium">
                      ₡{lineTotal.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button
          onClick={addItem}
          className="mt-2 flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <Plus size={14} /> Agregar servicio
        </button>
      </div>

      {/* Resumen de totales */}
      <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1.5">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>₡{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>IVA (13%)</span>
          <span>₡{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-primary-700 border-t border-gray-200 pt-1.5 mt-1">
          <span>Total</span>
          <span>₡{total.toFixed(2)}</span>
        </div>
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
      <div className="bg-primary-50 rounded-lg p-4">
        <p className="text-sm text-gray-500">Factura {invoice.invoice_number}</p>
        <p className="text-2xl font-bold text-primary-700">₡{invoice.total}</p>
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
    } catch {
      items = [{ description: inv.notes || 'Servicio médico', quantity: '1', unit_price: inv.subtotal }]
    }
    const patientName = patientMap[inv.patient_id]?.full_name || '—'
    printInvoice({ invoice: inv, clinic, patientName, items })
  }

  return (
    <div>
      <PageHeader
        title="Facturación"
        subtitle={`${filtered.length} facturas`}
        action={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nueva factura</Button>}
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por paciente, # factura..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['', 'pendiente', 'pagada', 'anulada'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
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
            <thead className="bg-gray-50 border-b">
              <tr>{['#', 'Fecha', 'Paciente', 'Total', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(inv.issued_at), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">
                    {patientMap[inv.patient_id]?.full_name || <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₡{inv.total}</td>
                  <td className="px-4 py-3"><Badge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePrint(inv)}
                        className="text-gray-400 hover:text-primary-600 transition-colors"
                        title="Imprimir factura"
                      >
                        <Printer size={16} />
                      </button>
                      {inv.status === 'pendiente' && (
                        <Button size="sm" onClick={() => setPaying(inv)}>Registrar pago</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva Factura">
        <InvoiceForm
          onSubmit={handleCreateInvoice}
          loading={createInvoice.isPending}
        />
      </Modal>

      <Modal open={!!paying} onClose={() => setPaying(null)} title="Registrar Pago">
        {paying && (
          <PaymentForm
            invoice={paying}
            onSubmit={async data => { await registerPayment.mutateAsync({ invoiceId: paying.id, ...data }); setPaying(null) }}
            loading={registerPayment.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
