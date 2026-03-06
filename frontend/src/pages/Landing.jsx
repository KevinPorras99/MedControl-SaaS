import { Link } from 'react-router-dom'
import {
  Users, CalendarDays, ClipboardList, Receipt,
  BarChart3, ShieldCheck, Check, X, ChevronRight,
  Stethoscope, ArrowRight, Zap, Globe,
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

// ── Componentes internos ───────────────────────────────────────────────────────

function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/20 dark:bg-black/20">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <Stethoscope size={22} className="text-yellow-500" />
          <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">MedControl</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            Funcionalidades
          </a>
          <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            Planes
          </a>
        </nav>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/20"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm font-semibold bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-4 py-2 rounded-xl shadow-md shadow-yellow-500/25 transition-all"
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
    <section className="pt-36 pb-24 px-6 text-center relative">
      <div className="max-w-3xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
          <Zap size={12} />
          Sistema de gestión clínica todo-en-uno
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight mb-6">
          Tu clínica,{' '}
          <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            organizada y rentable
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto mb-10">
          Gestión de pacientes, citas, historial clínico y facturación en una sola plataforma.
          Diseñado para médicos que quieren enfocarse en sus pacientes, no en el papeleo.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/login"
            className="flex items-center gap-2 text-base font-semibold bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-7 py-3.5 rounded-xl shadow-lg shadow-yellow-500/30 transition-all"
          >
            Crear clínica gratis
            <ArrowRight size={16} />
          </Link>
          <a
            href="#pricing"
            className="flex items-center gap-2 text-base font-semibold text-gray-700 dark:text-gray-300 bg-white/30 dark:bg-white/10 hover:bg-white/50 dark:hover:bg-white/20 border border-gray-300/50 dark:border-white/20 px-7 py-3.5 rounded-xl backdrop-blur-md transition-all"
          >
            Ver planes
          </a>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5"><Check size={14} className="text-green-500" /> Sin tarjeta de crédito</span>
          <span className="flex items-center gap-1.5"><Check size={14} className="text-green-500" /> 14 días gratis</span>
          <span className="flex items-center gap-1.5"><Check size={14} className="text-green-500" /> Cancela cuando quieras</span>
          <span className="flex items-center gap-1.5"><Globe size={14} className="text-green-500" /> 100% en la nube</span>
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Todo lo que tu clínica necesita
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Una plataforma completa que cubre el ciclo completo de atención, desde la cita hasta el cobro.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl p-6 hover:bg-white/60 dark:hover:bg-white/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mb-4 shadow-md shadow-yellow-500/25">
                <Icon size={20} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Planes para cada clínica
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Empezá gratis por 14 días. Sin permanencia. Sin letras chicas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl p-7 flex flex-col gap-5 backdrop-blur-md transition-all ${
                plan.highlight
                  ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-2 border-yellow-500/60 shadow-2xl shadow-yellow-500/20 scale-105'
                  : 'bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                  <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                    MÁS POPULAR
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{plan.desc}</p>
              </div>

              <div className="flex items-end gap-1">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{plan.price}</span>
                <span className="text-gray-500 dark:text-gray-400 mb-1 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5 text-sm">
                    {f.included
                      ? <Check size={15} className="text-green-500 shrink-0" />
                      : <X size={15} className="text-gray-300 dark:text-gray-600 shrink-0" />
                    }
                    <span className={f.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/login"
                className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-md shadow-yellow-500/30'
                    : 'bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 border border-gray-300/60 dark:border-white/20 text-gray-800 dark:text-white'
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
    <footer className="border-t border-white/20 dark:border-white/10 backdrop-blur-md bg-white/10 dark:bg-black/10">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Stethoscope size={18} className="text-yellow-500" />
          <span className="font-bold text-gray-800 dark:text-white">MedControl</span>
          <span className="text-gray-400 text-sm ml-2">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <a href="#features" className="hover:text-gray-800 dark:hover:text-white transition-colors">Funcionalidades</a>
          <a href="#pricing" className="hover:text-gray-800 dark:hover:text-white transition-colors">Planes</a>
          <Link to="/login" className="hover:text-gray-800 dark:hover:text-white transition-colors">Iniciar sesión</Link>
        </div>
      </div>
    </footer>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </div>
  )
}
