import { useUser } from '@clerk/clerk-react'
import { PageHeader, Card } from '../../components/ui'

export default function SettingsPage() {
  const { user } = useUser()

  return (
    <div>
      <PageHeader title="Configuración" />
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-4">Tu perfil</h2>
          <div className="flex items-center gap-4">
            <img src={user?.imageUrl} alt="" className="w-14 h-14 rounded-full" />
            <div>
              <p className="font-medium text-gray-900">{user?.fullName}</p>
              <p className="text-sm text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold mb-4">Información de la clínica</h2>
          <p className="text-sm text-gray-500">La configuración de la clínica será administrada por el admin_clinic.</p>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold mb-2">Stack actual</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            {['FastAPI', 'Supabase', 'Clerk Auth', 'React', 'TanStack Query', 'Tailwind CSS'].map(t => (
              <span key={t} className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">{t}</span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
