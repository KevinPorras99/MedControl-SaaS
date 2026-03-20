/**
 * records.js — Capa HTTP para expedientes clínicos y adjuntos.
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

export const recordsApi = {
  /** Lista expedientes de un paciente. */
  list: (api, patientId) =>
    api.get(`/api/records/${patientId}`).then(r => r.data),

  /** Crea un nuevo expediente/consulta. */
  create: (api, data) =>
    api.post('/api/records', data).then(r => r.data),

  /** Sube un archivo adjunto a un expediente. */
  uploadAttachment: (api, { recordId, file }) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/api/records/${recordId}/attachments`, form).then(r => r.data)
  },

  /** Elimina un adjunto. */
  deleteAttachment: (api, attachmentId) =>
    api.delete(`/api/records/attachments/${attachmentId}`),

  exportPdf: async (api, patientId) => {
    const res = await api.get(`/api/records/${patientId}/export/pdf`, { responseType: 'blob' })
    triggerDownload(res.data, `expediente_${patientId}.pdf`)
  },

  printPrescription: async (api, recordId) => {
    const res = await api.get(`/api/records/${recordId}/prescription/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  },
}
