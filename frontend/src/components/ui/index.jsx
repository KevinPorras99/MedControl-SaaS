import clsx from 'clsx'

// ── Button ────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', className, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-2 font-medium rounded-lg transition-smooth hover:scale-105 active:scale-95 disabled:opacity-50',
        {
          'bg-yellow-500 hover:bg-yellow-600 text-black shadow-lg shadow-yellow-500/20': variant === 'primary',
          'bg-gray-200/50 hover:bg-gray-300/50 border border-gray-300/50 text-gray-800 backdrop-blur-md dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/20 dark:text-white dark:backdrop-blur-md': variant === 'secondary',
          'bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-600 dark:text-red-300 dark:backdrop-blur-md': variant === 'danger',
          'border border-gray-300/50 hover:bg-gray-200/50 text-gray-800 backdrop-blur-md dark:border-white/20 dark:hover:bg-white/10 dark:text-white/90 dark:hover:text-white dark:backdrop-blur-md': variant === 'outline',
        },
        {
          'px-4 py-2 text-sm': size === 'md',
          'px-3 py-1.5 text-xs': size === 'sm',
          'px-5 py-2.5 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────
export function Input({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-800 dark:text-white/90">{label}</label>}
      <input
        className={clsx(
          'w-full px-3 py-2 rounded-lg border text-sm transition-colors',
          'bg-white/[0.08] text-gray-800 placeholder-gray-500 backdrop-blur-md',
          'dark:bg-white/[0.05] dark:text-white dark:placeholder-white/50 dark:backdrop-blur-md',
          'focus:outline-none focus:ring-2 focus:ring-yellow-500/60 focus:border-yellow-400/60',
          error
            ? 'border-red-400 dark:border-red-400/50 bg-red-50 dark:bg-red-500/10'
            : 'border-gray-300/50 dark:border-white/20',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────
export function Select({ label, error, children, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-800 dark:text-white/90">{label}</label>}
      <select
        className={clsx(
          'w-full px-3 py-2 rounded-lg border text-sm transition-colors',
          'bg-white/[0.08] text-gray-800 border-gray-300/50 backdrop-blur-md',
          'dark:bg-white/[0.05] dark:text-white dark:border-white/20 dark:backdrop-blur-md',
          'focus:outline-none focus:ring-2 focus:ring-yellow-500/60 focus:border-yellow-400/60',
          error ? 'border-red-400 dark:border-red-400/50 bg-red-50 dark:bg-red-500/10' : '',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────
const BADGE_COLORS = {
  programada: 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/30 dark:backdrop-blur-md',
  confirmada: 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-500/20 dark:text-green-300 dark:border-green-400/30 dark:backdrop-blur-md',
  cancelada:  'bg-red-100 text-red-800 border border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-400/30 dark:backdrop-blur-md',
  atendida:   'bg-gray-200 text-gray-800 border border-gray-300 dark:bg-white/[0.05] dark:text-white/80 dark:border-white/10 dark:backdrop-blur-md',
  pendiente:  'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-400/30 dark:backdrop-blur-md',
  pagada:     'bg-green-100 text-green-800 border border-green-300 dark:bg-green-500/20 dark:text-green-300 dark:border-green-400/30 dark:backdrop-blur-md',
  anulada:    'bg-red-100 text-red-800 border border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-400/30 dark:backdrop-blur-md',
}

export function Badge({ status }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium capitalize', BADGE_COLORS[status] || 'bg-gray-200 text-gray-800 border border-gray-300 dark:bg-white/[0.05] dark:text-white/80 dark:border-white/10 dark:backdrop-blur-md')}>
      {status}
    </span>
  )
}

// ── Card ──────────────────────────────────────────
export function Card({ children, className }) {
  return (
    <div className={clsx('bg-white/[0.08] border border-gray-300/50 rounded-xl shadow-sm backdrop-blur-xl transition-smooth hover-lift dark:bg-white/[0.03] dark:backdrop-blur-xl dark:border-white/[0.08] dark:shadow-2xl', className)}>
      {children}
    </div>
  )
}

// ── PageHeader ────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-700 dark:text-white/70 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm dark:bg-black/60" onClick={onClose} />
      <div className="relative bg-white/[0.10] border border-gray-300/50 rounded-2xl shadow-xl backdrop-blur-2xl dark:bg-black/40 dark:backdrop-blur-2xl dark:border-white/15 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300/50 dark:border-white/10">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 dark:text-white/60 dark:hover:text-white text-xl leading-none transition-colors">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-gray-400 dark:border-white/20 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  )
}

// ── EmptyState ────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={48} className="text-gray-500 dark:text-gray-500 mb-4" />}
      <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">{title}</h3>
      {description && <p className="text-sm text-gray-700 dark:text-white/70 mt-1 mb-4">{description}</p>}
      {action}
    </div>
  )
}

