import { useUser } from '@clerk/clerk-react'
import { Users, CalendarDays, Receipt, TrendingUp } from 'lucide-react'
import { Card } from '../components/ui'
import { usePatients, useAppointments, useInvoices } from '../hooks'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import clsx from 'clsx'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card className={clsx('p-5 flex items-center gap-4 hover:border-gray-300/50 dark:hover:border-white/20 transition-all hover-lift stagger-item', color, color)}>
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shadow-lg', {
        'bg-yellow-500 text-black dark:bg-yellow-500': color === 'yellow',
        'bg-gray-500 text-white dark:bg-gray-500': color === 'gray',
      })}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-gray-700 dark:text-white/80">{label}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-white">{value ?? '—'}</p>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useUser()
  const { data: patients } = usePatients()
  const { data: appointments } = useAppointments({ status: 'programada' })
  const { data: invoices } = useInvoices({ status: 'pendiente' })

  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es })
  const todayAppts = appointments?.filter(a =>
    format(new Date(a.appointment_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  )

  return (
    <div>
      <div className="mb-8 animate-fade-in-down">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Bienvenido, {user?.firstName} 
        </h1>
        <p className="text-gray-700 dark:text-white/70 mt-1 capitalize">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users}        label="Pacientes activos"  value={patients?.length}     color="bg-yellow-500" />
        <StatCard icon={CalendarDays} label="Citas hoy"          value={todayAppts?.length}   color="bg-gray-500" />
        <StatCard icon={CalendarDays} label="Citas pendientes"   value={appointments?.length} color="bg-yellow-600" />
        <StatCard icon={Receipt}      label="Facturas pendientes" value={invoices?.length}     color="bg-gray-600" />
      </div>

      {/* Citas de hoy */}
      <Card className="p-6 animate-fade-in-up">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">Citas de hoy</h2>
        {!todayAppts?.length ? (
          <p className="text-sm text-gray-700 dark:text-white/70 text-center py-8">No hay citas programadas para hoy</p>
        ) : (
          <div className="space-y-3">
            {todayAppts.map((appt, idx) => (
              <div key={appt.id} className="flex items-center justify-between py-3 border-b border-gray-300/50 dark:border-white/10 last:border-0 transition-smooth stagger-item" style={{opacity: 0, animation: `fadeInUp 0.6s ease-out forwards`, animationDelay: `${idx * 0.1}s`}}>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{appt.patient_id}</p>
                  <p className="text-xs text-gray-700 dark:text-white/70">{appt.reason || 'Sin motivo especificado'}</p>
                </div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
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
