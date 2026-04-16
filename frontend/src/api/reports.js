/**
 * reports.js — Capa HTTP para reportes y exportaciones CSV.
 */

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Convierte filtros de fecha a params de query, omitiendo los vacíos. */
function dateParams({ dateFrom, dateTo } = {}) {
  return { date_from: dateFrom || undefined, date_to: dateTo || undefined }
}

export const reportsApi = {
  /** Stats del dashboard principal. */
  dashboard: (api) =>
    api.get('/api/reports/dashboard').then(r => r.data),

  /** Resumen financiero con filtros de fecha y periodo. */
  financial: (api, { dateFrom, dateTo, period } = {}) =>
    api.get('/api/reports/financial', {
      params: { ...dateParams({ dateFrom, dateTo }), period: period || undefined },
    }).then(r => r.data),

  /** Reporte de citas: total, por estado, por médico, tendencia mensual. */
  appointments: (api, { dateFrom, dateTo, doctorId } = {}) =>
    api.get('/api/reports/appointments', {
      params: { ...dateParams({ dateFrom, dateTo }), doctor_id: doctorId || undefined },
    }).then(r => r.data),

  /** Reporte de pacientes: total, crecimiento mensual, distribución por género. */
  patients: (api, filters = {}) =>
    api.get('/api/reports/patients', { params: dateParams(filters) }).then(r => r.data),

  /** Reporte por médico: citas atendidas y pacientes únicos. */
  doctors: (api, filters = {}) =>
    api.get('/api/reports/doctors', { params: dateParams(filters) }).then(r => r.data),

  /** Descarga CSV de facturas. */
  downloadInvoicesCsv: async (api, { dateFrom, dateTo, status } = {}) => {
    const res = await api.get('/api/reports/export/invoices', {
      params: { ...dateParams({ dateFrom, dateTo }), status: status || undefined },
      responseType: 'blob',
    })
    triggerDownload(res.data, `facturas_${new Date().toISOString().split('T')[0]}.csv`)
  },

  /** Descarga CSV de pagos. */
  downloadPaymentsCsv: async (api, filters = {}) => {
    const res = await api.get('/api/reports/export/payments', {
      params: dateParams(filters),
      responseType: 'blob',
    })
    triggerDownload(res.data, `pagos_${new Date().toISOString().split('T')[0]}.csv`)
  },
}
