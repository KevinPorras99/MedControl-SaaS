import { useState } from 'react'
import { format } from 'date-fns'
import {
  BarChart3, TrendingUp, Users, Calendar, Stethoscope,
  Download, DollarSign, Activity, ArrowUpRight
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { PageHeader, Card, Button, Input, Select, Spinner, EmptyState } from '../../components/ui'
import {
  useFinancialReport, useDownloadInvoicesCSV, useDownloadPaymentsCSV,
  useAppointmentsReport, usePatientsReport, useDoctorsReport
} from '../../hooks'

const TABS = [
  { id: 'financial', label: 'Financiero',  icon: DollarSign },
  { id: 'appts',     label: 'Citas',       icon: Calendar },
  { id: 'patients',  label: 'Pacientes',   icon: Users },
  { id: 'doctors',   label: 'Médicos',     icon: Stethoscope },
]

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4']

const PIE_COLORS = {
  pendiente: '#f59e0b',
  pagada: '#10b981',
  anulada: '#ef4444',
  programada: '#3b82f6',
  confirmada: '#10b981',
  cancelada: '#ef4444',
  atendida: '#9ca3af',
  masculino: '#3b82f6',
  femenino: '#ec4899',
  otro: '#8b5cf6',
  'no especificado': '#9ca3af',
}

function DateRangeFilter({ dateFrom, dateTo, onFrom, onTo }) {
  return (
    <div className="flex flex-wrap gap-3 items-end mb-5">
      <div className="min-w-[140px]">
        <Input label="Desde" type="date" value={dateFrom} onChange={e => onFrom(e.target.value)} />
      </div>
      <div className="min-w-[140px]">
        <Input label="Hasta" type="date" value={dateTo} onChange={e => onTo(e.target.value)} />
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color = 'yellow', sub }) {
  const colors = {
    yellow: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-500/20',
    green:  'text-green-500 bg-green-100 dark:bg-green-500/20',
    blue:   'text-blue-500 bg-blue-100 dark:bg-blue-500/20',
    red:    'text-red-500 bg-red-100 dark:bg-red-500/20',
  }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  )
}

const PERIODS = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'anual',   label: 'Anual' },
]

const PERIOD_LABEL = { semanal: 'Ingresos semanales', mensual: 'Ingresos mensuales', anual: 'Ingresos anuales' }

// ── Financial Tab ─────────────────────────────────
function FinancialTab() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [period, setPeriod] = useState('mensual')
  const { data: report, isLoading } = useFinancialReport({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, period })
  const downloadInvoicesCSV = useDownloadInvoicesCSV()
  const downloadPaymentsCSV = useDownloadPaymentsCSV()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => downloadInvoicesCSV.mutate({ dateFrom, dateTo })}>
            <Download size={13} /> Facturas CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadPaymentsCSV.mutate({ dateFrom, dateTo })}>
            <Download size={13} /> Pagos CSV
          </Button>
        </div>
      </div>

      {isLoading ? <Spinner /> : report ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total facturado" value={`$${report.total_billed?.toFixed(2) ?? '0.00'}`} icon={DollarSign} color="yellow" />
            <StatCard label="Total cobrado" value={`$${report.total_collected?.toFixed(2) ?? '0.00'}`} icon={TrendingUp} color="green" />
            <StatCard label="Pendiente de cobro" value={`$${report.total_pending?.toFixed(2) ?? '0.00'}`} icon={Activity} color="red" />
          </div>

          {/* Revenue chart */}
          {report.monthly_revenue?.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{PERIOD_LABEL[period]}</h3>
                <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.06] rounded-lg p-0.5">
                  {PERIODS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPeriod(p.value)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        period === p.value
                          ? 'bg-yellow-500 text-black shadow-sm'
                          : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={report.monthly_revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Ingresos" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* By status */}
            {report.by_status?.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Facturas por estado</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={report.by_status} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={75} label={({ status, count }) => `${status} (${count})`} labelLine={false}>
                      {report.by_status.map((entry) => (
                        <Cell key={entry.status} fill={PIE_COLORS[entry.status] || '#9ca3af'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Top patients */}
            {report.top_patients?.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Top pacientes por facturación</h3>
                <div className="space-y-2">
                  {report.top_patients.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-200/20 dark:border-white/[0.06] last:border-0">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <p className="text-sm text-gray-800 dark:text-white">{p.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-800 dark:text-white">${Number(p.total).toFixed(2)}</p>
                        <p className="text-xs text-gray-400 dark:text-white/30">{p.invoice_count} factura(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

// ── Appointments Tab ──────────────────────────────
function AppointmentsTab() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { data: report, isLoading } = useAppointmentsReport({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })

  return (
    <div className="space-y-5">
      <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onFrom={setDateFrom} onTo={setDateTo} />

      {isLoading ? <Spinner /> : report ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Total de citas" value={report.total ?? 0} icon={Calendar} color="blue" />
            <StatCard
              label="Tasa de asistencia"
              value={report.total > 0 ? `${Math.round(((report.by_status?.find(s => s.status === 'atendida')?.count ?? 0) / report.total) * 100)}%` : '—'}
              icon={Activity}
              color="green"
            />
          </div>

          {/* Monthly trend */}
          {report.monthly?.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Citas por mes</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={report.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="Citas" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* By status */}
            {report.by_status?.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Por estado</h3>
                <div className="space-y-2">
                  {report.by_status.map(s => (
                    <div key={s.status} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[s.status] || '#9ca3af' }} />
                        <span className="text-sm capitalize text-gray-700 dark:text-white/80">{s.status}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-800 dark:text-white">{s.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* By doctor */}
            {report.by_doctor?.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Por médico</h3>
                <div className="space-y-2">
                  {report.by_doctor.map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-200/20 dark:border-white/[0.06] last:border-0">
                      <p className="text-sm text-gray-700 dark:text-white/80">{d.doctor}</p>
                      <span className="text-sm font-bold text-gray-800 dark:text-white">{d.count} cita(s)</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

// ── Patients Tab ──────────────────────────────────
function PatientsTab() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { data: report, isLoading } = usePatientsReport({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })

  return (
    <div className="space-y-5">
      <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onFrom={setDateFrom} onTo={setDateTo} />

      {isLoading ? <Spinner /> : report ? (
        <>
          <StatCard label="Total de pacientes" value={report.total ?? 0} icon={Users} color="blue" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Monthly growth */}
            {report.monthly?.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Crecimiento mensual</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={report.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Pacientes nuevos" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* By gender */}
            {report.by_gender?.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Por género</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={report.by_gender} dataKey="count" nameKey="gender" cx="50%" cy="50%" outerRadius={75} label={({ gender, count }) => `${gender} (${count})`}>
                      {report.by_gender.map((entry) => (
                        <Cell key={entry.gender} fill={PIE_COLORS[entry.gender] || '#9ca3af'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {report.by_gender.map(g => (
                    <div key={g.gender} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[g.gender] || '#9ca3af' }} />
                      <span className="text-xs capitalize text-gray-600 dark:text-white/60">{g.gender}: {g.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

// ── Doctors Tab ───────────────────────────────────
function DoctorsTab() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { data: report, isLoading } = useDoctorsReport({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })

  return (
    <div className="space-y-5">
      <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onFrom={setDateFrom} onTo={setDateTo} />

      {isLoading ? <Spinner /> : !report?.doctors?.length ? (
        <Card className="p-8">
          <EmptyState icon={Stethoscope} title="Sin datos de médicos" description="No hay médicos registrados en el sistema o no hay citas en el período seleccionado" />
        </Card>
      ) : (
        <>
          {/* Chart */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Citas por médico</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={report.doctors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis dataKey="doctor_name" type="category" tick={{ fontSize: 11, fill: '#9ca3af' }} width={120} />
                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="total_appointments" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Total citas" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200/30 dark:border-white/10">
                  <tr>
                    {['Médico', 'Total citas', 'Pacientes únicos'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/20 dark:divide-white/[0.05]">
                  {report.doctors.map(d => (
                    <tr key={d.doctor_id} className="hover:bg-yellow-50/30 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-yellow-700 dark:text-yellow-400">
                            {d.doctor_name[0]?.toUpperCase()}
                          </div>
                          <p className="font-medium text-gray-800 dark:text-white">{d.doctor_name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 dark:text-white/70">{d.total_appointments}</td>
                      <td className="px-5 py-3.5 text-gray-700 dark:text-white/70">{d.unique_patients}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Main Reports Page ─────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState('financial')

  return (
    <div>
      <div className="animate-fade-in-down">
        <PageHeader title="Reportes" subtitle="Análisis financiero, citas, pacientes y médicos" />
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 bg-white/[0.05] dark:bg-black/20 rounded-xl p-1 border border-gray-300/30 dark:border-white/[0.06] backdrop-blur-md animate-fade-in max-w-fit" style={{ animationDelay: '0.05s' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === id
                ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/30'
                : 'text-gray-600 dark:text-white/60 hover:text-gray-800 dark:hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {tab === 'financial' && <FinancialTab />}
        {tab === 'appts'     && <AppointmentsTab />}
        {tab === 'patients'  && <PatientsTab />}
        {tab === 'doctors'   && <DoctorsTab />}
      </div>
    </div>
  )
}
