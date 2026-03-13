import { PageHeader, Card, EmptyState, Spinner, Button, Badge, Modal, Input, Select } from '../../components/ui'
import { useState } from 'react'
import { Stethoscope, Plus, Edit2, UserCheck, UserX } from 'lucide-react'
import { useTeamMembers, useAddTeamMember, useUpdateTeamMember, useMe } from '../../hooks'

const ROLE_LABELS = { admin_clinic: 'Administrador', doctor: 'Doctor/a', receptionist: 'Recepcionista' }

export default function DoctorsPage() {
  const { data: members, isLoading } = useTeamMembers()
  const { data: me } = useMe()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const addMember = useAddTeamMember()
  const updateMember = useUpdateTeamMember()

  const doctors = members?.filter(m => m.role === 'doctor') ?? []
  const isAdmin = me?.user?.role === 'admin_clinic'

  return (
    <div>
      <div className="animate-fade-in-down">
        <PageHeader
          title="Médicos"
          subtitle={`${doctors.length} médico${doctors.length !== 1 ? 's' : ''} activo${doctors.length !== 1 ? 's' : ''}`}
          action={isAdmin && <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Agregar médico</Button>}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {isLoading ? <div className="col-span-3"><Spinner /></div> :
         !doctors.length ? (
          <div className="col-span-3">
            <Card className="p-8">
              <EmptyState icon={Stethoscope} title="Sin médicos registrados" description="Agregá el primer médico de la clínica" />
            </Card>
          </div>
         ) : doctors.map((doc, i) => (
          <Card key={doc.id} className="p-5 animate-fade-in" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Stethoscope size={18} className="text-blue-600 dark:text-blue-300" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-white truncate">{doc.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-white/50 truncate">{doc.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${doc.is_active ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                  {doc.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            {isAdmin && (
              <div className="mt-4 pt-3 border-t border-gray-200/30 dark:border-white/10 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(doc)}>
                  <Edit2 size={13} /> Editar
                </Button>
                <Button
                  size="sm"
                  variant={doc.is_active ? 'danger' : 'secondary'}
                  onClick={() => updateMember.mutate({ id: doc.id, is_active: !doc.is_active })}
                  disabled={updateMember.isPending}
                >
                  {doc.is_active ? <><UserX size={13} /> Desactivar</> : <><UserCheck size={13} /> Activar</>}
                </Button>
              </div>
            )}
          </Card>
         ))}
      </div>

      {/* Add Doctor Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Agregar Médico">
        <AddDoctorForm
          onSubmit={async data => { await addMember.mutateAsync(data); setShowAdd(false) }}
          loading={addMember.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar Médico">
        {editing && (
          <EditDoctorForm
            initial={editing}
            onSubmit={async data => { await updateMember.mutateAsync({ id: editing.id, ...data }); setEditing(null) }}
            loading={updateMember.isPending}
          />
        )}
      </Modal>
    </div>
  )
}

function AddDoctorForm({ onSubmit, loading }) {
  const [form, setForm] = useState({ full_name: '', email: '', role: 'doctor', password: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <Input label="Nombre completo *" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
      <Input label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
      <Input label="Contraseña inicial (mín. 8 caracteres) *" type="password" value={form.password} onChange={e => set('password', e.target.value)} minLength={8} required />
      <Select label="Rol" value={form.role} onChange={e => set('role', e.target.value)}>
        <option value="doctor">Doctor/a</option>
        <option value="receptionist">Recepcionista</option>
      </Select>
      <Button className="w-full justify-center" onClick={() => onSubmit(form)} disabled={loading || !form.full_name || !form.email || !form.password}>
        {loading ? 'Creando...' : 'Crear médico'}
      </Button>
    </div>
  )
}

function EditDoctorForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState({ full_name: initial.full_name })
  return (
    <div className="space-y-4">
      <Input label="Nombre completo" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
      <Button className="w-full justify-center" onClick={() => onSubmit(form)} disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </div>
  )
}
