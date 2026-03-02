import { useUser } from '@clerk/clerk-react'
import { Users, CalendarDays, Receipt, TrendingUp } from 'lucide-react'
import { Card } from '../components/ui'
import { usePatients, useAppointments, useInvoices } from '../hooks'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Buen día, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 mt-1 capitalize">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users}       label="Pacientes activos"  value={patients?.length}    color="bg-primary-500" />
        <StatCard icon={CalendarDays} label="Citas hoy"          value={todayAppts?.length}  color="bg-emerald-500" />
        <StatCard icon={CalendarDays} label="Citas pendientes"   value={appointments?.length} color="bg-blue-500" />
        <StatCard icon={Receipt}     label="Facturas pendientes" value={invoices?.length}    color="bg-amber-500" />
      </div>

      {/* Citas de hoy */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Citas de hoy</h2>
        {!todayAppts?.length ? (
          <p className="text-sm text-gray-400 text-center py-8">No hay citas programadas para hoy</p>
        ) : (
          <div className="space-y-3">
            {todayAppts.map(appt => (
              <div key={appt.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{appt.patient_id}</p>
                  <p className="text-xs text-gray-400">{appt.reason || 'Sin motivo especificado'}</p>
                </div>
                <p className="text-sm font-medium text-primary-500">
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
