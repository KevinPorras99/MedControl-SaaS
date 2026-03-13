import { PageHeader, Card } from '../../components/ui'
import { HelpCircle, BookOpen, MessageCircle, Mail, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const FAQS = [
  { q: '¿Cómo agrego un nuevo paciente?', a: 'Ve a la sección "Pacientes" y hacé clic en "Nuevo paciente". Completá el formulario con los datos básicos y guardá.' },
  { q: '¿Cómo programo una cita médica?', a: 'En la sección "Agenda", hacé clic en "Nueva cita", seleccioná el paciente, el médico, la fecha y hora. También podés crear citas directamente desde el perfil del paciente.' },
  { q: '¿Cómo registro un pago de factura?', a: 'En "Facturación", buscá la factura pendiente y hacé clic en "Registrar pago". Seleccioná el método de pago y el monto.' },
  { q: '¿Cómo agrego un médico al equipo?', a: 'Como administrador, ve a "Médicos" y hacé clic en "Agregar médico". El médico recibirá acceso con el email y contraseña que definas.' },
  { q: '¿Cómo funciona el código de acceso de la clínica?', a: 'El código de acceso aparece en la parte inferior del menú lateral (solo para administradores). Los nuevos miembros del equipo deben ingresarlo durante el registro para unirse a tu clínica.' },
  { q: '¿Puedo exportar los datos de facturación?', a: 'Sí. En la sección "Reportes", encontrarás botones de exportación CSV para facturas y pagos con filtros de fecha.' },
  { q: '¿Cómo cambio el tema claro/oscuro?', a: 'Usá el botón con ícono de sol/luna en la parte inferior del menú lateral.' },
  { q: '¿Qué es MedTron?', a: 'MedTron es el asistente de IA de MedControl. Podés activarlo con el botón flotante en la esquina inferior derecha para obtener ayuda sobre el sistema.' },
]

const GUIDES = [
  { title: 'Primeros pasos', desc: 'Configurá tu clínica, invitá tu equipo y registrá tus primeros pacientes.', icon: BookOpen },
  { title: 'Gestión de citas', desc: 'Cómo usar la agenda, programar, confirmar y cancelar citas.', icon: HelpCircle },
  { title: 'Historial clínico', desc: 'Registrá consultas, diagnósticos, prescripciones y documentos.', icon: BookOpen },
  { title: 'Facturación', desc: 'Creá facturas, registrá pagos y exportá reportes financieros.', icon: HelpCircle },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-200/30 dark:border-white/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 text-sm font-medium text-gray-800 dark:text-white hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
      >
        <span>{q}</span>
        {open ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />}
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-600 dark:text-white/70 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

export default function HelpPage() {
  return (
    <div>
      <div className="animate-fade-in-down">
        <PageHeader title="Centro de Ayuda" subtitle="Guías, preguntas frecuentes y soporte" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guides */}
        <div className="lg:col-span-2 space-y-6">
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Guías rápidas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GUIDES.map((g, i) => (
                <Card key={i} className="p-4 cursor-pointer hover:border-yellow-400/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center shrink-0">
                      <g.icon size={17} className="text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{g.title}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">{g.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Preguntas frecuentes</h2>
            <Card className="px-4">
              {FAQS.map((f, i) => <FaqItem key={i} {...f} />)}
            </Card>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Contacto</h2>
            <Card className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Mail size={17} className="text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">Soporte por email</p>
                  <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">soporte@medcontrol.app</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                  <MessageCircle size={17} className="text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">MedTron IA</p>
                  <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">Asistente disponible 24/7 en la esquina inferior derecha</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <Card className="p-5">
              <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">MedControl v1.0</p>
              <p className="text-xs text-gray-500 dark:text-white/50">Sistema de gestión para clínicas y consultorios médicos</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['FastAPI', 'React', 'Supabase', 'Clerk', 'Tailwind'].map(t => (
                  <span key={t} className="px-2 py-0.5 bg-yellow-100 border border-yellow-300 text-yellow-700 text-xs font-medium rounded-full">{t}</span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
