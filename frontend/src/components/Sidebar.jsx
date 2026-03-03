import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { UserButton, useUser } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../hooks/useTheme'
import {
  LayoutDashboard, Users, CalendarDays,
  Receipt, Settings, Copy, Check, Moon, Sun
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
    <div className="mx-3 mb-3 bg-white/[0.10] backdrop-blur-md border border-gray-300/50 rounded-lg px-3 py-2.5 shadow-sm">
      <p className="text-xs text-gray-700 font-medium mb-1">Código de acceso</p>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-bold text-yellow-700 tracking-widest text-sm">{code}</span>
        <button onClick={copy} className="text-gray-600 hover:text-yellow-700 transition-colors shrink-0">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <p className="text-xs text-gray-700 dark:text-gray-500 mt-1">Compartilo con tu equipo</p>
    </div>
  )
}

export default function Sidebar() {
  const { user } = useUser()
  const qc = useQueryClient()
  const { theme, toggleTheme } = useTheme()
  const me = qc.getQueryData(['me'])
  const isAdmin = me?.user?.role === 'admin_clinic'
  const accessCode = me?.clinic?.access_code

  return (
    <aside className="w-64 flex flex-col bg-white/[0.10] border-r border-gray-300/50 text-gray-800 shrink-0 shadow-md backdrop-blur-2xl dark:bg-black/30 dark:backdrop-blur-2xl dark:border-white/[0.08] dark:text-gray-100 dark:shadow-xl">
      {/* Logo */}
      <div className="flex items-center justify-center px-4 py-3 border-b border-gray-300/50 dark:border-white/[0.08]">
        <img src="/MedcontrolSaas.png" alt="MedControl" className="w-full h-auto brightness-0 invert dark:brightness-100 dark:invert-0" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/30'
                  : 'text-gray-700 hover:bg-white/[0.15] hover:text-gray-900 backdrop-blur-md dark:text-gray-300 dark:hover:bg-white/[0.08] dark:hover:text-gray-100 dark:backdrop-blur-md'
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

      {/* Theme Toggle & User */}
      <div className="px-4 py-3 border-t border-gray-300/50 dark:border-white/[0.08] space-y-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/[0.15] hover:bg-white/[0.25] border border-gray-300/50 text-gray-700 hover:text-gray-900 backdrop-blur-md dark:bg-white/[0.05] dark:hover:bg-white/10 dark:border-white/10 dark:text-gray-300 dark:hover:text-gray-100 transition-all text-sm font-medium"
          title={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span className="text-xs">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
        </button>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="text-sm truncate">
            <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{user?.fullName}</p>
            <p className="text-gray-700 dark:text-gray-400 text-xs truncate">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
