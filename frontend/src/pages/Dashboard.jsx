import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Users, CalendarDays, Receipt, TrendingUp, Activity } from 'lucide-react'
import { Card } from '../components/ui'
import { usePatients, useAppointments, useInvoices, useDashboardStats } from '../hooks'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import clsx from 'clsx'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

// ── Helpers ───────────────────────────────────────
function fmtMonth(yyyymm) {
  if (!yyyymm) return ''
  const [y, m] = yyyymm.split('-')
  return format(new Date(+y, +m - 1, 1), 'MMM yy', { locale: es })
}

function fmtCurrency(v) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)
}

const YELLOW = '#EAB308'
const GRAY   = '#6B7280'
const COLORS  = [YELLOW, GRAY, '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']

const STATUS_LABELS = {
  programada: 'Programada',
  completada: 'Completada',
  cancelada:  'Cancelada',
  no_show:    'No asistió',
}

// ── Custom Tooltip ────────────────────────────────
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/90 dark:bg-gray-900/90 border border-gray-200/60 dark:border-white/10 rounded-lg px-3 py-2 shadow-xl text-xs backdrop-blur-md">
      <p className="font-semibold text-gray-700 dark:text-white/80 mb-1">{fmtMonth(label) || label}</p>
      <p className="text-yellow-600 dark:text-yellow-400 font-bold">{fmtCurrency(payload[0].value)}</p>
    </div>
  )
}

function CountTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/90 dark:bg-gray-900/90 border border-gray-200/60 dark:border-white/10 rounded-lg px-3 py-2 shadow-xl text-xs backdrop-blur-md">
      <p className="font-semibold text-gray-700 dark:text-white/80 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <Card className="p-5 flex items-center gap-4 hover-lift stagger-item">
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0', accent)}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-gray-600 dark:text-white/70">{label}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-white">{value ?? '—'}</p>
      </div>
    </Card>
  )
}

// ── Chart Section wrapper ─────────────────────────
function ChartCard({ title, subtitle, children, className }) {
  return (
    <Card className={clsx('p-5', className)}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </Card>
  )
}

// ── Empty state ───────────────────────────────────
function EmptyChart({ msg = 'Sin datos aún' }) {
  return (
    <div className="h-44 flex items-center justify-center">
      <p className="text-sm text-gray-500 dark:text-white/40">{msg}</p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────
export default function Dashboard() {
  const { user } = useUser()
  const { data: patients }     = usePatients()
  const { data: appointments } = useAppointments({ status: 'programada' })
  const { data: invoices }     = useInvoices({ status: 'pendiente' })
  const { data: stats, isLoading: statsLoading } = useDashboardStats()

  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  const todayAppts = appointments?.filter(a =>
    format(new Date(a.appointment_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  )

  const monthlyRevenue    = stats?.monthly_revenue       ?? []
  const weeklyAppts       = stats?.weekly_appointments   ?? []
  const newPatients       = stats?.new_patients          ?? []
  const apptByStatus      = stats?.appointments_by_status ?? []

  const totalRevThisMonth = monthlyRevenue.at(-1)?.total ?? 0
  const totalRevLastMonth = monthlyRevenue.at(-2)?.total
  const revenueGrowth = totalRevLastMonth
    ? (((totalRevThisMonth - totalRevLastMonth) / totalRevLastMonth) * 100).toFixed(1)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-down">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Bienvenido, {user?.firstName}
        </h1>
        <p className="text-gray-600 dark:text-white/70 mt-1 capitalize">{today}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Pacientes activos"    value={patients?.length}         accent="bg-yellow-500 text-black" />
        <StatCard icon={CalendarDays} label="Citas hoy"            value={todayAppts?.length}       accent="bg-gray-500 text-white" />
        <StatCard icon={CalendarDays} label="Citas pendientes"     value={appointments?.length}     accent="bg-yellow-600 text-black" />
        <StatCard icon={Receipt}      label="Facturas pendientes"   value={invoices?.length}         accent="bg-gray-600 text-white" />
      </div>

      {/* Charts row 1: Revenue + Weekly appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue */}
        <ChartCard
          title="Ingresos mensuales"
          subtitle={revenueGrowth !== null
            ? `${revenueGrowth >= 0 ? '▲' : '▼'} ${Math.abs(revenueGrowth)}% vs mes anterior`
            : 'Últimos 6 meses'}
        >
          {monthlyRevenue.length === 0 && !statsLoading
            ? <EmptyChart msg="Sin ingresos registrados" />
            : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthlyRevenue} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={YELLOW} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={YELLOW} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }} axisLine={false} tickLine={false} width={42} />
                  <Tooltip content={<RevenueTooltip />} cursor={{ stroke: YELLOW, strokeWidth: 1, strokeDasharray: '4 2' }} />
                  <Area type="monotone" dataKey="total" stroke={YELLOW} strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 3, fill: YELLOW, strokeWidth: 0 }} activeDot={{ r: 5, fill: YELLOW }} />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </ChartCard>

        {/* Weekly Appointments */}
        <ChartCard title="Citas esta semana" subtitle="Distribución por día">
          {weeklyAppts.every(d => d.citas === 0) && !statsLoading
            ? <EmptyChart msg="Sin citas esta semana" />
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyAppts} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<CountTooltip />} cursor={{ fill: 'currentColor', fillOpacity: 0.04 }} />
                  <Bar dataKey="citas" name="Citas" fill={YELLOW} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </ChartCard>
      </div>

      {/* Charts row 2: New patients + Appt status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* New Patients per month */}
        <ChartCard title="Nuevos pacientes" subtitle="Últimos 6 meses">
          {newPatients.length === 0 && !statsLoading
            ? <EmptyChart msg="Sin datos de pacientes" />
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={newPatients} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<CountTooltip />} cursor={{ fill: 'currentColor', fillOpacity: 0.04 }} />
                  <Bar dataKey="count" name="Pacientes" fill={GRAY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </ChartCard>

        {/* Appointments by status this month */}
        <ChartCard title="Citas por estado" subtitle="Mes actual">
          {apptByStatus.length === 0 && !statsLoading
            ? <EmptyChart msg="Sin citas este mes" />
            : (
              <div className="flex items-center gap-4 h-44">
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie
                      data={apptByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={70}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {apptByStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, name) => [v, STATUS_LABELS[name] ?? name]}
                      contentStyle={{
                        background: 'rgba(17,17,17,0.85)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {apptByStatus.map((item, i) => (
                    <div key={item.status} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-gray-600 dark:text-white/70 truncate">
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-gray-800 dark:text-white flex-shrink-0">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </ChartCard>
      </div>

      {/* Today's appointments list */}
      <Card className="p-6 animate-fade-in-up">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Citas de hoy</h2>
        {!todayAppts?.length ? (
          <p className="text-sm text-gray-500 dark:text-white/50 text-center py-8">No hay citas programadas para hoy</p>
        ) : (
          <div className="space-y-1">
            {todayAppts.map((appt, idx) => (
              <div
                key={appt.id}
                className="flex items-center justify-between py-3 border-b border-gray-200/50 dark:border-white/10 last:border-0 stagger-item"
                style={{ opacity: 0, animation: `fadeInUp 0.5s ease-out forwards`, animationDelay: `${idx * 0.08}s` }}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{appt.patient_id}</p>
                  <p className="text-xs text-gray-500 dark:text-white/50">{appt.reason || 'Sin motivo especificado'}</p>
                </div>
                <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                  {format(new Date(appt.appointment_date), 'HH:mm')}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

