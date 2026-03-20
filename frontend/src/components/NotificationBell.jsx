import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, AlertCircle, Clock, Info } from 'lucide-react'
import { useApi } from '../lib/api'

const SEEN_KEY = 'medcontrol_seen_notifs'

function getSeenIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function addSeenIds(ids) {
  const all = [...getSeenIds(), ...ids]
  localStorage.setItem(SEEN_KEY, JSON.stringify(all))
}

const SEV = {
  high: {
    border: 'border-red-500',
    bg: 'bg-red-100 dark:bg-red-500/20',
    icon: AlertCircle,
    text: 'text-red-500',
  },
  medium: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-100 dark:bg-yellow-500/20',
    icon: Clock,
    text: 'text-yellow-500',
  },
  low: {
    border: 'border-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-500/20',
    icon: Info,
    text: 'text-blue-500',
  },
}

export default function NotificationBell() {
  const api = useApi()
  const [open, setOpen] = useState(false)
  const [seenIds, setSeenIds] = useState(getSeenIds)
  const dropdownRef = useRef(null)

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/api/notifications').then((r) => r.data),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  })

  // Count notifications whose id is not yet seen
  const unreadCount = notifications.filter((n) => !seenIds.has(n.id)).length

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleMouseDown(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  function markAllRead() {
    const allIds = notifications.map((n) => n.id)
    addSeenIds(allIds)
    setSeenIds(getSeenIds())
  }

  function markRead(id) {
    addSeenIds([id])
    setSeenIds(getSeenIds())
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          style={{ background: 'rgba(14,14,14,0.97)', backdropFilter: 'blur(12px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-semibold text-white">Notificaciones</span>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Marcar todo como leído
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 gap-2">
                <Bell size={28} className="text-gray-600" />
                <p className="text-sm text-gray-500">Sin notificaciones</p>
              </div>
            ) : (
              <ul>
                {notifications.map((notif) => {
                  const cfg = SEV[notif.severity] ?? SEV.low
                  const IconComp = cfg.icon
                  const isUnread = !seenIds.has(notif.id)

                  return (
                    <li key={notif.id}>
                      <Link
                        to={notif.link}
                        onClick={() => {
                          markRead(notif.id)
                          setOpen(false)
                        }}
                        className={[
                          'flex items-start gap-3 px-4 py-3 border-l-4 transition-colors',
                          cfg.border,
                          isUnread
                            ? 'bg-white/5 hover:bg-white/10'
                            : 'hover:bg-white/5',
                        ].join(' ')}
                      >
                        {/* Icon */}
                        <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                          <IconComp size={14} className={cfg.text} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold leading-tight ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-400 leading-snug mt-0.5 break-words">
                            {notif.body}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {isUnread && (
                          <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-red-500" />
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
