import axios from 'axios'
import { useAuth } from '@clerk/clerk-react'
import { useRef, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function errorInterceptor(err) {
  const detail = err.response?.data?.detail
  let msg = 'Error inesperado'
  if (typeof detail === 'string') msg = detail
  else if (Array.isArray(detail)) msg = detail.map(e => e.msg || e.message).join(' · ')
  else if (detail) msg = JSON.stringify(detail)
  return Promise.reject(new Error(msg))
}

// Hook para usar la API autenticada.
// La instancia de axios se crea una sola vez por componente (useRef),
// y el interceptor de auth se actualiza si cambia getToken.
export function useApi() {
  const { getToken } = useAuth()
  const apiRef = useRef(null)
  const interceptorRef = useRef(null)

  if (!apiRef.current) {
    apiRef.current = axios.create({ baseURL: API_URL })
    apiRef.current.interceptors.response.use((res) => res, errorInterceptor)
  }

  // Reemplaza el interceptor de auth cuando cambia getToken
  useEffect(() => {
    const api = apiRef.current
    if (interceptorRef.current !== null) {
      api.interceptors.request.eject(interceptorRef.current)
    }
    interceptorRef.current = api.interceptors.request.use(async (config) => {
      const token = await getToken()
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })
  }, [getToken])

  return apiRef.current
}
