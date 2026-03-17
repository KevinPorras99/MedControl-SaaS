export const consentsApi = {
  listTemplates: (api, { includeInactive = false } = {}) =>
    api.get('/api/consents/templates', {
      params: { include_inactive: includeInactive || undefined },
    }).then(r => r.data),

  createTemplate: (api, data) =>
    api.post('/api/consents/templates', data).then(r => r.data),

  updateTemplate: (api, { id, ...data }) =>
    api.patch(`/api/consents/templates/${id}`, data).then(r => r.data),

  deleteTemplate: (api, id) =>
    api.delete(`/api/consents/templates/${id}`),

  listPatientConsents: (api, patientId) =>
    api.get(`/api/consents/${patientId}`).then(r => r.data),

  signConsent: (api, data) =>
    api.post('/api/consents', data).then(r => r.data),
}
