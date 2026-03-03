import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { UserButton, useUser } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, CalendarDays,
  Receipt, Settings, Stethoscope, Copy, Check
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patients',     icon: Users,           label: 'Pacientes' },
  { to: '/appointments', icon: CalendarDays,    label: 'Citas' },
  { to: '/invoices',     icon: Receipt,         label: 'Facturación' },
  { to: '/settings',     icon: Settings,        label: 'Configuración' },
]

function AccessCodeBadge({ code }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="mx-3 mb-3 bg-primary-800 rounded-lg px-3 py-2.5">
      <p className="text-xs text-primary-400 font-medium mb-1">Código de acceso</p>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-bold text-white tracking-widest text-sm">{code}</span>
        <button onClick={copy} className="text-primary-300 hover:text-white transition-colors shrink-0">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <p className="text-xs text-primary-400 mt-1">Compartilo con tu equipo</p>
    </div>
  )
}

export default function Sidebar() {
  const { user } = useUser()
  const qc = useQueryClient()
  const me = qc.getQueryData(['me'])
  const isAdmin = me?.user?.role === 'admin_clinic'
  const accessCode = me?.clinic?.access_code

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

      {/* Código de acceso (solo admin) */}
      {isAdmin && accessCode && <AccessCodeBadge code={accessCode} />}

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
