import { useState } from 'react'
import { Download, TrendingUp, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { PageHeader, Card, Spinner, Button } from '../../components/ui'
import { useFinancialReport, useDownloadInvoicesCSV, useDownloadPaymentsCSV } from '../../hooks'

const fmt = (n) => `₡${Number(n ?? 0).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  anulada: 'Anulada',
}

const STATUS_COLORS = {
  pendiente: 'bg-amber-100 text-amber-800 border border-amber-300',
  pagada: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  anulada: 'bg-red-100 text-red-800 border border-red-300',
}

function SummaryCard({ icon: Icon, label, value, iconBg, sub }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${iconBg}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-600 dark:text-white/70">{label}</p>
        <p className="text-xl font-bold text-gray-800 dark:text-white truncate">{value}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">{sub}</p>}
      </div>
    </Card>
  )
}

function RevenueChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-white/50 text-center py-8">Sin datos de ingresos aún.</p>
  }

  const max = Math.max(...data.map((d) => d.total), 1)

  return (
    <div className="space-y-2 mt-4">
      {data.map((row) => (
        <div key={row.month} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-white/60 w-16 shrink-0">{row.month}</span>
          <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${Math.max((row.total / max) * 100, 2)}%` }}
            >
              {row.total / max > 0.25 && (
                <span className="text-[10px] font-bold text-black">{fmt(row.total)}</span>
              )}
            </div>
          </div>
          {row.total / max <= 0.25 && (
            <span className="text-xs text-gray-600 dark:text-white/70 w-28 text-right">{fmt(row.total)}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data, isLoading, error, refetch } = useFinancialReport({ dateFrom, dateTo })
  const downloadInvoices = useDownloadInvoicesCSV()
  const downloadPayments = useDownloadPaymentsCSV()

  const inputCls =
    'px-3 py-2 text-sm rounded-lg border border-gray-300/50 dark:border-white/20 bg-white/80 dark:bg-white/[0.06] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/60 [color-scheme:light] dark:[color-scheme:dark]'

  return (
    <div>
      <PageHeader
        title="Reportes Financieros"
        subtitle="Resumen de facturación, cobros y exportación de datos."
      />

      {/* Filtros de fecha */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-white/70">Desde</label>
            <input type="date" className={inputCls} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-white/70">Hasta</label>
            <input type="date" className={inputCls} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button onClick={() => refetch()} variant="secondary" size="md">
            Actualizar
          </Button>
          <div className="ml-auto flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadInvoices({ dateFrom, dateTo })}
            >
              <Download size={14} /> Facturas CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadPayments({ dateFrom, dateTo })}
            >
              <Download size={14} /> Pagos CSV
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-400">
          Error al cargar los reportes: {error.message}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <SummaryCard
              icon={DollarSign}
              label="Total Facturado"
              value={fmt(data?.total_billed)}
              iconBg="bg-yellow-500 text-black"
            />
            <SummaryCard
              icon={CheckCircle}
              label="Total Cobrado"
              value={fmt(data?.total_collected)}
              iconBg="bg-emerald-500 text-white"
            />
            <SummaryCard
              icon={Clock}
              label="Por Cobrar"
              value={fmt(data?.total_pending)}
              iconBg="bg-amber-500 text-white"
              sub="Facturas pendientes y vencidas"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Ingresos mensuales */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={17} className="text-gray-500 dark:text-white/60" />
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">Ingresos por Mes</h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-white/50 mb-2">Basado en pagos registrados</p>
              <RevenueChart data={data?.monthly_revenue} />
            </Card>

            {/* Estado de facturas */}
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">Facturas por Estado</h2>
              {!data?.by_status?.length ? (
                <p className="text-sm text-gray-500 dark:text-white/50 text-center py-8">Sin facturas en el período.</p>
              ) : (
                <div className="space-y-3">
                  {data.by_status.map((row) => (
                    <div key={row.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-white/70">{row.count} factura{row.count !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-white">{fmt(row.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Top Pacientes */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">Top Pacientes por Facturación</h2>
            {!data?.top_patients?.length ? (
              <p className="text-sm text-gray-500 dark:text-white/50 text-center py-6">Sin datos en el período seleccionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10">
                      <th className="pb-2 text-left text-xs font-semibold text-gray-500 dark:text-white/60 uppercase">Paciente</th>
                      <th className="pb-2 text-center text-xs font-semibold text-gray-500 dark:text-white/60 uppercase">Facturas</th>
                      <th className="pb-2 text-right text-xs font-semibold text-gray-500 dark:text-white/60 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {data.top_patients.map((p, i) => (
                      <tr key={i}>
                        <td className="py-2.5 font-medium text-gray-800 dark:text-white">{p.name}</td>
                        <td className="py-2.5 text-center text-gray-600 dark:text-white/70">{p.invoice_count}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-800 dark:text-white">{fmt(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
