/**
 * settings.js — Capa HTTP para configuración de clínica, equipo, auditoría y app config.
 */

export const settingsApi = {
  // ── Clínica ──────────────────────────────────────
  getClinic: (api) =>
    api.get('/api/settings/clinic').then(r => r.data),

  updateClinic: (api, data) =>
    api.patch('/api/settings/clinic', data).then(r => r.data),

  // ── Equipo / Usuarios ────────────────────────────
  getTeam: (api, params = {}) =>
    api.get('/api/settings/users', { params }).then(r => r.data),

  addMember: (api, data) =>
    api.post('/api/settings/users', data).then(r => r.data),

  updateMember: (api, { id, ...data }) =>
    api.patch(`/api/settings/users/${id}`, data).then(r => r.data),

  removeMember: (api, userId) =>
    api.delete(`/api/settings/users/${userId}`),

  // ── Auditoría ────────────────────────────────────
  getAuditLogs: (api, { dateFrom, dateTo } = {}) =>
    api.get('/api/audit', {
      params: { date_from: dateFrom || undefined, date_to: dateTo || undefined },
    }).then(r => r.data),

  // ── Constantes de la app ─────────────────────────
  getConfig: (api) =>
    api.get('/api/config').then(r => r.data),
}
