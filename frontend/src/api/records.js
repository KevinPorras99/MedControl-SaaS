/**
 * records.js — Capa HTTP para expedientes clínicos y adjuntos.
 */

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
}
