/**
 * portalApi.js — Instancia de axios para el portal del paciente.
 * No usa Clerk. Lee el token desde localStorage.
 */
import axios from 'axios'

const PORTAL_TOKEN_KEY = 'medcontrol_portal_token'

export function savePortalToken(token) {
  localStorage.setItem(PORTAL_TOKEN_KEY, token)
}

export function getPortalToken() {
  return localStorage.getItem(PORTAL_TOKEN_KEY)
}

export function clearPortalToken() {
  localStorage.removeItem(PORTAL_TOKEN_KEY)
}

export function createPortalApi() {
  const instance = axios.create({ baseURL: '' })
  instance.interceptors.request.use((config) => {
    const token = getPortalToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      const msg = err.response?.data?.detail || err.message || 'Error'
      return Promise.reject(new Error(msg))
    }
  )
  return instance
}
