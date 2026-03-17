import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import {
  Users, Building2, CreditCard, Shield,
  UserPlus, Trash2, Edit2, Copy, Check,
  UserCheck, UserX, Clock, Package,
  FileCheck, Plus
} from 'lucide-react'
import { PageHeader, Card, Spinner, Button, Modal, Input, Select, EmptyState, Badge } from '../../components/ui'
import {
  useMe, useTeamMembers, useAddTeamMember, useRemoveTeamMember,
  useUpdateTeamMember, useClinicSettings, useUpdateClinic, useAuditLogs,
  useConsentTemplates, useCreateConsentTemplate, useUpdateConsentTemplate, useDeleteConsentTemplate
} from '../../hooks'
import { format } from 'date-fns'

const ROLE_LABELS = { admin_clinic: 'Administrador', doctor: 'Doctor/a', receptionist: 'Recepcionista' }
const ROLE_COLORS = {
  admin_clinic: 'bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-400/30',
  doctor: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/30',
  receptionist: 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/30',
}

const PLAN_INFO = {
  basico: { name: 'Básico', color: 'text-gray-600', badge: 'bg-gray-100 text-gray-700 border border-gray-300', features: ['1 médico', 'Hasta 200 pacientes', 'Agenda de citas', 'Historial clínico', 'Facturación básica'] },
  profesional: { name: 'Profesional', color: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 border border-blue-300', features: ['Hasta 5 médicos', 'Pacientes ilimitados', 'Historial clínico completo', 'Facturación avanzada', 'Exportación CSV', 'Reportes financieros'] },
  clinica: { name: 'Clínica', color: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700 border border-yellow-300', features: ['Médicos ilimitados', 'Pacientes ilimitados', 'Reportes avanzados', 'Facturación avanzada', 'Roles y permisos', 'Soporte prioritario', 'Auditoría completa'] },
}

const TABS = [
  { id: 'team',      label: 'Equipo',           icon: Users },
  { id: 'clinic',    label: 'Clínica',           icon: Building2 },
  { id: 'billing',   label: 'Facturación',       icon: CreditCard },
  { id: 'audit',     label: 'Auditoría',         icon: Shield },
  { id: 'consents',  label: 'Consentimientos',   icon: FileCheck },
]

// ── Team Tab ──────────────────────────────────────
function AddMemberForm({ onSubmit, loading }) {
  const [form, setForm] = useState({ full_name: '', email: '', role: 'doctor', password: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <Input label="Nombre completo *" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
        <Input label="Contraseña inicial *" type="password" value={form.password} onChange={e => set('password', e.target.value)} minLength={8} required />
      </div>
      <Select label="Rol" value={form.role} onChange={e => set('role', e.target.value)}>
        <option value="doctor">Doctor/a</option>
        <option value="receptionist">Recepcionista</option>
      </Select>
      <Button
        className="w-full justify-center"
        onClick={() => { if (form.full_name && form.email && form.password) onSubmit(form) }}
        disabled={loading || !form.full_name || !form.email || !form.password}
      >
        {loading ? 'Creando...' : 'Agregar miembro'}
      </Button>
    </div>
  )
}

function TeamTab({ isAdmin }) {
  const { data: members, isLoading } = useTeamMembers()
  const addMember = useAddTeamMember()
  const removeMember = useRemoveTeamMember()
  const updateMember = useUpdateTeamMember()
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">Miembros del equipo</h2>
            <p className="text-sm text-gray-500 dark:text-white/50 mt-0.5">{members?.length || 0} usuario(s) en la clínica</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <UserPlus size={14} /> Agregar
            </Button>
          )}
        </div>

        {isLoading ? <Spinner /> : (
          <div className="divide-y divide-gray-200/30 dark:divide-white/[0.06]">
            {members?.map(m => (
              <div key={m.id} className="flex items-center justify-between py-3.5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center shrink-0 text-sm font-bold text-gray-600 dark:text-white/60">
                    {m.full_name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{m.full_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_COLORS[m.role]}`}>
                        {ROLE_LABELS[m.role]}
                      </span>
                      {!m.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 font-medium shrink-0">Inactivo</span>
                      )}
                      {m.clerk_id?.startsWith('pending:') && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-medium shrink-0">Pendiente</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5 truncate">{m.email}</p>
                  </div>
                </div>
                {isAdmin && m.role !== 'admin_clinic' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateMember.mutate({ id: m.id, is_active: !m.is_active })}
                      disabled={updateMember.isPending}
                      className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-40"
                      title={m.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {m.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                    </button>
                    <button
                      onClick={() => removeMember.mutate(m.id)}
                      disabled={removeMember.isPending}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!members?.length && (
              <p className="text-sm text-gray-400 dark:text-white/40 py-4 italic">Sin miembros en el equipo todavía.</p>
            )}
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Agregar miembro al equipo">
        <AddMemberForm onSubmit={async data => { await addMember.mutateAsync(data); setShowAdd(false) }} loading={addMember.isPending} />
      </Modal>
    </div>
  )
}

// ── Clinic Tab ────────────────────────────────────
function ClinicTab() {
  const { data: clinic, isLoading } = useClinicSettings()
  const updateClinic = useUpdateClinic()
  const [form, setForm] = useState(null)
  const [copied, setCopied] = useState(false)

  const startEdit = () => setForm({
    name: clinic?.name || '',
    email: clinic?.email || '',
    phone: clinic?.phone || '',
    address: clinic?.address || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    await updateClinic.mutateAsync(form)
    setForm(null)
  }

  const copyCode = () => {
    if (clinic?.access_code) {
      navigator.clipboard.writeText(clinic.access_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">Datos de la clínica</h2>
          {!form && <Button size="sm" variant="outline" onClick={startEdit}><Edit2 size={13} /> Editar</Button>}
        </div>

        {form ? (
          <div className="space-y-4">
            <Input label="Nombre de la clínica *" value={form.name} onChange={e => set('name', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Email de contacto" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              <Input label="Teléfono" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <Input label="Dirección" value={form.address} onChange={e => set('address', e.target.value)} />
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={updateClinic.isPending || !form.name}>
                {updateClinic.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
              <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { label: 'Nombre', value: clinic?.name },
              { label: 'Plan', value: <span className="capitalize font-semibold text-yellow-600">{clinic?.subscription_plan}</span> },
              { label: 'Email', value: clinic?.email || '—' },
              { label: 'Teléfono', value: clinic?.phone || '—' },
              { label: 'Dirección', value: clinic?.address || '—' },
              { label: 'Estado', value: <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${clinic?.is_active ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>{clinic?.is_active ? 'Activa' : 'Inactiva'}</span> },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm text-gray-800 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {clinic?.access_code && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-2">Código de acceso</h2>
          <p className="text-sm text-gray-500 dark:text-white/50 mb-4">
            Compartí este código con nuevos miembros del equipo para que puedan unirse a la clínica.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg px-5 py-3">
              <span className="font-mono font-bold text-yellow-700 dark:text-yellow-400 tracking-[0.3em] text-lg">
                {clinic.access_code}
              </span>
            </div>
            <Button variant="outline" onClick={copyCode}>
              {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Billing Tab ───────────────────────────────────
function BillingTab() {
  const { data: me } = useMe()
  const clinic = me?.clinic
  const planKey = clinic?.subscription_plan || 'basico'
  const plan = PLAN_INFO[planKey] || PLAN_INFO.basico

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-1">Plan actual</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${plan.badge}`}>{plan.name}</span>
              <span className={`text-sm font-medium ${plan.color}`}>Plan {plan.name}</span>
            </div>
          </div>
          <Package size={28} className="text-gray-300 dark:text-white/20 shrink-0" />
        </div>

        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wide mb-2">Incluye</p>
          <ul className="space-y-1.5">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {planKey !== 'clinica' && (
          <div className="pt-4 border-t border-gray-200/30 dark:border-white/10">
            <p className="text-sm text-gray-600 dark:text-white/60 mb-3">
              Actualizá tu plan para desbloquear más funcionalidades.
            </p>
            <Button>Mejorar plan</Button>
          </div>
        )}
      </Card>

      {/* Plan comparison */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">Comparación de planes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(PLAN_INFO).map(([key, p]) => (
            <div
              key={key}
              className={`rounded-xl border p-4 ${key === planKey ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-500/10 dark:border-yellow-500/40' : 'border-gray-200/50 dark:border-white/10'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`font-semibold text-sm ${p.color}`}>{p.name}</span>
                {key === planKey && <span className="text-xs text-yellow-600 font-medium">Actual</span>}
              </div>
              <ul className="space-y-1">
                {p.features.slice(0, 4).map((f, i) => (
                  <li key={i} className="text-xs text-gray-600 dark:text-white/60 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
                {p.features.length > 4 && (
                  <li className="text-xs text-gray-400 dark:text-white/30">+{p.features.length - 4} más...</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Audit Tab ─────────────────────────────────────
function AuditTab() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { data: logs, isLoading } = useAuditLogs({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })

  const MODULE_COLORS = {
    Pacientes: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/30',
    Agenda: 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-500/20 dark:text-green-300 dark:border-green-400/30',
    Facturación: 'bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-400/30',
    Usuarios: 'bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/30',
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">Log de auditoría</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[140px]">
            <Input label="Desde" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <Input label="Hasta" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        {isLoading ? <Spinner /> : !logs?.length ? (
          <EmptyState icon={Shield} title="Sin registros" description="No hay actividad registrada para el período seleccionado" />
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {logs.map((log, i) => (
              <div key={log.id + i} className="flex items-start gap-3 py-3 border-b border-gray-200/20 dark:border-white/[0.06] last:border-0">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${MODULE_COLORS[log.module] || 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                    {log.module}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{log.action}</p>
                    <p className="text-xs text-gray-500 dark:text-white/50 truncate mt-0.5">{log.description}</p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-xs text-gray-400 dark:text-white/30">
                  <Clock size={11} />
                  <span>{format(new Date(log.created_at), 'dd/MM HH:mm')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Consents Tab ──────────────────────────────────
function ConsentTemplateForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState({ title: initial?.title || '', content: initial?.content || '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300/50 dark:border-white/20 bg-white/[0.08] dark:bg-white/[0.05] text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/60'
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-1">Título *</label>
        <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Consentimiento para intervención quirúrgica" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-1">Contenido *</label>
        <textarea className={`${inputCls} resize-y`} rows={10} value={form.content} onChange={e => set('content', e.target.value)} placeholder="Redactá el texto completo del consentimiento informado..." />
      </div>
      <Button className="w-full justify-center" onClick={() => { if (form.title && form.content) onSubmit(form) }} disabled={loading || !form.title || !form.content}>
        {loading ? 'Guardando...' : 'Guardar plantilla'}
      </Button>
    </div>
  )
}

function ConsentsSettingsTab({ isAdmin }) {
  const { data: templates, isLoading } = useConsentTemplates({ includeInactive: true })
  const createTemplate = useCreateConsentTemplate()
  const updateTemplate = useUpdateConsentTemplate()
  const deleteTemplate = useDeleteConsentTemplate()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">Plantillas de consentimiento</h2>
            <p className="text-sm text-gray-500 dark:text-white/50 mt-0.5">{templates?.filter(t => t.is_active).length || 0} activa(s)</p>
          </div>
          {isAdmin && <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Nueva plantilla</Button>}
        </div>

        {isLoading ? <Spinner /> : !templates?.length ? (
          <EmptyState icon={FileCheck} title="Sin plantillas" description="Creá la primera plantilla de consentimiento informado" />
        ) : (
          <div className="divide-y divide-gray-200/30 dark:divide-white/[0.06]">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3.5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileCheck size={16} className={t.is_active ? 'text-green-500' : 'text-gray-400'} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{t.title}</p>
                    <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5 line-clamp-1">{t.content.slice(0, 80)}{t.content.length > 80 ? '…' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!t.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">Inactiva</span>}
                  {isAdmin && (
                    <>
                      <button onClick={() => setEditing(t)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"><Edit2 size={15} /></button>
                      {t.is_active && <button onClick={() => deleteTemplate.mutate(t.id)} disabled={deleteTemplate.isPending} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"><Trash2 size={15} /></button>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva plantilla de consentimiento">
        <ConsentTemplateForm onSubmit={async data => { await createTemplate.mutateAsync(data); setShowAdd(false) }} loading={createTemplate.isPending} />
      </Modal>

      {editing && (
        <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar plantilla">
          <ConsentTemplateForm initial={editing} onSubmit={async data => { await updateTemplate.mutateAsync({ id: editing.id, ...data }); setEditing(null) }} loading={updateTemplate.isPending} />
        </Modal>
      )}
    </div>
  )
}

// ── Main Settings Page ────────────────────────────
export default function SettingsPage() {
  const { data: me } = useMe()
  const isAdmin = me?.user?.role === 'admin_clinic'
  const [tab, setTab] = useState('team')

  const visibleTabs = isAdmin ? TABS : TABS.filter(t => t.id === 'team')

  return (
    <div>
      <div className="animate-fade-in-down">
        <PageHeader title="Configuración" subtitle="Gestión del equipo y configuración de la clínica" />
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 bg-white/[0.05] dark:bg-black/20 rounded-xl p-1 border border-gray-300/30 dark:border-white/[0.06] backdrop-blur-md animate-fade-in max-w-fit" style={{ animationDelay: '0.05s' }}>
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === id
                ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/30'
                : 'text-gray-600 dark:text-white/60 hover:text-gray-800 dark:hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {tab === 'team'     && <TeamTab isAdmin={isAdmin} />}
        {tab === 'clinic'   && <ClinicTab />}
        {tab === 'billing'  && <BillingTab />}
        {tab === 'audit'    && <AuditTab />}
        {tab === 'consents' && <ConsentsSettingsTab isAdmin={isAdmin} />}
      </div>
    </div>
  )
}
