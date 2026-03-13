import { Link } from 'react-router-dom'
import {
  Users, CalendarDays, ClipboardList, Receipt,
  BarChart3, ShieldCheck, Check, X, ChevronRight,
  Stethoscope, ArrowRight, Globe, Activity,
} from 'lucide-react'

// ── Datos ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Users,
    title: 'Gestión de Pacientes',
    desc: 'Historial completo, datos de contacto, notas y archivos adjuntos en un solo lugar.',
  },
  {
    icon: CalendarDays,
    title: 'Agenda de Citas',
    desc: 'Programá citas con doctores específicos, filtrá por fecha y estado en segundos.',
  },
  {
    icon: ClipboardList,
    title: 'Historial Clínico',
    desc: 'Diagnósticos, tratamientos, prescripciones y adjuntos médicos organizados por paciente.',
  },
  {
    icon: Receipt,
    title: 'Facturación',
    desc: 'Generá facturas numeradas automáticamente, registrá pagos y exportá reportes CSV.',
  },
  {
    icon: BarChart3,
    title: 'Reportes Financieros',
    desc: 'Visualizá ingresos, pagos pendientes y tendencias con gráficos en tiempo real.',
  },
  {
    icon: ShieldCheck,
    title: 'Multi-rol & Seguro',
    desc: 'Admin, doctores y recepcionistas con permisos diferenciados. Datos de cada clínica aislados.',
  },
]

const PLANS = [
  {
    key: 'basico',
    name: 'Básico',
    price: '$29',
    period: '/mes',
    desc: 'Ideal para consultorios individuales.',
    highlight: false,
    features: [
      { text: '1 médico', included: true },
      { text: 'Hasta 200 pacientes', included: true },
      { text: 'Citas y agenda', included: true },
      { text: 'Historial clínico', included: true },
      { text: 'Facturación básica', included: true },
      { text: 'Reportes financieros', included: false },
      { text: 'Soporte prioritario', included: false },
    ],
    cta: 'Empezar gratis',
  },
  {
    key: 'profesional',
    name: 'Profesional',
    price: '$79',
    period: '/mes',
    desc: 'Para clínicas con equipo médico.',
    highlight: true,
    features: [
      { text: 'Hasta 5 médicos', included: true },
      { text: 'Pacientes ilimitados', included: true },
      { text: 'Citas y agenda', included: true },
      { text: 'Historial clínico completo', included: true },
      { text: 'Facturación avanzada + CSV', included: true },
      { text: 'Reportes financieros', included: true },
      { text: 'Soporte prioritario', included: false },
    ],
    cta: 'Empezar gratis',
  },
  {
    key: 'clinica',
    name: 'Clínica',
    price: '$149',
    period: '/mes',
    desc: 'Para clínicas y centros médicos.',
    highlight: false,
    features: [
      { text: 'Médicos ilimitados', included: true },
      { text: 'Pacientes ilimitados', included: true },
      { text: 'Citas y agenda', included: true },
      { text: 'Historial clínico completo', included: true },
      { text: 'Facturación avanzada + CSV', included: true },
      { text: 'Reportes financieros', included: true },
      { text: 'Soporte prioritario 24/7', included: true },
    ],
    cta: 'Contactar ventas',
  },
]

const STATS = [
  { value: '2,400+', label: 'Clínicas activas' },
  { value: '180K', label: 'Pacientes gestionados' },
  { value: '99.9%', label: 'Uptime garantizado' },
  { value: '< 2s', label: 'Tiempo de respuesta' },
]

// ── Estilos base ───────────────────────────────────────────────────────────────

const SECTION_BG = { background: 'rgba(8,8,8,0.82)', backdropFilter: 'blur(2px)' }
const HEADER_BG  = { background: 'rgba(8,8,8,0.88)', backdropFilter: 'blur(20px)' }
const FOOTER_BG  = { background: 'rgba(8,8,8,0.92)' }
const CARD_BG    = { background: 'rgba(14,14,14,0.90)' }

// ── Componentes ────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header
      className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.07]"
      style={HEADER_BG}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
            <Stethoscope size={13} className="text-white" />
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">MedControl</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors duration-150">
            Funcionalidades
          </a>
          <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors duration-150">
            Planes
          </a>
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="text-sm text-gray-400 hover:text-white transition-colors duration-150 px-3 py-1.5"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-150"
          >
            Empezar gratis
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative pt-44 pb-28 px-6 text-center overflow-hidden" style={SECTION_BG}>
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[320px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.12) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-3xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-orange-500/25 bg-orange-500/[0.08] text-orange-400 text-xs font-medium px-3.5 py-1.5 rounded-full mb-8">
          <Activity size={11} />
          Sistema de gestión clínica todo-en-uno
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-[64px] font-bold text-white leading-[1.08] tracking-tight mb-6">
          Tu clínica,{' '}
          <span className="text-orange-400">organizada</span>
          {' '}y rentable
        </h1>

        <p className="text-base md:text-[17px] text-gray-400 leading-relaxed max-w-xl mx-auto mb-10">
          Gestión de pacientes, citas, historial clínico y facturación en una sola plataforma.
          Diseñado para médicos que quieren enfocarse en sus pacientes, no en el papeleo.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            to="/login"
            className="flex items-center gap-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors duration-150"
          >
            Crear clínica gratis
            <ArrowRight size={15} />
          </Link>
          <a
            href="#pricing"
            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white border border-white/[0.10] hover:border-white/[0.18] bg-white/[0.04] hover:bg-white/[0.07] px-6 py-3 rounded-lg transition-all duration-150"
          >
            Ver planes
          </a>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <Check size={12} className="text-green-500" /> Sin tarjeta de crédito
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={12} className="text-green-500" /> 14 días gratis
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={12} className="text-green-500" /> Cancela cuando quieras
          </span>
          <span className="flex items-center gap-1.5">
            <Globe size={12} className="text-green-500" /> 100% en la nube
          </span>
        </div>
      </div>
    </section>
  )
}

function Stats() {
  return (
    <section className="border-y border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.015)' }}>
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.06]">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center px-6">
              <div className="text-[32px] font-bold text-white tracking-tight mb-1">{value}</div>
              <div className="text-[11px] text-gray-500 uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="py-28 px-6" style={SECTION_BG}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-[11px] text-orange-400 font-semibold uppercase tracking-[0.15em] mb-4">
            Funcionalidades
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Todo lo que tu clínica necesita
          </h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
            Una plataforma que cubre el ciclo completo de atención, desde la cita hasta el cobro.
          </p>
        </div>

        {/* Grid-cell layout */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 rounded-2xl overflow-hidden border border-white/[0.07]"
          style={{ gap: '1px', background: 'rgba(255,255,255,0.07)' }}
        >
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group p-8 hover:bg-white/[0.025] transition-colors duration-200 cursor-default"
              style={CARD_BG}
            >
              <div className="w-9 h-9 rounded-lg bg-orange-500/[0.10] border border-orange-500/[0.20] flex items-center justify-center mb-5 group-hover:bg-orange-500/[0.15] transition-colors duration-200">
                <Icon size={16} className="text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="pricing" className="py-28 px-6 border-t border-white/[0.06]" style={SECTION_BG}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-[11px] text-orange-400 font-semibold uppercase tracking-[0.15em] mb-4">
            Planes
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Planes para cada clínica
          </h2>
          <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed">
            Empezá gratis por 14 días. Sin permanencia. Sin letras chicas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl p-7 flex flex-col gap-6 border transition-all duration-200 ${
                plan.highlight
                  ? 'border-orange-500/40 shadow-[0_0_40px_rgba(249,115,22,0.08)]'
                  : 'border-white/[0.07]'
              }`}
              style={{
                background: plan.highlight
                  ? 'rgba(249,115,22,0.05)'
                  : 'rgba(14,14,14,0.90)',
              }}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
                    Más popular
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{plan.desc}</p>
              </div>

              <div className="flex items-end gap-1">
                <span className="text-[42px] font-bold text-white leading-none">{plan.price}</span>
                <span className="text-gray-500 mb-1.5 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5 text-xs">
                    {f.included
                      ? <Check size={13} className="text-green-500 shrink-0" />
                      : <X size={13} className="text-white/20 shrink-0" />
                    }
                    <span className={f.included ? 'text-gray-300' : 'text-gray-600'}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to={`/checkout/${plan.key}`}
                className={`w-full text-center py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  plan.highlight
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.09] text-gray-300 hover:text-white'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.07]" style={FOOTER_BG}>
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center shrink-0">
            <Stethoscope size={11} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-white">MedControl</span>
          <span className="text-gray-600 text-xs ml-2">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <a href="#features" className="hover:text-gray-300 transition-colors duration-150">Funcionalidades</a>
          <a href="#pricing" className="hover:text-gray-300 transition-colors duration-150">Planes</a>
          <Link to="/login" className="hover:text-gray-300 transition-colors duration-150">Iniciar sesión</Link>
        </div>
      </div>
    </footer>
  )
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Stats />
      <Features />
      <Pricing />
      <Footer />
    </div>
  )
}
