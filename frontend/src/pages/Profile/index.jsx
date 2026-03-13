import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { PageHeader, Card, Input, Button } from '../../components/ui'
import { useMe } from '../../hooks'
import { User, Shield, Bell, Palette } from 'lucide-react'

const ROLE_LABELS = { admin_clinic: 'Administrador de Clínica', doctor: 'Doctor/a', receptionist: 'Recepcionista' }
const ROLE_COLORS = {
  admin_clinic: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  doctor: 'bg-blue-100 text-blue-700 border border-blue-300',
  receptionist: 'bg-green-100 text-green-700 border border-green-300',
}

export default function ProfilePage() {
  const { user } = useUser()
  const { data: me } = useMe()
  const myUser = me?.user
  const clinic = me?.clinic

  return (
    <div>
      <div className="animate-fade-in-down">
        <PageHeader title="Mi Perfil" subtitle="Configuración personal de tu cuenta" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile card */}
        <div className="space-y-4">
          <Card className="p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex flex-col items-center text-center">
              <img
                src={user?.imageUrl}
                alt={user?.fullName}
                className="w-20 h-20 rounded-full ring-4 ring-yellow-200 dark:ring-yellow-500/30 mb-3"
              />
              <p className="font-semibold text-gray-800 dark:text-white text-lg">{user?.fullName}</p>
              <p className="text-sm text-gray-500 dark:text-white/50">{user?.primaryEmailAddress?.emailAddress}</p>
              {myUser?.role && (
                <span className={`mt-3 text-xs px-3 py-1 rounded-full font-medium ${ROLE_COLORS[myUser.role]}`}>
                  {ROLE_LABELS[myUser.role]}
                </span>
              )}
            </div>
          </Card>

          {clinic && (
            <Card className="p-5 animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-white/40 mb-3">Mi Clínica</p>
              <p className="font-medium text-gray-800 dark:text-white">{clinic.name}</p>
              <p className="text-xs text-gray-500 dark:text-white/50 mt-1">Plan: <span className="capitalize font-medium text-yellow-600">{clinic.subscription_plan}</span></p>
              {clinic.email && <p className="text-xs text-gray-500 dark:text-white/50 mt-1">{clinic.email}</p>}
              {clinic.phone && <p className="text-xs text-gray-500 dark:text-white/50">{clinic.phone}</p>}
            </Card>
          )}
        </div>

        {/* Right: Sections */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-4">
              <User size={17} className="text-gray-600 dark:text-white/60" />
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">Información personal</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-white/50 mb-1">Nombre completo</p>
                <p className="text-sm text-gray-800 dark:text-white">{user?.fullName || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-white/50 mb-1">Email</p>
                <p className="text-sm text-gray-800 dark:text-white">{user?.primaryEmailAddress?.emailAddress || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-white/50 mb-1">Rol en el sistema</p>
                <p className="text-sm text-gray-800 dark:text-white">{ROLE_LABELS[myUser?.role] || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-white/50 mb-1">Estado</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${myUser?.is_active ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                  {myUser?.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-white/40">
              Para actualizar tu nombre o foto de perfil, usá el menú de usuario (ícono de tu avatar en la barra lateral).
            </p>
          </Card>

          <Card className="p-6 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={17} className="text-gray-600 dark:text-white/60" />
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">Seguridad</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-white/70 mb-3">
              La gestión de contraseña y autenticación se realiza a través de tu cuenta Clerk.
            </p>
            <p className="text-xs text-gray-400 dark:text-white/40">
              Proveedor de autenticación: <span className="font-medium">Clerk Auth</span>
            </p>
          </Card>

          <Card className="p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 mb-4">
              <Bell size={17} className="text-gray-600 dark:text-white/60" />
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">Notificaciones</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Recordatorios de citas', desc: 'Notificaciones antes de cada cita' },
                { label: 'Nuevos pacientes', desc: 'Cuando se registra un paciente nuevo' },
                { label: 'Pagos recibidos', desc: 'Cuando se registra un pago en el sistema' },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-200/30 dark:border-white/10 last:border-0">
                  <div>
                    <p className="text-sm text-gray-800 dark:text-white">{n.label}</p>
                    <p className="text-xs text-gray-400 dark:text-white/40">{n.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500 dark:bg-white/20"></div>
                  </label>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
