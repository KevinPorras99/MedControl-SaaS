import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users, FileText } from 'lucide-react'
import { usePatients, useCreatePatient, useUpdatePatient } from '../../hooks'
import { Button, PageHeader, Card, Modal, Input, Select, Spinner, EmptyState } from '../../components/ui'
import { format } from 'date-fns'

function PatientForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState(initial || { full_name: '', phone: '', email: '', birth_date: '', gender: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <Input label="Nombre completo *" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Teléfono" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+506 8888-8888" />
        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Fecha de nacimiento" type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
        <Select label="Género" value={form.gender} onChange={e => set('gender', e.target.value)}>
          <option value="">Sin especificar</option>
          <option value="masculino">Masculino</option>
          <option value="femenino">Femenino</option>
          <option value="otro">Otro</option>
        </Select>
      </div>
      <Button className="w-full justify-center" onClick={() => onSubmit(form)} disabled={loading || !form.full_name}>
        {loading ? 'Guardando...' : 'Guardar paciente'}
      </Button>
    </div>
  )
}

export default function PatientsPage() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState(null)

  const navigate = useNavigate()
  const { data: patients, isLoading } = usePatients({ search })
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient()

  return (
    <div>
      <div className="animate-fade-in-down">
        <PageHeader
          title="Pacientes"
          subtitle={`${patients?.length || 0} registros`}
          action={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nuevo paciente</Button>}
        />
      </div>

      {/* Search */}
      <div className="relative mb-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/50" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300/50 dark:border-white/20 bg-white/[0.08] dark:bg-white/[0.05] backdrop-blur-md dark:backdrop-blur-md text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/60 dark:focus:ring-gold-400/40"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        {isLoading ? <Spinner /> : !patients?.length ? (
          <EmptyState icon={Users} title="Sin pacientes" description="Creá el primer paciente de la clínica" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gold-50 border-b border-gold-200">
              <tr>{['Nombre', 'Teléfono', 'Email', 'Nacimiento', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-white/70 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-silver-100">
              {patients.map((p, i) => (
                <tr key={p.id} className="hover:bg-gold-50/50 transition-colors animate-fade-in stagger-item" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{p.full_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-white/70">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-white/70">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-white/70">
                    {p.birth_date ? format(new Date(p.birth_date), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${p.id}`)}>
                        <FileText size={13} /> Ver perfil
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelected(p)}>Editar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Paciente">
        <PatientForm
          onSubmit={async data => { await createPatient.mutateAsync(data); setShowCreate(false) }}
          loading={createPatient.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Editar Paciente">
        {selected && (
          <PatientForm
            initial={selected}
            onSubmit={async data => { await updatePatient.mutateAsync({ id: selected.id, ...data }); setSelected(null) }}
            loading={updatePatient.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
