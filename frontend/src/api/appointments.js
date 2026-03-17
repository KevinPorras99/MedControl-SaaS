/**
 * appointments.js — Capa HTTP para el dominio de citas.
 */

export const appointmentsApi = {
  /** Lista citas con filtros opcionales. */
  list: (api, filters = {}) =>
    api.get('/api/appointments', { params: filters }).then(r => r.data),

  /** Crea una nueva cita. */
  create: (api, data) =>
    api.post('/api/appointments', data).then(r => r.data),

  /** Actualiza una cita existente. */
  update: (api, { id, ...data }) =>
    api.patch(`/api/appointments/${id}`, data).then(r => r.data),
}
