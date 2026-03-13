import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Stethoscope, Check, X, ShieldCheck,
  CreditCard, Lock, Zap, Clock, HeadphonesIcon,
  AlertCircle, ChevronRight,
} from 'lucide-react'

// ── Datos de planes ─────────────────────────────────────────────────────────────

const PLANS = {
  basico: {
    key: 'basico',
    name: 'Básico',
    price: 29,
    period: '/mes',
    desc: 'Ideal para consultorios individuales que recién empiezan.',
    color: 'sky',
    features: [
      { text: '1 médico incluido', included: true },
      { text: 'Hasta 200 pacientes', included: true },
      { text: 'Agenda de citas', included: true },
      { text: 'Historial clínico', included: true },
      { text: 'Facturación básica', included: true },
      { text: 'Exportación CSV', included: false },
      { text: 'Reportes financieros', included: false },
      { text: 'Soporte prioritario', included: false },
    ],
    badge: null,
    highlight: false,
  },
  profesional: {
    key: 'profesional',
    name: 'Profesional',
    price: 79,
    period: '/mes',
    desc: 'Para clínicas con equipo médico que buscan crecer.',
    color: 'orange',
    features: [
      { text: 'Hasta 5 médicos', included: true },
      { text: 'Pacientes ilimitados', included: true },
      { text: 'Agenda de citas', included: true },
      { text: 'Historial clínico completo', included: true },
      { text: 'Facturación avanzada', included: true },
      { text: 'Exportación CSV', included: true },
      { text: 'Reportes financieros', included: true },
      { text: 'Soporte prioritario', included: false },
    ],
    badge: 'Más popular',
    highlight: true,
  },
  clinica: {
    key: 'clinica',
    name: 'Clínica',
    price: 149,
    period: '/mes',
    desc: 'Para centros médicos y clínicas con múltiples especialidades.',
    color: 'purple',
    features: [
      { text: 'Médicos ilimitados', included: true },
      { text: 'Pacientes ilimitados', included: true },
      { text: 'Agenda de citas', included: true },
      { text: 'Historial clínico completo', included: true },
      { text: 'Facturación avanzada', included: true },
      { text: 'Exportación CSV', included: true },
      { text: 'Reportes financieros', included: true },
      { text: 'Soporte prioritario 24/7', included: true },
    ],
    badge: 'Empresarial',
    highlight: false,
  },
}

const COLOR_MAP = {
  sky:    { border: 'border-sky-500/30',    accent: 'text-sky-400',    bg: 'bg-sky-500/10',    pill: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  orange: { border: 'border-orange-500/40', accent: 'text-orange-400', bg: 'bg-orange-500/10', pill: 'bg-orange-500 text-white border-transparent' },
  purple: { border: 'border-purple-500/30', accent: 'text-purple-400', bg: 'bg-purple-500/10', pill: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
}

const DARK_BG  = { background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(24px)' }
const CARD_BG  = { background: 'rgba(14,14,14,0.95)', backdropFilter: 'blur(12px)' }
const INPUT_BG = { background: 'rgba(255,255,255,0.04)' }

// ── Subcomponentes ───────────────────────────────────────────────────────────────

function FakeCardField({ label, placeholder, icon: Icon, half = false }) {
  return (
    <div className={half ? 'flex-1' : 'w-full'}>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
            <Icon size={14} />
          </div>
        )}
        <input
          disabled
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-lg border border-white/[0.08] text-sm text-gray-600 placeholder-gray-700 cursor-not-allowed"
          style={INPUT_BG}
        />
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { plan: planKey } = useParams()
  const navigate = useNavigate()
  const plan = PLANS[planKey]

  const [form, setForm] = useState({ name: '', email: '', clinic: '' })
  const [billing, setBilling] = useState('monthly')

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={DARK_BG}>
        <p className="text-white text-lg">Plan no encontrado.</p>
        <Link to="/#pricing" className="text-orange-400 hover:text-orange-300 text-sm underline">
          Ver todos los planes
        </Link>
      </div>
    )
  }

  const colors = COLOR_MAP[plan.color]
  const finalPrice = billing === 'annual' ? Math.round(plan.price * 0.8) : plan.price
  const annualSaving = Math.round(plan.price * 12 * 0.2)

  return (
    <div className="min-h-screen" style={DARK_BG}>
      {/* Header */}
      <header
        className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06]"
        style={{ background: 'rgba(8,8,8,0.88)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
              <Stethoscope size={13} className="text-white" />
            </div>
            <span className="text-[15px] font-semibold text-white tracking-tight">MedControl</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Lock size={11} />
            Pago seguro con cifrado SSL
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="pt-20 pb-16 px-4 sm:px-6">
        {/* Back */}
        <button
          onClick={() => navigate('/#pricing')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors duration-150 max-w-6xl mx-auto mb-8 cursor-pointer"
        >
          <ArrowLeft size={14} />
          Ver todos los planes
        </button>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

          {/* ── LEFT: Resumen del plan ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Plan card */}
            <div
              className={`rounded-2xl border p-6 ${colors.border}`}
              style={CARD_BG}
            >
              {plan.badge && (
                <span className={`inline-flex text-[10px] font-bold uppercase tracking-wider border px-2.5 py-0.5 rounded-full mb-4 ${colors.pill}`}>
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-[200px]">{plan.desc}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-end gap-1 justify-end">
                    <span className="text-3xl font-bold text-white">${finalPrice}</span>
                    <span className="text-gray-500 text-sm mb-1">/mes</span>
                  </div>
                  {billing === 'annual' && (
                    <p className="text-[11px] text-green-400 mt-0.5">Ahorrás ${annualSaving}/año</p>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5">
                {plan.features.map(f => (
                  <li key={f.text} className="flex items-center gap-2.5 text-xs">
                    {f.included
                      ? <Check size={13} className="text-green-500 shrink-0" />
                      : <X size={13} className="text-white/15 shrink-0" />
                    }
                    <span className={f.included ? 'text-gray-300' : 'text-gray-600'}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Billing toggle */}
            <div className="rounded-xl border border-white/[0.07] p-4" style={CARD_BG}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ciclo de facturación</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'monthly', label: 'Mensual', sub: 'Sin compromiso' },
                  { key: 'annual',  label: 'Anual',   sub: '20% de descuento' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setBilling(opt.key)}
                    className={`rounded-lg p-3 text-left border transition-all duration-150 cursor-pointer ${
                      billing === opt.key
                        ? 'border-orange-500/50 bg-orange-500/10'
                        : 'border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${billing === opt.key ? 'text-orange-400' : 'text-gray-300'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Trust badges */}
            <div className="rounded-xl border border-white/[0.07] p-4 space-y-3" style={CARD_BG}>
              {[
                { icon: ShieldCheck, text: 'Datos protegidos con cifrado de extremo a extremo' },
                { icon: Clock,       text: '14 días de prueba gratis. Cancelá en cualquier momento.' },
                { icon: Zap,         text: 'Activación inmediata al confirmar tu suscripción' },
                { icon: HeadphonesIcon, text: plan.key === 'clinica' ? 'Soporte 24/7 incluido' : 'Soporte por email incluido' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2.5">
                  <Icon size={13} className="text-green-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {/* Compare plans link */}
            <Link
              to="/#pricing"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-400 transition-colors duration-150"
            >
              <ChevronRight size={12} />
              Comparar todos los planes
            </Link>
          </div>

          {/* ── RIGHT: Formulario de checkout ─────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Datos de cuenta */}
            <div className="rounded-2xl border border-white/[0.07] p-6" style={CARD_BG}>
              <h3 className="text-sm font-semibold text-white mb-5">Datos de tu cuenta</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre completo</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Dr. Juan García"
                    className="w-full px-3 py-2.5 rounded-lg border border-white/[0.08] hover:border-white/[0.15] focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 text-sm text-white placeholder-gray-600 outline-none transition-all duration-150"
                    style={INPUT_BG}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Correo electrónico</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="doctor@clinica.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-white/[0.08] hover:border-white/[0.15] focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 text-sm text-white placeholder-gray-600 outline-none transition-all duration-150"
                    style={INPUT_BG}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre de la clínica / consultorio</label>
                  <input
                    value={form.clinic}
                    onChange={e => setForm(f => ({ ...f, clinic: e.target.value }))}
                    placeholder="Clínica Santa María"
                    className="w-full px-3 py-2.5 rounded-lg border border-white/[0.08] hover:border-white/[0.15] focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 text-sm text-white placeholder-gray-600 outline-none transition-all duration-150"
                    style={INPUT_BG}
                  />
                </div>
              </div>
            </div>

            {/* Pago con Stripe (placeholder) */}
            <div className="rounded-2xl border border-white/[0.07] p-6" style={CARD_BG}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-white">Método de pago</h3>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <Lock size={10} />
                  Seguro con Stripe
                </div>
              </div>

              {/* Stripe coming soon notice */}
              <div className="flex items-start gap-3 bg-orange-500/[0.06] border border-orange-500/20 rounded-xl p-4 mb-5">
                <AlertCircle size={15} className="text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-orange-300 mb-0.5">Pagos en proceso de integración</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    La pasarela de pago con Stripe estará disponible próximamente.
                    Por ahora, registrá tu cuenta y activamos tu plan manualmente.
                  </p>
                </div>
              </div>

              {/* Fake Stripe fields */}
              <div className="space-y-3 opacity-40 pointer-events-none select-none">
                <FakeCardField
                  label="Número de tarjeta"
                  placeholder="1234  5678  9012  3456"
                  icon={CreditCard}
                />
                <div className="flex gap-3">
                  <FakeCardField label="Vencimiento" placeholder="MM / AA" half />
                  <FakeCardField label="Código de seguridad" placeholder="CVC" half />
                </div>
                <FakeCardField label="Nombre en la tarjeta" placeholder="JUAN GARCIA" />
              </div>

              {/* Powered by Stripe badge */}
              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-600">
                <Lock size={10} />
                Pagos seguros con
                <span className="font-semibold text-gray-500">Stripe</span>
                · PCI DSS Compliant
              </div>
            </div>

            {/* Resumen */}
            <div className="rounded-2xl border border-white/[0.07] p-5" style={CARD_BG}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Resumen</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Plan {plan.name}</span>
                  <span className="text-white">${finalPrice}/mes</span>
                </div>
                {billing === 'annual' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Descuento anual (20%)</span>
                    <span className="text-green-400">−${plan.price - finalPrice}/mes</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Período de prueba</span>
                  <span className="text-green-400">14 días gratis</span>
                </div>
                <div className="border-t border-white/[0.07] pt-3 mt-3 flex justify-between">
                  <span className="text-sm font-semibold text-white">Total hoy</span>
                  <span className="text-sm font-bold text-green-400">$0</span>
                </div>
                <p className="text-[11px] text-gray-600 text-right">
                  Luego ${finalPrice}/mes
                  {billing === 'annual' ? ` (facturado $${finalPrice * 12}/año)` : ''}
                </p>
              </div>
            </div>

            {/* CTA */}
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors duration-150 cursor-pointer"
            >
              Crear cuenta y activar plan {plan.name}
              <ChevronRight size={15} />
            </Link>

            <p className="text-[11px] text-gray-600 text-center leading-relaxed">
              Al continuar, aceptás los{' '}
              <span className="text-gray-500 hover:text-gray-300 cursor-pointer transition-colors">Términos de servicio</span>
              {' '}y la{' '}
              <span className="text-gray-500 hover:text-gray-300 cursor-pointer transition-colors">Política de privacidad</span>
              . Podés cancelar en cualquier momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
