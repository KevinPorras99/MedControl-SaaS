/**
 * inventory.js — Capa HTTP para el dominio de inventario médico.
 */

export const inventoryApi = {
  /** Lista ítems con filtros opcionales. */
  list: (api, { search, category, lowStock, includeInactive } = {}) =>
    api.get('/api/inventory', {
      params: {
        search: search || undefined,
        category: category || undefined,
        low_stock: lowStock || undefined,
        include_inactive: includeInactive || undefined,
      },
    }).then(r => r.data),

  /** Resumen estadístico del inventario. */
  summary: (api) =>
    api.get('/api/inventory/stats/summary').then(r => r.data),

  /** Crea un nuevo ítem. */
  create: (api, data) =>
    api.post('/api/inventory', data).then(r => r.data),

  /** Actualiza un ítem. */
  update: (api, { id, ...data }) =>
    api.patch(`/api/inventory/${id}`, data).then(r => r.data),

  /** Desactiva (soft-delete) un ítem. */
  delete: (api, id) =>
    api.delete(`/api/inventory/${id}`).then(r => r.data),

  /** Registra un movimiento (entrada | salida | ajuste). */
  addMovement: (api, itemId, data) =>
    api.post(`/api/inventory/${itemId}/movements`, data).then(r => r.data),

  /** Historial de movimientos de un ítem. */
  movements: (api, itemId, limit = 50) =>
    api.get(`/api/inventory/${itemId}/movements`, { params: { limit } }).then(r => r.data),
}
