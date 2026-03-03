import axios from 'axios'
import { useAuth } from '@clerk/clerk-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: API_URL })

// Hook para usar la API autenticada
export function useApi() {
  const { getToken } = useAuth()

  const authApi = axios.create({ baseURL: API_URL })

  authApi.interceptors.request.use(async (config) => {
    const token = await getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  authApi.interceptors.response.use(
    (res) => res,
    (err) => {
      const detail = err.response?.data?.detail
      let msg = 'Error inesperado'
      if (typeof detail === 'string') msg = detail
      else if (Array.isArray(detail)) msg = detail.map(e => e.msg || e.message).join(' · ')
      else if (detail) msg = JSON.stringify(detail)
      return Promise.reject(new Error(msg))
    }
  )

  return authApi
}
