import { Link } from 'react-router-dom'
import { SignIn } from '@clerk/clerk-react'
import { ArrowLeft, Stethoscope, Check, Users, CalendarDays, ClipboardList, ChevronRight } from 'lucide-react'

// ── Plan guide data ──────────────────────────────────────────────────────────────

const PLAN_GUIDE = [
  {
    key: 'basico',
    name: 'Básico',
    price: '$29',
    color: 'text-sky-400',
    border: 'border-sky-500/20',
    bg: 'bg-sky-500/[0.06]',
    dot: 'bg-sky-400',
    perks: ['1 médico', 'Hasta 200 pacientes', 'Agenda + historial clínico', 'Facturación básica'],
  },
  {
    key: 'profesional',
    name: 'Profesional',
    price: '$79',
    badge: 'Más popular',
    color: 'text-orange-400',
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/[0.07]',
    dot: 'bg-orange-400',
    perks: ['Hasta 5 médicos', 'Pacientes ilimitados', 'Reportes financieros', 'Exportación CSV'],
  },
  {
    key: 'clinica',
    name: 'Clínica',
    price: '$149',
    color: 'text-purple-400',
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/[0.06]',
    dot: 'bg-purple-400',
    perks: ['Médicos ilimitados', 'Pacientes ilimitados', 'Todo incluido', 'Soporte 24/7'],
  },
]

const HIGHLIGHTS = [
  { icon: Users,         text: 'Gestioná pacientes, citas e historial desde un solo lugar' },
  { icon: CalendarDays,  text: 'Agenda inteligente con recordatorios automáticos por WhatsApp' },
  { icon: ClipboardList, text: 'Expedientes clínicos inmutables con adjuntos médicos' },
]

// ── Componente ────────────────────────────────────────────────────────────────────

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT PANEL: Plan guide ──────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-10 border-r border-white/[0.06] shrink-0"
        style={{ background: 'rgba(8,8,8,0.94)', backdropFilter: 'blur(24px)' }}
      >
        {/* Logo */}
        <div>
          <Link to="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
              <Stethoscope size={15} className="text-white" />
            </div>
            <span className="text-base font-semibold text-white tracking-tight">MedControl</span>
          </Link>

          {/* Headline */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white leading-snug mb-3">
              Gestión clínica{' '}
              <span className="text-orange-400">simple</span>{' '}
              y profesional
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              14 días de prueba gratis. Sin tarjeta de crédito.
              Cancelá cuando quieras.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-3 mb-10">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={13} className="text-orange-400" />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* Plan comparison mini */}
          <div>
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em] mb-3">
              Elegí el plan que mejor se adapta
            </p>
            <div className="space-y-2.5">
              {PLAN_GUIDE.map(plan => (
                <Link
                  to={`/checkout/${plan.key}`}
                  key={plan.key}
                  className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:brightness-110 ${plan.border} ${plan.bg}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${plan.dot}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${plan.color}`}>{plan.name}</span>
                        {plan.badge && (
                          <span className="text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                        {plan.perks.slice(0, 2).map(p => (
                          <li key={p} className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Check size={9} className="text-green-500 shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <span className={`text-sm font-bold ${plan.color}`}>{plan.price}</span>
                    <span className="text-[10px] text-gray-600">/mes</span>
                    <ChevronRight size={12} className="text-gray-600 ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-gray-600 leading-relaxed mt-8">
          Al crear una cuenta aceptás los términos de servicio y la política de privacidad de MedControl.
          Tus datos están protegidos con cifrado de extremo a extremo.
        </p>
      </div>

      {/* ── RIGHT PANEL: Clerk SignIn ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative min-h-screen lg:min-h-0">

        {/* Mobile back button */}
        <Link
          to="/"
          className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors lg:hidden"
        >
          <ArrowLeft size={15} />
          Volver
        </Link>

        {/* Desktop back button */}
        <Link
          to="/"
          className="absolute top-6 left-6 hidden lg:flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={15} />
          Volver al inicio
        </Link>

        <div className="w-full max-w-[400px]">
          {/* Mobile branding */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-3 shadow-lg shadow-orange-500/30">
              <Stethoscope size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MedControl</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistema de Gestión Clínica</p>
          </div>

          {/* Mobile plan mini-guide */}
          <div className="lg:hidden mb-6 rounded-xl border border-white/[0.07] p-4 space-y-3" style={{ background: 'rgba(14,14,14,0.80)' }}>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Planes disponibles</p>
            <div className="grid grid-cols-3 gap-2">
              {PLAN_GUIDE.map(plan => (
                <Link
                  to={`/checkout/${plan.key}`}
                  key={plan.key}
                  className={`rounded-lg border p-2 text-center cursor-pointer transition-colors hover:brightness-110 ${plan.border} ${plan.bg}`}
                >
                  <p className={`text-[10px] font-semibold ${plan.color}`}>{plan.name}</p>
                  <p className="text-xs font-bold text-white mt-0.5">{plan.price}</p>
                  <p className="text-[9px] text-gray-600">/mes</p>
                </Link>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 text-center">
              14 días gratis · Sin tarjeta de crédito
            </p>
          </div>

          {/* Clerk SignIn */}
          <SignIn routing="hash" />
        </div>
      </div>
    </div>
  )
}
