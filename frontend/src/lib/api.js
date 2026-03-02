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
      const msg = err.response?.data?.detail || 'Error inesperado'
      return Promise.reject(new Error(msg))
    }
  )

  return authApi
}
