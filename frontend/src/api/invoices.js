/**
 * invoices.js — Capa HTTP para facturación y pagos.
 */

export const invoicesApi = {
  /** Lista facturas con filtros opcionales. */
  list: (api, filters = {}) =>
    api.get('/api/invoices', { params: filters }).then(r => r.data),

  /** Crea una nueva factura. */
  create: (api, data) =>
    api.post('/api/invoices', data).then(r => r.data),

  /** Registra un pago sobre una factura. */
  pay: (api, { invoiceId, ...data }) =>
    api.post(`/api/invoices/${invoiceId}/pay`, data).then(r => r.data),
}
