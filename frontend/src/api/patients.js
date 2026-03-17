/**
 * patients.js — Capa HTTP para el dominio de pacientes e importación.
 * Todas las funciones reciben `api` (instancia de axios autenticada) como primer argumento.
 * No contienen lógica de estado ni React — son funciones puras asíncronas.
 */

/** Descarga un blob del servidor y dispara la descarga en el navegador. */
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

export const patientsApi = {
  /** Lista pacientes con búsqueda y paginación. */
  list: (api, { search, limit = 200 } = {}) =>
    api.get('/api/patients', {
      params: { search: search || undefined, limit },
    }).then(r => r.data),

  /** Obtiene un paciente por ID. */
  get: (api, id) =>
    api.get(`/api/patients/${id}`).then(r => r.data),

  /** Crea un nuevo paciente. */
  create: (api, data) =>
    api.post('/api/patients', data).then(r => r.data),

  /** Actualiza campos de un paciente existente. */
  update: (api, { id, ...data }) =>
    api.patch(`/api/patients/${id}`, data).then(r => r.data),

  // ── Importación masiva ─────────────────────────────────────────────────────

  /** Descarga la plantilla CSV de importación. */
  downloadTemplate: async (api) => {
    const res = await api.get('/api/patients/import/template', { responseType: 'blob' })
    triggerDownload(res.data, 'plantilla_pacientes.csv')
  },

  /** Analiza el archivo (CSV/XLSX) y devuelve la previsualización sin guardar nada. */
  importPreview: (api, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/patients/import/preview', form).then(r => r.data)
  },

  /** Confirma e importa las filas validadas. */
  importConfirm: (api, body) =>
    api.post('/api/patients/import', body).then(r => r.data),
}
