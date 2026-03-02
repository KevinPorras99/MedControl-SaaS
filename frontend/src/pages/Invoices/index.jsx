import { useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { format } from 'date-fns'
import { useInvoices, useCreateInvoice, useRegisterPayment, usePatients } from '../../hooks'
import { Button, PageHeader, Card, Modal, Input, Select, Badge, Spinner, EmptyState } from '../../components/ui'

function InvoiceForm({ onSubmit, loading }) {
  const { data: patients } = usePatients()
  const [form, setForm] = useState({ patient_id: '', subtotal: '', tax: '0', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const total = (+form.subtotal || 0) + (+form.tax || 0)

  return (
    <div className="space-y-4">
      <Select label="Paciente *" value={form.patient_id} onChange={e => set('patient_id', e.target.value)}>
        <option value="">Seleccionar paciente...</option>
        {patients?.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Subtotal *" type="number" min="0" step="0.01" value={form.subtotal} onChange={e => set('subtotal', e.target.value)} />
        <Input label="Impuesto" type="number" min="0" step="0.01" value={form.tax} onChange={e => set('tax', e.target.value)} />
      </div>
      <div className="bg-gray-50 rounded-lg px-4 py-3 text-right">
        <span className="text-sm text-gray-500">Total: </span>
        <span className="text-lg font-bold text-gray-900">${total.toFixed(2)}</span>
      </div>
      <Input label="Notas" value={form.notes} onChange={e => set('notes', e.target.value)} />
      <Button className="w-full justify-center" onClick={() => onSubmit(form)} disabled={loading || !form.patient_id || !form.subtotal}>
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
        <p className="text-2xl font-bold text-primary-700">${invoice.total}</p>
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

  const { data: invoices, isLoading } = useInvoices({ status: statusFilter || undefined })
  const createInvoice = useCreateInvoice()
  const registerPayment = useRegisterPayment()

  return (
    <div>
      <PageHeader
        title="Facturación"
        subtitle={`${invoices?.length || 0} facturas`}
        action={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nueva factura</Button>}
      />

      <div className="flex gap-2 mb-5">
        {['', 'pendiente', 'pagada', 'anulada'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s || 'Todas'}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? <Spinner /> : !invoices?.length ? (
          <EmptyState icon={Receipt} title="Sin facturas" description="Emití la primera factura" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{['#', 'Fecha', 'Paciente', 'Total', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(inv.issued_at), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.patient_id}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">${inv.total}</td>
                  <td className="px-4 py-3"><Badge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    {inv.status === 'pendiente' && (
                      <Button size="sm" onClick={() => setPaying(inv)}>Registrar pago</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva Factura">
        <InvoiceForm
          onSubmit={async data => { await createInvoice.mutateAsync(data); setShowCreate(false) }}
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
