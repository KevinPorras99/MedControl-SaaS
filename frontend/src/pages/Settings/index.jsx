import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { UserPlus, Trash2, Users } from 'lucide-react'
import { PageHeader, Card, Spinner } from '../../components/ui'
import { useMe, useTeamMembers, useAddTeamMember, useRemoveTeamMember } from '../../hooks'

const ROLE_LABELS = { admin_clinic: 'Administrador', doctor: 'Doctor/a', receptionist: 'Recepcionista' }
const ROLE_COLORS = {
  admin_clinic: 'bg-gold-100 text-gold-700 border border-gold-300',
  doctor: 'bg-blue-100 text-blue-700 border border-blue-300',
  receptionist: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
}

const inputCls = 'px-3 py-2 border border-gray-300/50 dark:border-white/20 bg-white/[0.08] dark:bg-white/[0.05] text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-white/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/60 dark:focus:ring-gold-400/40 backdrop-blur-md dark:backdrop-blur-md'

function AddMemberForm({ onSubmit, loading }) {
  const [form, setForm] = useState({ full_name: '', email: '', role: 'doctor', password: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.password) return
    onSubmit(form)
    setForm({ full_name: '', email: '', role: 'doctor', password: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          required placeholder="Nombre completo" value={form.full_name}
          onChange={e => set('full_name', e.target.value)}
          className={inputCls}
        />
        <input
          required type="email" placeholder="Email" value={form.email}
          onChange={e => set('email', e.target.value)}
          className={inputCls}
        />
        <input
          required type="password" placeholder="Contraseña inicial (mín. 8 caracteres)" value={form.password}
          minLength={8}
          onChange={e => set('password', e.target.value)}
          className={inputCls}
        />
        <select
          value={form.role} onChange={e => set('role', e.target.value)}
          className={inputCls + ' [color-scheme:dark]'}
        >
          <option value="doctor">Doctor/a</option>
          <option value="receptionist">Recepcionista</option>
        </select>
      </div>
      <button
        type="submit" disabled={loading}
        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-gold-300/30"
      >
        <UserPlus size={15} />
        {loading ? 'Creando...' : 'Agregar miembro'}
      </button>
    </form>
  )
}

function TeamSection() {
  const { data: me } = useMe()
  const { data: members, isLoading } = useTeamMembers()
  const addMember = useAddTeamMember()
  const removeMember = useRemoveTeamMember()

  if (me?.user?.role !== 'admin_clinic') return null

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <Users size={18} className="text-gray-600 dark:text-white/70" />
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">Equipo</h2>
      </div>
      <p className="text-sm text-gray-600 dark:text-white/70 mb-4">
        Agregá doctores y recepcionistas. Cuando ingresen con su email, recibirán acceso automáticamente.
      </p>

      {isLoading ? <Spinner /> : (
        <div className="divide-y divide-silver-100">
          {members?.map(m => (
            <div key={m.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{m.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_COLORS[m.role]}`}>
                    {ROLE_LABELS[m.role]}
                  </span>
                  {m.clerk_id?.startsWith('pending:') && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-medium shrink-0">
                      Pendiente
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-white/60 mt-0.5">{m.email}</p>
              </div>
              {m.role !== 'admin_clinic' && (
                <button
                  onClick={() => removeMember.mutate(m.id)}
                  disabled={removeMember.isPending}
                  className="ml-4 text-gray-400 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-40 shrink-0"
                  title="Eliminar usuario"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
          {!members?.length && (
            <p className="text-sm text-gray-400 dark:text-white/50 py-3 italic">Sin miembros en el equipo todavía.</p>
          )}
        </div>
      )}

      <div className="border-t border-silver-200 mt-2 pt-4">
        <p className="text-sm font-medium text-gray-700 dark:text-white/80">Agregar miembro</p>
        <AddMemberForm onSubmit={data => addMember.mutate(data)} loading={addMember.isPending} />
      </div>
    </Card>
  )
}

export default function SettingsPage() {
  const { user } = useUser()

  return (
    <div>
      <div className="animate-fade-in-down">
        <PageHeader title="Configuración" />
      </div>
      <div className="space-y-6">
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Card className="p-6">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">Tu perfil</h2>
            <div className="flex items-center gap-4">
              <img src={user?.imageUrl} alt="" className="w-14 h-14 rounded-full ring-2 ring-gold-200" />
              <div>
              <p className="font-medium text-gray-800 dark:text-white">{user?.fullName}</p>
              <p className="text-sm text-gray-600 dark:text-white/70">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <TeamSection />
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Card className="p-6">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-2">Stack actual</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              {['FastAPI', 'Supabase', 'Clerk Auth', 'React', 'TanStack Query', 'Tailwind CSS'].map(t => (
                <span key={t} className="px-3 py-1 bg-gold-100 border border-gold-300 text-gold-700 text-xs font-medium rounded-full">{t}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
