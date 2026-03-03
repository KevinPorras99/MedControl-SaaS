import { Outlet, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Sidebar from './Sidebar'
import { useApi } from '../lib/api'

export default function Layout() {
  const api = useApi()
  const { isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me').then(r => r.data),
    retry: false,
    staleTime: 1000 * 60 * 10,
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError) return <Navigate to="/onboarding" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
