/**
 * auth.js — Capa HTTP para autenticación y perfil del usuario actual.
 */

export const authApi = {
  /** Obtiene el perfil del usuario autenticado (o lanza error si no está onboarded). */
  me: (api) =>
    api.get('/api/auth/me').then(r => r.data),
}
