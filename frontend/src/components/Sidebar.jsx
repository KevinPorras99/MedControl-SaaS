import { NavLink } from 'react-router-dom'
import { UserButton, useUser } from '@clerk/clerk-react'
import {
  LayoutDashboard, Users, CalendarDays,
  FileText, Receipt, Settings, Stethoscope
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patients',     icon: Users,           label: 'Pacientes' },
  { to: '/appointments', icon: CalendarDays,    label: 'Citas' },
  { to: '/invoices',     icon: Receipt,         label: 'Facturación' },
  { to: '/settings',     icon: Settings,        label: 'Configuración' },
]

export default function Sidebar() {
  const { user } = useUser()

  return (
    <aside className="w-64 flex flex-col bg-primary-900 text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-700">
        <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center">
          <Stethoscope size={20} className="text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">MedControl</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'text-primary-100 hover:bg-primary-700'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-primary-700 flex items-center gap-3">
        <UserButton afterSignOutUrl="/" />
        <div className="text-sm truncate">
          <p className="font-medium text-white truncate">{user?.fullName}</p>
          <p className="text-primary-300 text-xs truncate">{user?.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>
    </aside>
  )
}
