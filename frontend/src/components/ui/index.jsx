import clsx from 'clsx'

// ── Button ────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', className, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50',
        {
          'bg-primary-500 hover:bg-primary-700 text-white': variant === 'primary',
          'bg-gray-100 hover:bg-gray-200 text-gray-700': variant === 'secondary',
          'bg-red-50 hover:bg-red-100 text-red-600': variant === 'danger',
          'border border-gray-300 hover:bg-gray-50 text-gray-700': variant === 'outline',
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
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={clsx(
          'w-full px-3 py-2 rounded-lg border text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────
export function Select({ label, error, children, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        className={clsx(
          'w-full px-3 py-2 rounded-lg border text-sm transition-colors bg-white',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          error ? 'border-red-400' : 'border-gray-300',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────
const BADGE_COLORS = {
  programada:  'bg-blue-50 text-blue-700',
  confirmada:  'bg-green-50 text-green-700',
  cancelada:   'bg-red-50 text-red-600',
  atendida:    'bg-gray-100 text-gray-600',
  pendiente:   'bg-yellow-50 text-yellow-700',
  pagada:      'bg-green-50 text-green-700',
  anulada:     'bg-red-50 text-red-600',
}

export function Badge({ status }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium capitalize', BADGE_COLORS[status] || 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  )
}

// ── Card ──────────────────────────────────────────
export function Card({ children, className }) {
  return (
    <div className={clsx('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>
      {children}
    </div>
  )
}

// ── PageHeader ────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
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
      <div className="w-8 h-8 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin" />
    </div>
  )
}

// ── EmptyState ────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={48} className="text-gray-300 mb-4" />}
      <h3 className="text-lg font-medium text-gray-600">{title}</h3>
      {description && <p className="text-sm text-gray-400 mt-1 mb-4">{description}</p>}
      {action}
    </div>
  )
}
