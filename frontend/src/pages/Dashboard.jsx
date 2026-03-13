import { useState, useMemo } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Users, CalendarDays, Receipt, TrendingUp, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { usePatients, useAppointments, useInvoices, useDashboardStats } from '../hooks'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import clsx from 'clsx'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
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

const YELLOW  = '#EAB308'
const YELLOW2 = '#F59E0B'
const TEAL    = '#14B8A6'
const PURPLE  = '#8B5CF6'
const ROSE    = '#F43F5E'
const COLORS  = [YELLOW, TEAL, YELLOW2, PURPLE, ROSE, '#3B82F6']

const STATUS_LABELS = {
  programada: 'Programada',
  completada: 'Completada',
  cancelada:  'Cancelada',
  no_show:    'No asistió',
}

// ── Custom Tooltips ────────────────────────────────
function GlassTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-black/70 border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl backdrop-blur-xl text-xs">
      <p className="text-white/60 mb-1 font-medium">{currency ? fmtMonth(label) || label : label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || YELLOW }} className="font-bold">
          {p.name ? `${p.name}: ` : ''}{currency ? fmtCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────
function StatCard({ icon: Icon, label, value, glow, trend, trendLabel }) {
  const positive = trend > 0
  return (
    <div className={clsx(
      'relative overflow-hidden rounded-2xl p-5',
      'bg-white/[0.04] border border-white/[0.08]',
      'backdrop-blur-2xl shadow-2xl',
      'hover:bg-white/[0.07] hover:border-white/[0.14] transition-all duration-300 group'
    )}>
      {/* Glow orb */}
      <div className={clsx('absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-35 transition-opacity duration-300', glow)} />

      <div className="relative flex items-start justify-between">
        {/* Icon */}
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shadow-lg', glow, 'bg-opacity-20 border border-white/10')}>
          <Icon size={18} className="text-white" />
        </div>
        {/* Trend badge */}
        {trend !== undefined && trend !== null && (
          <div className={clsx(
            'flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full',
            positive
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
          )}>
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="relative mt-4">
        <p className="text-3xl font-bold text-white tracking-tight">{value ?? '—'}</p>
        <p className="text-xs text-white/50 mt-1 font-medium">{label}</p>
        {trendLabel && <p className="text-xs text-white/30 mt-0.5">{trendLabel}</p>}
      </div>
    </div>
  )
}

// ── Glass Chart Card ───────────────────────────────
function ChartCard({ title, subtitle, children, className }) {
  return (
    <div className={clsx(
      'relative overflow-hidden rounded-2xl',
      'bg-white/[0.03] border border-white/[0.07]',
      'backdrop-blur-2xl shadow-2xl',
      className
    )}>
      {/* Top highlight line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle && (
            <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────
function EmptyChart({ msg = 'Sin datos aún' }) {
  return (
    <div className="h-44 flex items-center justify-center">
      <p className="text-sm text-white/30">{msg}</p>
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

  const patientsMap = useMemo(() =>
    Object.fromEntries((patients ?? []).map(p => [p.id, p.full_name])),
    [patients]
  )

  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  const todayAppts = appointments?.filter(a =>
    format(new Date(a.appointment_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  )

  const monthlyRevenue = stats?.monthly_revenue       ?? []
  const weeklyAppts    = stats?.weekly_appointments   ?? []
  const newPatients    = stats?.new_patients          ?? []
  const apptByStatus   = stats?.appointments_by_status ?? []

  const totalRevThisMonth = monthlyRevenue.at(-1)?.total ?? 0
  const totalRevLastMonth = monthlyRevenue.at(-2)?.total
  const revenueGrowth = totalRevLastMonth
    ? +((( totalRevThisMonth - totalRevLastMonth) / totalRevLastMonth) * 100).toFixed(1)
    : null

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────── */}
      <div className="animate-fade-in-down flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
            Bienvenido, {user?.firstName}
          </h1>
          <p className="text-white/40 mt-1 text-sm capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-md">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-xs text-yellow-400 font-medium">En línea</span>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Pacientes activos"
          value={patients?.length}
          glow="bg-yellow-500"
          trend={null}
        />
        <StatCard
          icon={Clock}
          label="Citas hoy"
          value={todayAppts?.length}
          glow="bg-teal-500"
          trend={null}
        />
        <StatCard
          icon={CalendarDays}
          label="Citas pendientes"
          value={appointments?.length}
          glow="bg-purple-500"
          trend={null}
        />
        <StatCard
          icon={Receipt}
          label="Facturas pendientes"
          value={invoices?.length}
          glow="bg-rose-500"
          trend={null}
        />
      </div>

      {/* ── Charts row 1 ───────────────────────────── */}
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
                      <stop offset="5%"  stopColor={YELLOW} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={YELLOW} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.04} />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: '#ffffff', opacity: 0.4 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#ffffff', opacity: 0.35 }} axisLine={false} tickLine={false} width={42} />
                  <Tooltip content={<GlassTooltip currency />} cursor={{ stroke: YELLOW, strokeWidth: 1, strokeDasharray: '4 2' }} />
                  <Area type="monotone" dataKey="total" stroke={YELLOW} strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 3, fill: YELLOW, strokeWidth: 0 }} activeDot={{ r: 5, fill: YELLOW, stroke: '#000', strokeWidth: 2 }} />
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
                <BarChart data={weeklyAppts} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barSize={22}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={TEAL} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={TEAL} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.04} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#ffffff', opacity: 0.4 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#ffffff', opacity: 0.35 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<GlassTooltip />} cursor={{ fill: '#ffffff', fillOpacity: 0.03 }} />
                  <Bar dataKey="citas" name="Citas" fill="url(#barGrad)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </ChartCard>
      </div>

      {/* ── Charts row 2 ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* New Patients */}
        <ChartCard title="Nuevos pacientes" subtitle="Últimos 6 meses">
          {newPatients.length === 0 && !statsLoading
            ? <EmptyChart msg="Sin datos de pacientes" />
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={newPatients} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barSize={26}>
                  <defs>
                    <linearGradient id="patGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={PURPLE} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={PURPLE} stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.04} vertical={false} />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: '#ffffff', opacity: 0.4 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#ffffff', opacity: 0.35 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<GlassTooltip />} cursor={{ fill: '#ffffff', fillOpacity: 0.03 }} />
                  <Bar dataKey="count" name="Pacientes" fill="url(#patGrad)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </ChartCard>

        {/* Appointments by status */}
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
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {apptByStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, name) => [v, STATUS_LABELS[name] ?? name]}
                      contentStyle={{
                        background: 'rgba(0,0,0,0.75)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12,
                        fontSize: 12,
                        backdropFilter: 'blur(12px)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex-1 space-y-2.5">
                  {apptByStatus.map((item, i) => (
                    <div key={item.status} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}80` }}
                        />
                        <span className="text-xs text-white/50 truncate">
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-white flex-shrink-0">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </ChartCard>
      </div>

      {/* ── Today's Appointments ───────────────────── */}
      <div className={clsx(
        'relative overflow-hidden rounded-2xl',
        'bg-white/[0.03] border border-white/[0.07]',
        'backdrop-blur-2xl shadow-2xl'
      )}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white">Citas de hoy</h2>
            {todayAppts?.length > 0 && (
              <span className="text-xs text-white/40 bg-white/[0.05] border border-white/10 px-2.5 py-1 rounded-full">
                {todayAppts.length} programada{todayAppts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {!todayAppts?.length ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <CalendarDays size={20} className="text-white/20" />
              </div>
              <p className="text-sm text-white/30">No hay citas programadas para hoy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppts.map((appt, idx) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200"
                  style={{ opacity: 0, animation: `fadeInUp 0.4s ease-out forwards`, animationDelay: `${idx * 0.06}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-yellow-400">
                        {(patientsMap[appt.patient_id] ?? '?').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">{patientsMap[appt.patient_id] ?? 'Paciente desconocido'}</p>
                      <p className="text-xs text-white/40">{appt.reason || 'Sin motivo especificado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                    <Clock size={11} className="text-yellow-400" />
                    <span className="text-xs font-semibold text-yellow-400">
                      {format(new Date(appt.appointment_date), 'HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
