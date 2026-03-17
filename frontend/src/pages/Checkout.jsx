import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Stethoscope, ArrowLeft, Check, X, CreditCard,
  Lock, ShieldCheck, Clock, Zap, Users, BarChart3,
  ChevronRight, Sparkles,
} from 'lucide-react'

// ── Datos de planes ───────────────────────────────────────────────────────────

const PLANS = {
  basico: {
    name: 'Básico',
    price: 29,
    period: 'mes',
    desc: 'Ideal para consultorios individuales.',
    color: 'text-sky-400',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/[0.06]',
    glow: 'rgba(14,165,233,0.08)',
    dot: 'bg-sky-400',
    highlight: false,
    features: [
      { text: '1 médico incluido', ok: true },
      { text: 'Hasta 200 pacientes', ok: true },
      { text: 'Agenda y calendario', ok: true },
      { text: 'Historial clínico', ok: true },
      { text: 'Facturación básica', ok: true },
      { text: 'Reportes financieros', ok: false },
      { text: 'Exportación CSV', ok: false },
      { text: 'Soporte prioritario', ok: false },
      { text: 'Médicos adicionales', ok: false },
    ],
    included: [
      { icon: Users,    text: '1 médico' },
      { icon: Clock,    text: '200 pacientes' },
      { icon: Zap,      text: 'Historial clínico' },
    ],
  },
  profesional: {
    name: 'Profesional',
    price: 79,
    period: 'mes',
    desc: 'Para clínicas con equipo médico.',
    color: 'text-orange-400',
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/[0.07]',
    glow: 'rgba(249,115,22,0.10)',
    dot: 'bg-orange-400',
    highlight: true,
    badge: 'Más popular',
    features: [
      { text: 'Hasta 5 médicos', ok: true },
      { text: 'Pacientes ilimitados', ok: true },
      { text: 'Agenda y calendario', ok: true },
      { text: 'Historial clínico completo', ok: true },
      { text: 'Facturación avanzada', ok: true },
      { text: 'Reportes financieros', ok: true },
      { text: 'Exportación CSV', ok: true },
      { text: 'Soporte prioritario', ok: false },
      { text: 'Médicos ilimitados', ok: false },
    ],
    included: [
      { icon: Users,    text: 'Hasta 5 médicos' },
      { icon: BarChart3, text: 'Reportes completos' },
      { icon: Zap,      text: 'Pacientes ilimitados' },
    ],
  },
  clinica: {
    name: 'Clínica',
    price: 149,
    period: 'mes',
    desc: 'Para clínicas y centros médicos.',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/[0.06]',
    glow: 'rgba(168,85,247,0.08)',
    dot: 'bg-purple-400',
    highlight: false,
    features: [
      { text: 'Médicos ilimitados', ok: true },
      { text: 'Pacientes ilimitados', ok: true },
      { text: 'Agenda y calendario', ok: true },
      { text: 'Historial clínico completo', ok: true },
      { text: 'Facturación avanzada', ok: true },
      { text: 'Reportes financieros', ok: true },
      { text: 'Exportación CSV', ok: true },
      { text: 'Soporte prioritario 24/7', ok: true },
      { text: 'Migración de datos asistida', ok: true },
    ],
    included: [
      { icon: Users,     text: 'Médicos ilimitados' },
      { icon: ShieldCheck, text: 'Soporte 24/7' },
      { icon: Sparkles,  text: 'Todo incluido' },
    ],
  },
}

const TRUST = [
  { icon: Lock,       label: 'Pago 100% seguro', sub: 'Encriptación SSL de extremo a extremo' },
  { icon: Clock,      label: '14 días gratis',    sub: 'Sin cargo hasta que decidas continuar' },
  { icon: ShieldCheck, label: 'Cancela cuando quieras', sub: 'Sin permanencia ni penalizaciones' },
]

// ── Componente principal ──────────────────────────────────────────────────────

export default function Checkout() {
  const { plan: planKey } = useParams()
  const navigate = useNavigate()
  const plan = PLANS[planKey]

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-4xl font-bold text-white">Plan no encontrado</div>
        <p className="text-gray-500">El plan "{planKey}" no existe.</p>
        <Link to="/#pricing" className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1.5 mt-2">
          <ArrowLeft size={14} /> Ver todos los planes
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT: Resumen del plan ──────────────────────────────────────────── */}
      <div
        className="lg:w-[460px] xl:w-[520px] shrink-0 flex flex-col p-8 lg:p-12 border-r border-white/[0.06]"
        style={{ background: 'rgba(8,8,8,0.94)', backdropFilter: 'blur(24px)' }}
      >
        {/* Logo + back */}
        <div className="flex items-center justify-between mb-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
              <Stethoscope size={15} className="text-white" />
            </div>
            <span className="text-base font-semibold text-white tracking-tight">MedControl</span>
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft size={14} />
            Volver
          </button>
        </div>

        {/* Plan card */}
        <div
          className={`rounded-2xl border p-6 mb-8 ${plan.border} ${plan.bg}`}
          style={{ boxShadow: `0 0 40px ${plan.glow}` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2.5 h-2.5 rounded-full ${plan.dot}`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${plan.color}`}>
                  Plan {plan.name}
                </span>
                {plan.badge && (
                  <span className="text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    {plan.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{plan.desc}</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <span className="text-3xl font-bold text-white">${plan.price}</span>
              <span className="text-xs text-gray-500 ml-1">/{plan.period}</span>
            </div>
          </div>

          {/* Key inclusions */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/[0.06]">
            {plan.included.map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-1.5 text-center">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                  <Icon size={13} className="text-gray-400" />
                </div>
                <span className="text-[10px] text-gray-500 leading-tight">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature list */}
        <div className="flex-1">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em] mb-4">
            Qué incluye este plan
          </p>
          <ul className="space-y-2.5">
            {plan.features.map(({ text, ok }) => (
              <li key={text} className="flex items-center gap-2.5 text-xs">
                {ok
                  ? <Check size={13} className="text-green-500 shrink-0" />
                  : <X size={13} className="text-white/20 shrink-0" />
                }
                <span className={ok ? 'text-gray-300' : 'text-gray-600'}>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Trust badges */}
        <div className="mt-10 space-y-3">
          {TRUST.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={12} className="text-gray-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-300">{label}</p>
                <p className="text-[10px] text-gray-600">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Formulario de pago ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-14">
        <div className="w-full max-w-[440px]">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Activar plan <span className={plan.color}>{plan.name}</span>
            </h1>
            <p className="text-sm text-gray-500">
              14 días gratis, sin cargo hasta que decidas continuar.
            </p>
          </div>

          {/* Stripe coming soon notice */}
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.05] p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard size={14} className="text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-300 mb-1">Pasarela de pago próximamente</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Estamos integrando Stripe para procesar pagos de forma segura.
                  Por ahora, activá tu cuenta y el equipo de MedControl te contactará
                  para completar la suscripción al plan <strong className={`font-semibold ${plan.color}`}>{plan.name}</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Form placeholder */}
          <div className="space-y-4 mb-6">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="tu@email.com"
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-500 placeholder-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Card number */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Número de tarjeta
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="1234  5678  9012  3456"
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-500 placeholder-gray-600 cursor-not-allowed pr-12"
                />
                <CreditCard size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              </div>
            </div>

            {/* Expiry + CVC */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Vencimiento
                </label>
                <input
                  type="text"
                  placeholder="MM / AA"
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-500 placeholder-gray-600 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  CVC
                </label>
                <input
                  type="text"
                  placeholder="123"
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-500 placeholder-gray-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Cardholder */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Nombre en la tarjeta
              </label>
              <input
                type="text"
                placeholder="Juan Pérez"
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-500 placeholder-gray-600 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Pricing summary */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 mb-6 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Plan {plan.name}</span>
              <span className="text-gray-300">${plan.price}.00</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Prueba gratuita (14 días)</span>
              <span className="text-green-400">−${plan.price}.00</span>
            </div>
            <div className="border-t border-white/[0.06] pt-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Total hoy</span>
              <span className="text-sm font-bold text-green-400">$0.00</span>
            </div>
          </div>

          {/* CTA */}
          <button
            disabled
            className="w-full py-3 rounded-xl bg-orange-500/40 text-orange-200/60 text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2 mb-4"
          >
            <Lock size={14} />
            Activar plan {plan.name} — Próximamente
          </button>

          {/* Alternative: go to login */}
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-3">
              ¿Ya tenés cuenta? Iniciá sesión y contactanos para activar tu plan.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
            >
              Ir al login
              <ChevronRight size={13} />
            </Link>
          </div>

          {/* Security note */}
          <div className="mt-8 flex items-center justify-center gap-1.5 text-[10px] text-gray-600">
            <Lock size={10} />
            Pago seguro con cifrado SSL · Stripe (próximamente)
          </div>
        </div>
      </div>
    </div>
  )
}
